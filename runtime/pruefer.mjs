// Prüfdienst: nimmt Spiel-HTML entgegen und prüft es im gehärteten Prüflauf.
//
// Gedacht als EIGENER Container (Dienst „pruefer" in docker-compose.yml) in einem
// Docker-Netz ohne Ausgang, mit schreibgeschütztem Dateisystem, ohne Volumes und ohne
// Zugangsdaten. KI-generierter Code läuft dann an einem Ort, an dem es nichts zu holen
// und keinen Weg nach draußen gibt — auch wenn er aus dem Prüflauf ausbrechen sollte.
//
// POST /pruefen   Body = HTML (text/html, max. 3 MB)  →  { ok, detail }
// GET  /status                                         →  { ok, laufend, wartend, gesamt }
// ENV: PRUEF_PORT (3100) · PRUEF_PARALLEL (3)
import http from "node:http";
import { begrenzer, pruefeHtml } from "./pruef-lauf.mjs";

const PORT = Number(process.env.PRUEF_PORT ?? 3100);
const PARALLEL = Math.max(1, Number(process.env.PRUEF_PARALLEL ?? 3));
const MAX_BYTES = 3 * 1024 * 1024;

const einreihen = begrenzer(PARALLEL);
let laufend = 0;
let wartend = 0;
let gesamt = 0;

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/status") return json(res, 200, { ok: true, laufend, wartend, gesamt });
  if (req.method !== "POST" || req.url !== "/pruefen") return json(res, 404, { ok: false, detail: "unbekannt" });

  const teile = [];
  let bytes = 0;
  let zuGross = false;
  req.on("data", (d) => {
    bytes += d.length;
    if (bytes > MAX_BYTES) {
      zuGross = true;
      req.destroy();
      return;
    }
    teile.push(d);
  });
  req.on("end", () => {
    if (zuGross) return;
    const html = Buffer.concat(teile).toString("utf8");
    if (!html.trim()) return json(res, 400, { ok: false, detail: "leer" });
    gesamt++;
    wartend++;
    einreihen(async () => {
      wartend--;
      laufend++;
      try {
        return await pruefeHtml(html);
      } finally {
        laufend--;
      }
    }).then(
      (ergebnis) => json(res, 200, ergebnis),
      () => json(res, 500, { ok: false, detail: "Prüflauf konnte nicht gestartet werden" })
    );
  });
  req.on("error", () => {});
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[pruefer] bereit auf :${PORT} — höchstens ${PARALLEL} Prüfläufe gleichzeitig`);
});
