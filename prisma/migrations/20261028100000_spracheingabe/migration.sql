-- Spracheingabe je Workshop: "" = an (auf dem Gerät, wenn möglich, sonst Browser-Dienst mit Hinweis),
-- "lokal" = nur auf dem Gerät, "aus" = nur tippen. Nur ADD COLUMN.
ALTER TABLE "Workshop" ADD COLUMN "spracheingabe" TEXT NOT NULL DEFAULT '';
