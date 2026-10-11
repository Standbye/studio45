-- Lernfall: Freigabe-Stufe am Workshop, Prüfliste je Gruppe. Nur ADD COLUMN.
ALTER TABLE "Workshop" ADD COLUMN "lernfallStufe" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Group" ADD COLUMN "lernfallBefunde" TEXT NOT NULL DEFAULT '';
