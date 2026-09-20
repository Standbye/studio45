// Fake-KI-Anbieter für den Lasttest.
//
// Spricht das OpenAI-Protokoll (POST /v1/chat/completions, SSE-Streaming mit
// usage am Ende, Nicht-Stream für den Verbindungstest) und liefert nach einer
// einstellbaren „Bauzeit" ein festes, nachweislich lauffähiges Spiel
// (mock-spiel.html). Kostet nichts, verhält sich zeitlich wie ein echter
// Anbieter — so lässt sich der Server unter der Last eines vollen Workshops
// prüfen, ohne Tokens zu verbrennen.
//
// ENV: MOCK_PORT (9999) · MOCK_DAUER_MS (45000) · MOCK_STREUUNG (0.2 = ±20 %)
//      MOCK_FEHLERQUOTE (0..1: Anteil kaputter Antworten → Reparaturrunden)
//      MOCK_429_QUOTE (0..1: Anteil Ratelimit-Antworten)
//      MOCK_TOKENS_IN (9500) · MOCK_TOKENS_OUT (6500)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hier = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.MOCK_PORT ?? 9999);
const DAUER_MS = Number(process.env.MOCK_DAUER_MS ?? 45_000);
const STREUUNG = Number(process.env.MOCK_STREUUNG ?? 0.2);
const FEHLERQUOTE = Number(process.env.MOCK_FEHLERQUOTE ?? 0);
const QUOTE_429 = Number(process.env.MOCK_429_QUOTE ?? 0);
const TOKENS_IN = Number(process.env.MOCK_TOKENS_IN ?? 9500);
const TOKENS_OUT = Number(process.env.MOCK_TOKENS_OUT ?? 6500);

const spiel = fs.readFileSync(path.join(hier, "mock-spiel.html"), "utf8");
let laufende = 0;
let gesamt = 0;

function log(text) {
  console.log(`[mock-ki ${new Date().toISOString().slice(11, 19)}] ${text}`);
}

function antwortText(kaputt) {
  // Ein absichtlicher Ladefehler löst im Server die Reparaturrunde aus
  const html = kaputt ? spiel.replace("</body>", "<script>var kaputt = null; kaputt.farbe;</script></body>") : spiel;
  return "Hier ist das Spiel:\n\n```html\n" + html + "\n```\n";
}

function bauzeit() {
  const faktor = 1 + (Math.random() * 2 - 1) * STREUUNG;
  return Math.max(200, Math.round(DAUER_MS * faktor));
}

function chunk(basis, delta, finish) {
  return { ...basis, choices: [{ index: 0, delta, finish_reason: finish ?? null }] };
}

/** Streamt den Text gleichmäßig über die Bauzeit — wie ein echter Anbieter tröpfelt. */
function streame(res, text, dauer, usage, model) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  const basis = { id: `chatcmpl-${Date.now().toString(36)}`, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model };
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  send(chunk(basis, { role: "assistant", content: "" }));
  const stuecke = 60;
  const groesse = Math.ceil(text.length / stuecke);
  let i = 0;
  const timer = setInterval(() => {
    if (i < stuecke) {
      const teil = text.slice(i * groesse, (i + 1) * groesse);
      if (teil) send(chunk(basis, { content: teil }));
      i++;
      return;
    }
    clearInterval(timer);
    send(chunk(basis, {}, "stop"));
    send({ ...basis, choices: [], usage });
    res.write("data: [DONE]\n\n");
    res.end();
  }, Math.max(20, dauer / stuecke));
  res.on("close", () => clearInterval(timer));
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://mock");

  if (req.method === "GET" && url.pathname.endsWith("/models")) {
    return json(res, 200, { object: "list", data: [{ id: "mock-kind", object: "model" }, { id: "mock-director", object: "model" }] });
  }
  if (req.method === "GET" && url.pathname === "/status") {
    return json(res, 200, { laufende, gesamt, dauerMs: DAUER_MS, fehlerquote: FEHLERQUOTE, quote429: QUOTE_429 });
  }
  if (req.method !== "POST" || !url.pathname.endsWith("/chat/completions")) {
    return json(res, 404, { error: { message: `unbekannt: ${req.method} ${url.pathname}` } });
  }

  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    let anfrage = {};
    try {
      anfrage = JSON.parse(body || "{}");
    } catch {
      return json(res, 400, { error: { message: "kein JSON" } });
    }
    const nr = ++gesamt;
    const model = anfrage.model ?? "mock-kind";
    const maxTokens = Number(anfrage.max_completion_tokens ?? anfrage.max_tokens ?? 0);
    const usage = (out) => ({ prompt_tokens: TOKENS_IN, completion_tokens: out, total_tokens: TOKENS_IN + out });

    if (Math.random() < QUOTE_429) {
      log(`#${nr} → 429 (Ratelimit simuliert)`);
      res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "5" });
      return res.end(JSON.stringify({ error: { message: "Rate limit reached (simuliert)", type: "rate_limit_error" } }));
    }

    // Kurze Aufrufe (Verbindungstest, Prompt-Coach) sofort beantworten
    if (maxTokens > 0 && maxTokens <= 1000) {
      const text = maxTokens <= 100
        ? "bereit"
        : "Wir wollen ein Spiel, in dem ein Fänger fallende Sterne einsammelt. Jeder Stern gibt einen Punkt, nach drei verpassten Sternen ist Schluss.";
      log(`#${nr} kurz (${maxTokens} Tokens) → sofort`);
      if (anfrage.stream) return streame(res, text, 300, usage(30), model);
      return json(res, 200, {
        id: `chatcmpl-${nr}`, object: "chat.completion", created: Math.floor(Date.now() / 1000), model,
        choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
        usage: usage(30),
      });
    }

    const kaputt = Math.random() < FEHLERQUOTE;
    const dauer = bauzeit();
    const text = antwortText(kaputt);
    laufende++;
    log(`#${nr} Spiel${kaputt ? " (absichtlich kaputt)" : ""} in ${(dauer / 1000).toFixed(1)} s · parallel: ${laufende}`);
    const fertig = () => {
      laufende--;
      log(`#${nr} fertig · parallel: ${laufende}`);
    };
    res.on("close", fertig);

    if (anfrage.stream) return streame(res, text, dauer, usage(TOKENS_OUT), model);
    setTimeout(() => {
      json(res, 200, {
        id: `chatcmpl-${nr}`, object: "chat.completion", created: Math.floor(Date.now() / 1000), model,
        choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
        usage: usage(TOKENS_OUT),
      });
    }, dauer);
  });
});

server.listen(PORT, () => {
  log(`bereit auf :${PORT} — Bauzeit ${DAUER_MS} ms ±${Math.round(STREUUNG * 100)} %, Fehlerquote ${FEHLERQUOTE}, 429-Quote ${QUOTE_429}`);
});
