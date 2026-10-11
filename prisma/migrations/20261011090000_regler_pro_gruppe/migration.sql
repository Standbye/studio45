-- Regler pro Gruppe: NULL = Einstellung des Workshops. Nur ADD COLUMN.
ALTER TABLE "Group" ADD COLUMN "supportLevel" INTEGER;
ALTER TABLE "Group" ADD COLUMN "helpLevel" INTEGER;
