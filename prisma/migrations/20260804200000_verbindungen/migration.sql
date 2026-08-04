-- Verbindungen statt reiner API-Keys: Protokoll, Endpunkt und Standardmodelle
-- wandern zum Key; der Workshop referenziert nur noch die Verbindung.
--
-- Bewusst nur ALTER TABLE ADD/DROP COLUMN: kein Tabellen-Neuaufbau, damit keine
-- Fremdschlüssel-Kaskaden Daten mitnehmen können.

ALTER TABLE "ApiKey" ADD COLUMN "protocol"      TEXT NOT NULL DEFAULT 'anthropic';
ALTER TABLE "ApiKey" ADD COLUMN "baseUrl"       TEXT NOT NULL DEFAULT '';
ALTER TABLE "ApiKey" ADD COLUMN "modelKid"      TEXT NOT NULL DEFAULT 'claude-sonnet-5';
ALTER TABLE "ApiKey" ADD COLUMN "modelDirector" TEXT NOT NULL DEFAULT 'claude-opus-5';

-- Bestehende Workshop-Einstellungen in die zugehörige Verbindung übernehmen,
-- damit laufende Workshops ihre Modellwahl behalten.
UPDATE "ApiKey"
   SET "modelKid"      = COALESCE((SELECT "modelKid"      FROM "Workshop" WHERE "Workshop"."apiKeyId" = "ApiKey"."id" LIMIT 1), "modelKid"),
       "modelDirector" = COALESCE((SELECT "modelDirector" FROM "Workshop" WHERE "Workshop"."apiKeyId" = "ApiKey"."id" LIMIT 1), "modelDirector"),
       "baseUrl"       = COALESCE((SELECT "apiBaseUrl"    FROM "Workshop" WHERE "Workshop"."apiKeyId" = "ApiKey"."id" LIMIT 1), "baseUrl");

ALTER TABLE "Workshop" DROP COLUMN "apiBaseUrl";
ALTER TABLE "Workshop" DROP COLUMN "modelKid";
ALTER TABLE "Workshop" DROP COLUMN "modelDirector";
