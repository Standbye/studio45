-- Dauer jeder Generierung messen, um den Kindern die Wartezeit zu schätzen.
ALTER TABLE "PromptLog" ADD COLUMN "durationMs" INTEGER NOT NULL DEFAULT 0;
