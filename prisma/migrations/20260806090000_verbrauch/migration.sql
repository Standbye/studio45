-- Token-Transparenz: Preise + Energie-Faktor je Verbindung, Challenge je Workshop.
-- Bewusst nur ADD COLUMN — kein Tabellen-Neuaufbau, keine FK-Kaskaden.
ALTER TABLE "ApiKey" ADD COLUMN "eurPerMTokensIn" REAL NOT NULL DEFAULT 0;
ALTER TABLE "ApiKey" ADD COLUMN "eurPerMTokensOut" REAL NOT NULL DEFAULT 0;
ALTER TABLE "ApiKey" ADD COLUMN "whPerMTokens" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Workshop" ADD COLUMN "challenge" BOOLEAN NOT NULL DEFAULT false;
