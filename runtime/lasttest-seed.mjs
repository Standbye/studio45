// Lasttest-Seed: legt den Workshop „lasttest" (Standard: 10 Gruppen) samt
// Mock-Verbindung an und gibt die Gruppencodes als JSON auf stdout aus —
// oder räumt beides mit --entfernen wieder weg (inkl. Spieldateien).
//
// Im Container:  docker exec studio45 node runtime/lasttest-seed.mjs > lasttest-codes.json
// Lokal:         DATABASE_URL=file:./data/studio45.db node runtime/lasttest-seed.mjs --basis-url http://localhost:9999/v1
//
// Optionen: --gruppen N (10) · --basis-url URL (http://mock-ki:9999/v1)
//           --lehrer username (sonst erste Lehrkraft) · --entfernen
//
// Bewusst rohes SQL über better-sqlite3 (wie migrate.mjs): Das Standalone-Image
// enthält keinen Prisma-Client als importierbares Modul.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function ladeDatabase() {
  const kandidaten = [
    path.join(process.cwd(), "node_modules/@prisma/adapter-better-sqlite3/node_modules/better-sqlite3"),
    "better-sqlite3",
  ];
  for (const kandidat of kandidaten) {
    try {
      return require(kandidat);
    } catch {
      /* nächster Kandidat */
    }
  }
  throw new Error("better-sqlite3 nicht auffindbar");
}
const Database = ladeDatabase();

const args = process.argv.slice(2);
const opt = (name, standard) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : standard;
};
const GRUPPEN = Number(opt("--gruppen", "10"));
const BASIS_URL = opt("--basis-url", "http://mock-ki:9999/v1");
const LEHRER = opt("--lehrer", "");
const ENTFERNEN = args.includes("--entfernen");

const SLUG = "lasttest";
const KEY_ID = "lasttest-mock";
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const code = () => Array.from(crypto.randomBytes(20), (b) => ALPHABET[b % ALPHABET.length]).join("");
const neueId = (praefix) => praefix + crypto.randomBytes(10).toString("hex");
const info = (text) => console.error(`[lasttest-seed] ${text}`);

const url = process.env.DATABASE_URL ?? "file:/data/studio45.db";
const dbFile = url.replace(/^file:/, "");
const dataDir = process.env.DATA_DIR ?? path.dirname(dbFile);
const db = new Database(dbFile);
db.pragma("foreign_keys = ON");

if (ENTFERNEN) {
  const w = db.prepare('SELECT id FROM "Workshop" WHERE slug = ?').get(SLUG);
  if (w) {
    const gruppen = db.prepare('SELECT id FROM "Group" WHERE workshopId = ?').all(w.id);
    // Gruppen, Prompt-Logs und Snapshots kaskadieren über die Fremdschlüssel
    db.prepare('DELETE FROM "Workshop" WHERE id = ?').run(w.id);
    for (const g of gruppen) {
      const dir = path.join(dataDir, "games", g.id);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    }
    info(`Workshop „${SLUG}" mit ${gruppen.length} Gruppen entfernt`);
  } else {
    info("kein Lasttest-Workshop vorhanden");
  }
  db.prepare('DELETE FROM "ApiKey" WHERE id = ?').run(KEY_ID);
  process.exit(0);
}

// Mock-Verbindung anlegen oder Endpunkt nachziehen
if (db.prepare('SELECT id FROM "ApiKey" WHERE id = ?').get(KEY_ID)) {
  db.prepare('UPDATE "ApiKey" SET baseUrl = ? WHERE id = ?').run(BASIS_URL, KEY_ID);
} else {
  db.prepare(
    'INSERT INTO "ApiKey" (id, label, secret, protocol, baseUrl, modelKid, modelDirector) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(KEY_ID, "Lasttest-Mock", "mock-schluessel", "openai", BASIS_URL, "mock-kind", "mock-director");
}

let teacherId = null;
if (LEHRER) {
  const u = db.prepare('SELECT id FROM "User" WHERE username = ? AND role = ?').get(LEHRER, "TEACHER");
  if (!u) {
    info(`Lehrkraft „${LEHRER}" nicht gefunden`);
    process.exit(1);
  }
  teacherId = u.id;
} else {
  teacherId = db.prepare('SELECT id FROM "User" WHERE role = ? ORDER BY createdAt ASC LIMIT 1').get("TEACHER")?.id ?? null;
}

let w = db.prepare('SELECT id FROM "Workshop" WHERE slug = ?').get(SLUG);
if (w) {
  db.prepare(
    'UPDATE "Workshop" SET apiKeyId = ?, phase = ?, genLimitPerLesson = 99, cooldownSeconds = 0, tokensUsed = 0, archived = 0 WHERE id = ?'
  ).run(KEY_ID, "STUDIO", w.id);
  db.prepare(
    'UPDATE "Group" SET genUsed = 0, genBonus = 0, generating = 0, generatingSince = NULL, locked = 0 WHERE workshopId = ?'
  ).run(w.id);
  info("vorhandener Lasttest-Workshop zurückgesetzt (Studio-Phase, Versuche frei)");
} else {
  const wid = neueId("lt");
  db.prepare(
    `INSERT INTO "Workshop" (id, slug, name, className, teacherId, apiKeyId, totalDays, currentDay, phase, ageGroup,
       supportLevel, genLimitPerLesson, cooldownSeconds, tokenBudget)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(wid, SLUG, "Lasttest", "", teacherId, KEY_ID, 3, 1, "STUDIO", "OBERSTUFE", 3, 99, 0, 50_000_000);
  const einfuegen = db.prepare('INSERT INTO "Group" (id, workshopId, "index", studioName, code) VALUES (?, ?, ?, ?, ?)');
  for (let i = 1; i <= GRUPPEN; i++) einfuegen.run(neueId("lg"), wid, i, `Lastgruppe ${i}`, code());
  w = { id: wid };
  info(`Workshop „${SLUG}" mit ${GRUPPEN} Gruppen angelegt${teacherId ? "" : " (ohne Lehrkraft)"}`);
}

const gruppen = db
  .prepare('SELECT "index", code, studioName FROM "Group" WHERE workshopId = ? ORDER BY "index"')
  .all(w.id);
process.stdout.write(JSON.stringify({ slug: SLUG, basisUrl: BASIS_URL, gruppen }, null, 2) + "\n");
