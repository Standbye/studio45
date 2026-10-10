-- Hilfe beim Formulieren (helpLevel) vom Spielraum der KI (supportLevel) trennen und die
-- Abstimmung des Director's Cut mit der Gruppe speichern. Nur ADD COLUMN — kein Tabellen-Neuaufbau.
ALTER TABLE "Workshop" ADD COLUMN "helpLevel" INTEGER NOT NULL DEFAULT 2;
-- Bisher hing die Hilfe am Unterstützungslevel: 1 = alles, 2–3 = Impulse + Formulierungshilfe, 4–5 = nichts.
UPDATE "Workshop" SET "helpLevel" = CASE WHEN "supportLevel" <= 1 THEN 3 WHEN "supportLevel" <= 3 THEN 2 ELSE 0 END;
ALTER TABLE "Group" ADD COLUMN "dcSpec" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Group" ADD COLUMN "dcStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Group" ADD COLUMN "dcHinweis" TEXT NOT NULL DEFAULT '';
