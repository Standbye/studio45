// Studio45 Migrations-Runner für den Container.
//
// Warum nicht die Prisma-CLI? Das Standalone-Image enthält bewusst nur die
// Laufzeit-Abhängigkeiten; die CLI bräuchte ihren kompletten eigenen Baum.
// Die Migrationen sind reines SQL — das können wir direkt anwenden.
//
// Wichtig (Lehre aus einem echten Datenverlust): better-sqlite3 aktiviert
// Foreign-Key-Enforcement per Default. Prisma-Migrationen bauen Tabellen per
// CREATE new + INSERT SELECT + DROP TABLE um; mit aktiven FKs löscht DROP TABLE
// abhängige Zeilen per ON DELETE CASCADE, BEVOR sie kopiert sind. Das PRAGMA im
// Migrations-SQL ist innerhalb einer Transaktion wirkungslos — deshalb schalten
// wir hier außerhalb jeder Transaktion ab und am Ende wieder an.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * better-sqlite3 auflösen: Im Standalone-Build liegt die funktionsfähige Kopie
 * (inkl. nativer Binärdatei) unter dem Prisma-Adapter; die Kopie auf oberster
 * Ebene ist nur ein von der Trace-Analyse übrig gelassener Torso.
 */
function ladeDatabase() {
  const kandidaten = [
    // Absoluter Pfad: Unterpfade in fremde node_modules lassen sich nicht
    // über den Paketnamen auflösen (package exports).
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

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const url = process.env.DATABASE_URL ?? "file:/data/studio45.db";
const dbFile = url.replace(/^file:/, "");

fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);
db.pragma("foreign_keys = OFF"); // außerhalb der Transaktionen!
db.pragma("journal_mode = WAL");

db.exec(`CREATE TABLE IF NOT EXISTS _studio45_migrations (
  name       TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
)`);

const angewendet = new Set(
  db.prepare("SELECT name FROM _studio45_migrations").all().map((r) => r.name)
);

const offen = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()
  .filter((name) => !angewendet.has(name));

if (offen.length === 0) {
  console.log(`   Datenbank aktuell (${angewendet.size} Migrationen).`);
} else {
  for (const name of offen) {
    const sql = fs.readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8");
    const anwenden = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _studio45_migrations (name, applied_at) VALUES (?, ?)")
        .run(name, new Date().toISOString());
    });
    try {
      anwenden();
      console.log(`   ✓ ${name}`);
    } catch (err) {
      console.error(`   ✗ ${name}: ${err.message}`);
      process.exit(1);
    }
  }
}

db.pragma("foreign_keys = ON");
const verletzungen = db.pragma("foreign_key_check");
if (verletzungen.length > 0) {
  console.error(`   ✗ ${verletzungen.length} Fremdschlüssel-Verletzungen nach der Migration!`);
  process.exit(1);
}
db.close();
