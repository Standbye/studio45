import "server-only";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const STUB = path.join(process.cwd(), "runtime", "dom-stub.mjs");
const TIMEOUT_MS = 8000;

export type VerifyResult = { ok: boolean; detail: string };

/**
 * Verifiziert ein generiertes Spiel: Grundstruktur + Ausführung der Scripts
 * im DOM-Stub (Subprozess mit Timeout — generierter Code ist untrusted).
 */
export async function verifyGameHtml(html: string): Promise<VerifyResult> {
  const lower = html.toLowerCase();
  if (!lower.includes("<!doctype html")) return { ok: false, detail: "kein doctype" };
  if (!lower.includes("</html>")) return { ok: false, detail: "HTML unvollständig (kein </html>)" };
  if (!/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i.test(html)) {
    return { ok: false, detail: "kein Inline-Script — Spiel wäre nicht interaktiv" };
  }
  if (/<script[^>]*\bsrc=/i.test(html)) return { ok: false, detail: "externes Script gefunden" };

  const tmp = path.join(os.tmpdir(), `s45-verify-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tmp, html, "utf8");
  try {
    return await new Promise<VerifyResult>((resolve) => {
      execFile(
        process.execPath,
        [STUB, tmp, "30"],
        { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 },
        (err, stdout, stderr) => {
          if (!err) resolve({ ok: true, detail: stdout.trim() });
          else if (err.killed) resolve({ ok: false, detail: "Timeout im Verifikationslauf" });
          else resolve({ ok: false, detail: (stderr || stdout || String(err)).trim().slice(0, 500) });
        }
      );
    });
  } finally {
    fs.unlinkSync(tmp);
  }
}
