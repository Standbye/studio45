import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

/** Basis-URL der Instanz — steuert u. a. die QR-Code-Generierung. */
export const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Datenverzeichnis (Volume im Container): SQLite, Spiele, Snapshots, Logos. */
export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "./data");

export function dataPath(...segments: string[]): string {
  const p = path.join(/*turbopackIgnore: true*/ DATA_DIR, ...segments);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

/**
 * Session-Secret: aus ENV, sonst einmalig generiert und im Datenverzeichnis
 * persistiert (damit Sessions einen Container-Neustart überleben).
 */
export function sessionSecret(): Uint8Array {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) return new TextEncoder().encode(fromEnv);
  const file = dataPath("session-secret");
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, crypto.randomBytes(48).toString("hex"), { mode: 0o600 });
  }
  return new TextEncoder().encode(fs.readFileSync(file, "utf8").trim());
}
