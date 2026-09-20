import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Welcher Stand läuft gerade? Gespeist aus build-info.json, die beim Bauen
 * entsteht (scripts/build-info.mjs). Ohne die Datei — lokale Entwicklung —
 * gibt es die Paketversion mit dem Zusatz „dev".
 */
export type BuildInfo = {
  version: string;
  /** `git describe --tags --dirty --always`, z. B. v1.1.0-3-gdd745e6 */
  beschreibung: string;
  commit: string;
  branch: string;
  gebautAm: string;
};

let gelesen: BuildInfo | null = null;

export function buildInfo(): BuildInfo {
  if (gelesen) return gelesen;
  try {
    gelesen = JSON.parse(fs.readFileSync(path.join(process.cwd(), "build-info.json"), "utf8")) as BuildInfo;
  } catch {
    let version = "0.0.0";
    try {
      version = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")).version;
    } catch {
      /* dann eben 0.0.0 */
    }
    gelesen = { version, beschreibung: `v${version}-dev`, commit: "dev", branch: "", gebautAm: "" };
  }
  return gelesen;
}

/** Kurzform für Fußzeilen: „v1.1.0-3-gdd745e6 · gebaut 20.09.2026, 14:02" */
export function versionsText(): string {
  const b = buildInfo();
  if (!b.gebautAm) return b.beschreibung;
  const datum = new Date(b.gebautAm).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });
  return `${b.beschreibung} · gebaut ${datum}`;
}
