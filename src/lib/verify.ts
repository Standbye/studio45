import "server-only";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Prüfung eines generierten Spiels — und die Stelle, an der KI-Code den Server berührt.
 *
 * Der Code stammt von einem Sprachmodell und ist nicht vertrauenswürdig (Prompt-Injection
 * über den Wunschtext genügt). Deshalb drei Schichten:
 *   1. Statische Vorprüfung: Struktur + Muster, die in einem Browser-Spiel nichts zu suchen
 *      haben (process, require, import() …). Billig, fängt Versehen und plumpe Versuche.
 *   2. Gehärteter Prüflauf (runtime/pruef-lauf.mjs): leere Umgebung, Node-Permission-Model,
 *      Speicher- und Zeitlimit.
 *   3. Im Betrieb ein getrennter Prüf-Container ohne Netz und Daten (VERIFY_URL) — nur dort
 *      ist auch der Netzwerkzugriff zu.
 * Ist VERIFY_URL gesetzt und der Dienst nicht erreichbar, wird NICHT lokal geprüft:
 * Wer Isolation verlangt, bekommt keine stille Abschwächung.
 */
export type VerifyResult = {
  ok: boolean;
  detail: string;
  /** Die Prüfung selbst ist ausgefallen — kein Urteil über das Spiel, keine Reparaturrunde. */
  technisch?: boolean;
};

const LAUF = path.join(/*turbopackIgnore: true*/ process.cwd(), "runtime", "pruef-lauf.mjs");
const VERIFY_URL = (process.env.VERIFY_URL ?? "").replace(/\/+$/, "");
const PARALLEL = Math.max(1, Number(process.env.VERIFY_PARALLEL ?? 3));

/** Was in einem Spiel für den Browser nie vorkommen muss — Name fürs Fehlerprotokoll + Muster. */
const VERBOTEN: [string, RegExp][] = [
  ["process", /\bprocess\s*(?:\.|\[)\s*["'`]?(?:env|binding|mainModule|exit|kill|argv|cwd|versions|dlopen|report|getBuiltinModule)\b/],
  ["require()", /\brequire\s*\(/],
  ["import()", /\bimport\s*\(/],
  ["Node-Modul", /["'`]node:[a-z_/]+["'`]|\bchild_process\b/],
  ["Function-Konstruktor", /\bconstructor\s*(?:\.|\[\s*["'`])\s*constructor\b|\bnew\s+Function\s*\(|(?<![.\w$])Function\s*\(/],
  ["eval()", /(?<![.\w$])eval\s*\(/],
];

function vorpruefung(html: string): VerifyResult | null {
  const lower = html.toLowerCase();
  if (!lower.includes("<!doctype html")) return { ok: false, detail: "kein doctype" };
  if (!lower.includes("</html>")) return { ok: false, detail: "HTML unvollständig (kein </html>)" };
  if (!/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i.test(html)) {
    return { ok: false, detail: "kein Inline-Script — Spiel wäre nicht interaktiv" };
  }
  if (/<script[^>]*\bsrc=/i.test(html)) return { ok: false, detail: "externes Script gefunden" };

  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join("\n");
  for (const [name, muster] of VERBOTEN) {
    if (muster.test(scripts)) {
      return { ok: false, detail: `Im Spielcode steht ${name} — das gibt es im Browser-Spiel nicht und ist hier verboten` };
    }
  }
  return null;
}

// Höchstens PARALLEL lokale Prüfläufe gleichzeitig: Zehn Gruppen auf einmal starteten sonst
// zehn Node-Prozesse und liefen gemeinsam ins Zeitlimit.
let laufend = 0;
const wartende: (() => void)[] = [];
async function mitPlatz<T>(aufgabe: () => Promise<T>): Promise<T> {
  if (laufend >= PARALLEL) await new Promise<void>((frei) => wartende.push(frei));
  laufend++;
  try {
    return await aufgabe();
  } finally {
    laufend--;
    wartende.shift()?.();
  }
}

function lokalPruefen(html: string): Promise<VerifyResult> {
  return mitPlatz(async () => {
    const tmp = path.join(os.tmpdir(), `s45-verify-${crypto.randomBytes(8).toString("hex")}.html`);
    fs.writeFileSync(tmp, html, { encoding: "utf8", mode: 0o600 });
    try {
      return await new Promise<VerifyResult>((resolve) => {
        // Der Launcher bekommt selbst schon eine leere Umgebung; den eigentlichen Prüflauf
        // sperrt er weiter ein (siehe runtime/pruef-lauf.mjs).
        execFile(process.execPath, [LAUF, tmp], { env: {} as NodeJS.ProcessEnv, encoding: "utf8", timeout: 15_000, maxBuffer: 1024 * 1024 }, (err, stdout) => {
          try {
            const ergebnis = JSON.parse(String(stdout).trim().split("\n").pop() ?? "") as VerifyResult;
            resolve({ ok: Boolean(ergebnis.ok), detail: String(ergebnis.detail ?? "").slice(0, 500) });
          } catch {
            resolve({ ok: false, detail: err ? "Prüflauf konnte nicht gestartet werden" : "Prüflauf ohne Ergebnis", technisch: true });
          }
        });
      });
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  });
}

async function entferntPruefen(html: string): Promise<VerifyResult> {
  try {
    const res = await fetch(`${VERIFY_URL}/pruefen`, {
      method: "POST",
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: html,
      signal: AbortSignal.timeout(60_000),
    });
    const ergebnis = (await res.json()) as VerifyResult;
    if (!res.ok && res.status >= 500) return { ok: false, detail: "Der Prüfdienst meldet einen Fehler", technisch: true };
    return { ok: Boolean(ergebnis.ok), detail: String(ergebnis.detail ?? "").slice(0, 500) };
  } catch {
    return { ok: false, detail: "Der Prüfdienst ist nicht erreichbar", technisch: true };
  }
}

export async function verifyGameHtml(html: string): Promise<VerifyResult> {
  const befund = vorpruefung(html);
  if (befund) return befund;
  return VERIFY_URL ? entferntPruefen(html) : lokalPruefen(html);
}

/** Für die Admin-Anzeige: Wie wird hier geprüft? */
export function pruefModus(): { modus: "prüfdienst" | "lokal"; url: string } {
  return { modus: VERIFY_URL ? "prüfdienst" : "lokal", url: VERIFY_URL };
}
