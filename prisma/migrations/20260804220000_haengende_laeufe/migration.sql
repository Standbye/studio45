-- Startzeitpunkt der laufenden Generierung: erkennt hängengebliebene Läufe
-- (z. B. nach einem Serverneustart mitten im Bau) und gibt die Gruppe frei.
ALTER TABLE "Group" ADD COLUMN "generatingSince" DATETIME;
