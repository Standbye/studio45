// Rendert alle Druckmaterialien als PDF und prüft die A4-Geometrie.
//
// Aufruf:  npx tsx scripts/druck-pdf.ts [ausgabeverzeichnis]
// Braucht: laufenden Dev-Server (Port 3020 oder DRUCK_BASIS), Demo-Daten
//          (scripts/seed-demo.ts) und ein installiertes Google Chrome.
//
// Warum so aufwendig? `chrome --print-to-pdf` von der Kommandozeile ignoriert
// CSS-@page-Größen (Papier ist dann immer Letter) — erst Page.printToPDF über
// das DevTools-Protokoll mit `preferCSSPageSize` druckt wie der echte Dialog.
import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { SignJWT } from "jose";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const BASIS = process.env.DRUCK_BASIS ?? "http://localhost:3020";
const CHROME = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CDP_PORT = 9333;
const AUSGABE = path.resolve(process.argv[2] ?? "data/druck-test");

// A4 in PDF-Punkten (595.28 × 841.89), mit Toleranz für Rundung
const A4 = { b: 595.3, h: 841.9, toleranz: 1.5 };

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./data/studio45.db" }),
});

async function sessionToken(userId: string): Promise<string> {
  const ausEnv = process.env.SESSION_SECRET;
  const secret =
    ausEnv && ausEnv.length >= 32 ? ausEnv : fs.readFileSync(path.resolve("data/session-secret"), "utf8").trim();
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}

/** Minimaler CDP-Client über die in Node eingebaute WebSocket-Implementierung. */
function cdpVerbinden(url: string) {
  const ws = new WebSocket(url);
  let naechsteId = 1;
  const offen = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  const ereignisWarter = new Map<string, () => void>();

  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id && offen.has(msg.id)) {
      const { resolve, reject } = offen.get(msg.id)!;
      offen.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method && ereignisWarter.has(msg.method)) {
      ereignisWarter.get(msg.method)!();
      ereignisWarter.delete(msg.method);
    }
  });

  return {
    bereit: new Promise<void>((resolve, reject) => {
      ws.addEventListener("open", () => resolve());
      ws.addEventListener("error", () => reject(new Error(`WebSocket zu ${url} fehlgeschlagen`)));
    }),
    befehl<T = unknown>(method: string, params?: object): Promise<T> {
      const id = naechsteId++;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => offen.set(id, { resolve: resolve as (v: unknown) => void, reject }));
    },
    aufEreignis(method: string): Promise<void> {
      return new Promise((resolve) => ereignisWarter.set(method, resolve));
    },
    schliessen: () => ws.close(),
  };
}

/** Seitenmaße und -anzahl direkt aus dem PDF lesen (Chrome schreibt beides unkomprimiert). */
function pdfPruefen(datei: string): { seiten: number; boxen: [number, number][] } {
  const roh = fs.readFileSync(datei).toString("latin1");
  const boxen = [...roh.matchAll(/\/MediaBox \[([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)\]/g)].map(
    (m): [number, number] => [Number(m[3]) - Number(m[1]), Number(m[4]) - Number(m[2])]
  );
  const seiten = (roh.match(/\/Type \/Page[^s]/g) ?? []).length;
  return { seiten, boxen };
}

function istA4(b: number, h: number, quer: boolean): boolean {
  const soll = quer ? { b: A4.h, h: A4.b } : A4;
  return Math.abs(b - soll.b) <= A4.toleranz && Math.abs(h - soll.h) <= A4.toleranz;
}

async function main() {
  const lehrkraft = await db.user.findUnique({ where: { username: "muster" } });
  const workshop = await db.workshop.findFirst({ where: { slug: "demo-lindenschule" }, include: { groups: true } });
  if (!lehrkraft || !workshop) throw new Error("Demo-Daten fehlen — erst `npx tsx scripts/seed-demo.ts` ausführen.");
  const token = await sessionToken(lehrkraft.id);

  const blaetter: { slug: string; quer: boolean; seiten: number }[] = [
    { slug: "rollenkarten", quer: false, seiten: 1 },
    { slug: "tafeln", quer: true, seiten: 2 },
    { slug: "qr", quer: false, seiten: workshop.groups.length },
    { slug: "stundenverlauf", quer: false, seiten: workshop.totalDays + 1 },
    { slug: "ich-kann", quer: false, seiten: 1 },
    { slug: "elternbrief", quer: false, seiten: 1 },
    { slug: "urkunden", quer: false, seiten: workshop.groups.length },
  ];

  fs.mkdirSync(AUSGABE, { recursive: true });
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "studio45-druck-"));
  const chrome = spawn(
    CHROME,
    [`--headless=new`, `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profil}`, "--no-first-run", "about:blank"],
    { stdio: "ignore" }
  );

  try {
    // Warten, bis das DevTools-Endpoint antwortet
    let ziel: { webSocketDebuggerUrl: string } | undefined;
    for (let i = 0; i < 50 && !ziel; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" });
        ziel = (await res.json()) as { webSocketDebuggerUrl: string };
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    if (!ziel) throw new Error("Chrome-DevTools-Endpoint nicht erreichbar.");

    const cdp = cdpVerbinden(ziel.webSocketDebuggerUrl);
    await cdp.bereit;
    await cdp.befehl("Network.enable");
    await cdp.befehl("Page.enable");
    await cdp.befehl("Network.setCookie", { name: "s45_session", value: token, url: BASIS });

    let fehler = 0;
    for (const b of blaetter) {
      const geladen = cdp.aufEreignis("Page.loadEventFired");
      await cdp.befehl("Page.navigate", { url: `${BASIS}/druck/${workshop.id}/${b.slug}` });
      await geladen;
      await new Promise((r) => setTimeout(r, 400)); // Bilder (QR, Logo) fertig zeichnen lassen

      const { data } = await cdp.befehl<{ data: string }>("Page.printToPDF", {
        printBackground: true,
        preferCSSPageSize: true,
      });
      const datei = path.join(AUSGABE, `${b.slug}.pdf`);
      fs.writeFileSync(datei, Buffer.from(data, "base64"));

      const { seiten, boxen } = pdfPruefen(datei);
      const masseOk = boxen.length > 0 && boxen.every(([bb, hh]) => istA4(bb, hh, b.quer));
      const seitenOk = seiten === b.seiten;
      if (!masseOk || !seitenOk) fehler++;
      console.log(
        `${masseOk && seitenOk ? "✅" : "❌"} ${b.slug.padEnd(15)} ${seiten} Seite(n) (erwartet ${b.seiten}), ` +
          `${boxen[0]?.[0].toFixed(1)}×${boxen[0]?.[1].toFixed(1)}pt ${b.quer ? "(quer)" : ""}`
      );
    }

    cdp.schliessen();
    if (fehler > 0) {
      console.error(`\n${fehler} Blatt/Blätter fehlerhaft — PDFs liegen in ${AUSGABE}`);
      process.exitCode = 1;
    } else {
      console.log(`\nAlle Blätter exakt auf A4 — PDFs liegen in ${AUSGABE}`);
    }
  } finally {
    chrome.kill();
    await new Promise((r) => chrome.once("exit", r)); // erst sterben lassen, dann Profil löschen
    fs.rmSync(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
