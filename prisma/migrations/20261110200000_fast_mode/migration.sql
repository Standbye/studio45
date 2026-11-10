-- Fast Mode je KI-Verbindung: "" = normales Tempo, "schnell" = Fast Mode (nur Anthropic-Protokoll)
ALTER TABLE "ApiKey" ADD COLUMN "tempo" TEXT NOT NULL DEFAULT '';
