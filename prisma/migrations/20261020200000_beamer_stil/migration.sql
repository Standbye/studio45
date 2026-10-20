-- Gestaltung der Beamer-Seite je Workshop ("" = Markenfarben, "vortrag" = Rot-Weiß für Vorträge). Nur ADD COLUMN.
ALTER TABLE "Workshop" ADD COLUMN "beamerStil" TEXT NOT NULL DEFAULT '';
