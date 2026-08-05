-- Zielgruppe und Unterstützungslevel: Die Lehrkraft legt fest, für welches Alter
-- gebaut wird und wie stark die KI mithilft. Das dreistufige `guidance` (nur
-- Oberfläche) geht im neuen 1–5-Level auf, das auch das KI-Verhalten steuert.
--
-- Nur ALTER TABLE ADD/DROP COLUMN — kein Tabellen-Neuaufbau, damit keine
-- Fremdschlüssel-Kaskaden Daten mitnehmen.

ALTER TABLE "Workshop" ADD COLUMN "ageGroup"       TEXT    NOT NULL DEFAULT 'GRUNDSCHULE';
ALTER TABLE "Workshop" ADD COLUMN "supportLevel"   INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Workshop" ADD COLUMN "promptDidactic" TEXT    NOT NULL DEFAULT '';

-- Bisherige Führungsstufe übernehmen: geführt = viel Hilfe, frei = wenig.
UPDATE "Workshop" SET "supportLevel" = CASE "guidance"
  WHEN 'GEFUEHRT' THEN 1
  WHEN 'IMPULSE'  THEN 2
  WHEN 'FREI'     THEN 4
  ELSE 2 END;

ALTER TABLE "Workshop" DROP COLUMN "guidance";
