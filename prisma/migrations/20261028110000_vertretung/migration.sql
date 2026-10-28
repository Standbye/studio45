-- Vertretungszugang je Workshop: langer Zufallscode für den Link /v/<code> ("" = aus).
-- Nur ADD COLUMN und ein Index, keine Tabellen-Neuanlage.
ALTER TABLE "Workshop" ADD COLUMN "vertretungsCode" TEXT NOT NULL DEFAULT '';
CREATE INDEX "Workshop_vertretungsCode_idx" ON "Workshop"("vertretungsCode");
