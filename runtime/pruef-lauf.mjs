// Gehärteter Start der Spielprüfung — die eine Stelle, an der festgelegt ist, womit
// KI-generierter Code auf dem Server laufen darf.
//
// Der Prüfprozess (dom-stub.mjs) bekommt:
//   - eine LEERE Umgebung (kein DATABASE_URL, kein SESSION_SECRET, nichts),
//   - das Node-Permission-Model: Dateien lesen nur Stub + die eine HTML-Datei,
//     kein Schreiben, keine Kindprozesse, keine Worker, keine nativen Addons,
//   - ein Speicherlimit und ein hartes Zeitlimit (SIGKILL),
//   - ein Arbeitsverzeichnis ohne Inhalt.
// Was das NICHT abdeckt: Netzwerkzugriff (das Permission-Model von Node 22 regelt ihn
// nicht). Dafür gibt es den getrennten Prüf-Container (runtime/pruefer.mjs) in einem
// Docker-Netz ohne Ausgang — siehe docker-compose.yml und SECURITY.md.
//
// Nutzung als Modul:  import { pruefeHtml } from "./pruef-lauf.mjs"
// Nutzung als Befehl: node runtime/pruef-lauf.mjs <html-datei>   → JSON auf stdout
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));
// Echte Pfade ohne Symlinks: Das Permission-Model vergleicht aufgelöste Pfade
// (macOS legt das Temp-Verzeichnis hinter einen Symlink).
const STUB = fs.realpathSync(path.join(HIER, "dom-stub.mjs"));
export const ZEITLIMIT_MS = 8000;
const SPEICHER_MB = 256;

/** Prüft eine HTML-Datei. Löst immer auf — Fehler stehen im Ergebnis. */
export function pruefeDatei(htmlDatei, frames = 30) {
  let htmlPfad;
  try {
    htmlPfad = fs.realpathSync(htmlDatei);
  } catch {
    return Promise.resolve({ ok: false, detail: "Prüfdatei nicht gefunden" });
  }
  const args = [
    "--permission",
    `--allow-fs-read=${STUB}`,
    `--allow-fs-read=${htmlPfad}`,
    `--max-old-space-size=${SPEICHER_MB}`,
    "--no-warnings",
    STUB,
    htmlPfad,
    String(frames),
  ];
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      args,
      { env: {}, cwd: fs.realpathSync(os.tmpdir()), timeout: ZEITLIMIT_MS, killSignal: "SIGKILL", maxBuffer: 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => {
        if (!err) return resolve({ ok: true, detail: String(stdout).trim().slice(0, 300) });
        if (err.killed || err.signal) return resolve({ ok: false, detail: "Zeit- oder Speicherlimit im Prüflauf überschritten" });
        const text = String(stderr || stdout || err.message).trim();
        // Ein Verstoß gegen das Permission-Model ist kein Spielfehler, sondern ein Zugriffsversuch
        if (/ERR_ACCESS_DENIED/.test(text)) return resolve({ ok: false, detail: "Verbotener Zugriff im Spielcode (Dateien, Prozesse oder Module)" });
        resolve({ ok: false, detail: text.slice(0, 500) });
      }
    );
  });
}

/** Prüft HTML-Text: schreibt ihn in eine kurzlebige Datei und räumt sie wieder weg. */
export async function pruefeHtml(html, frames = 30) {
  const datei = path.join(os.tmpdir(), `s45-pruef-${crypto.randomBytes(8).toString("hex")}.html`);
  fs.writeFileSync(datei, html, { encoding: "utf8", mode: 0o600 });
  try {
    return await pruefeDatei(datei, frames);
  } finally {
    fs.rmSync(datei, { force: true });
  }
}

/** Begrenzt gleichzeitige Prüfläufe — zehn Gruppen auf einmal sollen den Server nicht fluten. */
export function begrenzer(maximal) {
  let laufend = 0;
  const warteschlange = [];
  const weiter = () => {
    if (laufend >= maximal || warteschlange.length === 0) return;
    laufend++;
    const { aufgabe, resolve, reject } = warteschlange.shift();
    aufgabe().then(resolve, reject).finally(() => {
      laufend--;
      weiter();
    });
  };
  return (aufgabe) =>
    new Promise((resolve, reject) => {
      warteschlange.push({ aufgabe, resolve, reject });
      weiter();
    });
}

// Als Befehl aufgerufen
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const datei = process.argv[2];
  if (!datei) {
    console.error("Aufruf: node runtime/pruef-lauf.mjs <html-datei>");
    process.exit(2);
  }
  const ergebnis = await pruefeDatei(path.resolve(datei));
  process.stdout.write(JSON.stringify(ergebnis) + "\n");
  process.exit(ergebnis.ok ? 0 : 1);
}
