-- Gründlichkeit beim Bauen je KI-Verbindung ("" = normal, "hoch"). Nur ADD COLUMN.
ALTER TABLE "ApiKey" ADD COLUMN "gruendlich" TEXT NOT NULL DEFAULT '';
