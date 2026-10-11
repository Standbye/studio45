# Studio45 — Sammelliste

> **Arbeitsweise:**
> 1. Neue Anforderungen und Ideen werden hier nur **notiert**. Gebaut wird ausschließlich
>    auf ausdrückliches Kommando von Peter — nichts aus dieser Liste wird ungefragt umgesetzt.
> 2. **Releases und Versions-Tags nur auf Ansage.** Auch nach einem fertigen Fix wird kein
>    Release erstellt, bis Peter es sagt.

Stand: 2026-08-04 · Live: https://studio45.littleproject.de · Repo: `Standbye/studio45`

---

## Leitgedanken (gesammelt — fließen in die weiteren Themen ein, kein eigener Bauauftrag)

- **„Der KI wie Kindern klare Grenzen setzen"** (Peter, 2026-10-01) — KI braucht nicht mehr wie
  früher ganz klare, kleinteilige Prompts; sie kann immer mehr selbst. Umso mehr braucht sie
  Grenzen, in denen sie arbeiten soll. Ein Rahmen besteht aus Auftrag, Regeln, Spielraum,
  harter Grenze und Kontrolle — genau wie bei den Kindern (Merksatz, Rollen, Versuche,
  Plenum-Sperre, Verlauf). Im Produkt schon angelegt: fester Prompt-Kern, „Was du heute NICHT
  tust" im Tagesfokus, Unterstützungslevel 1–5, Sandbox, Token-Budget, automatische Prüfung.
  Anknüpfungspunkte: Harness (Grenzen technisch erzwingen statt nur erbitten — Statik-Linter,
  Patch-Edits), Unterstützungslevel als „Grenz-Regler" erklären, Didaktik-Material
  (Merksatz, KI-Tipps, Thementafel), Übung „Wunsch = Ziel + Grenze".

- **Grenzen nach Klassenstufe staffeln** (Peter, 2026-10-01) — In den unteren Klassenstufen
  wird das Thema Grenzen noch nicht ausdrücklich behandelt: Die Grenzen gibt die Lehrkraft
  über das Preprompting mit (KI-Anweisung), die Kinder arbeiten einfach darin. In den höheren
  Klassenstufen wird „Grenzen setzen" selbst zum Lerninhalt — die Schüler formulieren sie.
  Anknüpfungspunkte: Altersprofile in `audience.ts` (Grundschule: Grenzen nur im Prompt,
  keine Chips/Übungen dazu; Oberstufe: Grenzen als Impuls, Regel und Übung), Reiter
  „KI-Anweisung" als der Ort, an dem die Lehrkraft die Grenzen setzt; läuft parallel zum
  Unterstützungslevel (unten viel Führung, oben wenig).

- **Vergleich Leitplanken** (Peter, 2026-10-01) — Grenzen für die KI sind dasselbe wie die
  Leitplanken, die man aus Projekten, Ausbildung und Führung kennt: Auch Mitarbeitern setzen
  wir im Business Leitplanken, in denen sie sich bewegen sollen. Der Zielkonflikt gehört dazu:
  **je enger die Leitplanken, desto zielgerichteter — aber auch desto weniger kreativ.**
  Anknüpfungspunkte: als Bild für Erwachsene tragfähiger als der Kinder-Vergleich
  (Konferenz, Lehrkräfte, Business); das Unterstützungslevel 1–5 ist genau dieser Regler
  (Stufe 1 weite Leitplanken mit Überraschungs-Budget, Stufe 5 enge: nur was verlangt ist);
  für die Oberstufe als Lerninhalt: Leitplanken bewusst enger oder weiter stellen und das
  Ergebnis vergleichen; beim Harness: wie eng die technischen Grenzen sein sollen, ist dieselbe
  Abwägung.

- **Die Idee ins Git, den Code baut die KI** (Peter, 2026-10-02, „zentraler Gedanke") — Die
  Idee, ihre Weiterentwicklung und das Thema sind der relevante Faktor; das Ganze in Software
  zu gießen ist keine Limitation mehr. Deshalb sollte im Repo eher das Konzept (Markdown oder
  anderes) gepflegt und weiterentwickelt werden als der eigentliche Code — den lässt man die
  KI daraus bauen.
  Anknüpfungspunkte: passt zu den Grenzen-Leitgedanken oben (ein Konzept besteht aus Idee
  **und** Grenzen — genau das, was der Mensch beitragen muss); die Lehren aus dem Piloten
  gehören dann als ausdrückliche Regeln ins Konzept, sonst lernt jeder Neubau sie neu; harte
  Grenzen (Sandbox, Schlüssel nur serverseitig, Limits, keine Personendaten) brauchen
  zusätzlich prüfbare Abnahmekriterien, weil ein Neubau nicht zweimal denselben Code ergibt;
  Schulen brauchen weiterhin etwas Lauffähiges (Image) und eine Instanz mit Daten einen
  Migrationspfad. Offener Punkt: Die ursprüngliche Ideensammlung, aus der Studio45 gebaut
  wurde, liegt bisher nicht im Repo.

## Offen nach dem Bau vom 2026-10-10

- [x] **Deploy der Isolation** (2026-10-11, Stand `v1.1.0-15-g91c4a7a`): Server-Override um
      `pruefer: image: studio45-studio45` ergänzt. Auf dem Server nachgewiesen: Prüf-Container hat
      kein Internet (Name und IP), keine Datenbank, schreibgeschütztes Dateisystem, ist von außen
      nicht erreichbar; Angriffsspiel (`MOCK_ANGRIFF=1`) wird vor jeder Ausführung abgelehnt.
      **Lasttest grün:** 10 Gruppen gleichzeitig, 2 Runden, 20/20 Builds ok (36–55 s bei 45 s
      Mock-Bauzeit), Kinder-App p95 180 ms, 0 Fehler, Container-Spitze 15 % CPU / 204 MiB
      (Server: 4 Kerne, 7,7 GB). **Mit echtem Anbieter (2026-10-11, OpenRouter, `openai/gpt-5.6-terra`):**
      10 Gruppen gleichzeitig, eine Runde Erstbau + eine Runde Änderungswunsch: 20/20 ok, keine
      Ratelimits, keine Reparaturrunde, Bauzeit 19–40 s, Kinder-App p95 123 ms, Container-Spitze
      47 % CPU / 239 MiB; 192.945 Tokens = 0,70 € laut hinterlegten Preisen. Das Modell führt
      `von_der_gruppe`/`von_der_ki` in 10 von 10 Spielen und schreibt sie beim Ändern fort.
      Der Workshop `lasttest` (10 echte Spiele) liegt noch auf dem Server — entfernen mit
      `docker exec studio45 node runtime/lasttest-seed.mjs --entfernen`. DB-Sicherung von vor dem Deploy liegt im Volume
      (`/data/studio45.db.vor-deploy-2026-10-11`).
- [ ] **Für Codex (Material):** Neu im Produkt und im Material noch nicht erwähnt — Lernfall-Seite
      (`/lehrer/<id>/lernfall`, für Gruppen `/w/<slug>/lernfall`), Anzeige „Von uns — und von der KI"
      nach jedem Bau (passt zur Reflexionsfrage „Was hat die KI ergänzt?"), Abstimmung der Gruppe
      beim Director's Cut; die Regler heißen jetzt „Spielraum der KI (Leitplanken)" und
      „Hilfe beim Formulieren". Merksatz Tag 1 („versteht mich die KI") auf Vermenschlichung prüfen.
- [x] **Lernfall neu aufgebaut: von der Lehrkraft gesteuert** (Peter, 2026-10-11; deployt 2026-10-11,
      Server meldet `v1.1.0-25-ge011b5d`). Auslöser: Der Link stand fest auf der Beamer-Seite, die zweite Fassung ließ sich
      sofort laden, Befunde landeten nirgends.
      1. **Schalter mit Stufen** (`Workshop.lernfallStufe`, Standard aus): aus → erste Fassung →
         zweite Fassung → Auflösung, auf `/lehrer/<id>/lernfall`. Aus = Seite, Spiel und Beamer-Link
         nicht erreichbar; die zweite Fassung gibt es erst ab Stufe 2 (serverseitig geprüft). Die
         eigene Lehrkraft kann beide Fassungen jederzeit selbst ausprobieren. Hinweis mit
         „Beenden" im Dashboard, solange der Lernfall läuft.
      2. **Prüfliste je Gruppe in der Kinder-App** (`Group.lernfallBefunde`): Der Lernfall ersetzt
         auf den Geräten das Studio (auch im Plenum; Pause deckt ihn zu), kein QR nötig. Je Regel
         „Stimmt / Stimmt nicht" plus Satz „erwartet / passiert", gespeichert nur für die gerade
         freigegebene Fassung. Lehrkraft sieht je Gruppe ✓/✗/offen und die Notizen (lädt von selbst
         nach), kann die Prüflisten leeren. Auflösung: Kinder sehen ihre Urteile neben der Lösung,
         der Beamer (`/w/<slug>/lernfall`) die Lösung mit „x von y Gruppen haben das so gesehen" —
         bewusst keine Rangliste. Die Lösung geht erst mit Stufe 3 an die Geräte.
      3. **Hindernis im Spiel:** fünfte Regel „Braune Äpfel sind faul: fangen kostet 1 Punkt,
         durchlassen zählt nicht als verpasst". Erste Fassung: 3 Regeln verletzt, 2 eingehalten.
         Zweite Fassung: 2 behoben, 1 nicht — und die Faule-Äpfel-Regel ist **neu kaputt** (kein
         Abzug mehr). Lehre: nach einer Reparatur alles prüfen, nicht nur das Gemeldete.
      Geprüft: beide Fassungen per Simulation, Freigabe-Logik per API, Oberflächen im Browser,
      Migration (`20261011150000_lernfall_steuerung`, nur ADD COLUMN) mit dem Container-Migrator.
      **Nicht gebaut (bewusst):** echter KI-Lauf als Lernfall, Katalog mehrerer Lernfälle,
      Punkte/Rangliste, automatische KI-Bewertung der Freitexte.
- [x] **Kinder-Studio: Spiel links im Rahmen, Bedienung rechts** (Peter, 2026-10-11; deployt
      2026-10-11). Ab 1024 px Breite (Tablet quer, Laptop) steht das Spiel links über die volle
      Höhe, rechts Bausteine, Eingabe, Mikrofon und Bau-Knopf; die Seite scrollt nicht mehr und
      die Eingabe verdeckt nichts (bei 1180 × 820: Spiel 784 × 738). Hochformat bleibt
      untereinander. Dazu im Kern-Prompt verschärft: alles Spielbare passt ohne Scrollen in den
      Rahmen, keine festen Pixelhöhen — wirkt nur auf neu gebaute Spiele.
- [x] **Fehler Spracheingabe: Gesagtes wurde immer wieder angehängt** (Peter, 2026-10-11; behoben
      und deployt, Server meldet `v1.1.0-27-g05c715f`). Ursache: Der gesammelte Endtext wurde bei
      jedem Erkennungs-Ereignis komplett hinten angehängt statt ersetzt. Jetzt wird der Text je
      Ereignis vollständig aus der Ergebnisliste aufgebaut (`src/lib/diktat.ts`); kumulative
      Endergebnisse (Chrome/Android) und eine neu beginnende Liste nach Sprechpause (Safari) sind
      abgefangen. Geprüft per Nachspielen von Ereignisfolgen — nicht mit echtem Mikrofon am iPad.
- [x] **Fokus der Stunde, aufwändigere Spiele, mehr Hilfe für die Kleinen** (Peter, 2026-10-11;
      deployt, Server meldet `v1.1.0-31-gfddad63`). Drei Themen in einem Bau:
      **Fokus:** Karte „🎯 Heute: … / Heute geht es um … / Merksatz" dauerhaft in der Bedienspalte,
      derselbe Satz am Beamer und im Plenum-Bildschirm (`src/lib/tagesfokus.ts`). Satzanfänge,
      Formulierungshilfe und die dritte Team-Check-Frage hängen jetzt am Schwerpunkt des Termins
      statt an der Tagesnummer (behebt die falschen Chips an Termin 3 im 3-Termine-Format).
      **Aufwand:** Tagesfokus-Anweisungen von Verbot auf Vorrang umgestellt („was die Gruppe
      ausdrücklich verlangt, baust du"), veraltete Tag-Verweise raus; Grundschul-Block: eine Regel
      ist Startpunkt, kein Deckel; neue Einstellung „Gründlichkeit beim Bauen" je KI-Verbindung
      (Admin; `ApiKey.gruendlich`, Migration `20261011180000_gruendlichkeit`) — gibt dem Modell
      mehr Denkaufwand und 48.000 statt 32.000 Tokens Luft, fällt bei Ablehnung auf normal
      zurück; Standard-Budget neuer Workshops 5 Mio. (bestehende bleiben, im Admin änderbar).
      **Für die Kleinen:** Vorlesen-Knöpfe (Grundschule; Fokus, Satzanfänge, Rückmeldung, „Das ist
      neu", KI-Ergänzungen, Rückfrage, Team-Check, Fehlermeldung); Rückfrage mit Antworten zum
      Antippen statt Textvorschlag (Grundschule, ältere Stufen behalten den Textvorschlag);
      „✨ Das ist neu / 🕹️ Probiert das aus" nach jedem Bau (neue Steckbrief-Felder `neu` und
      `ausprobieren`, erst bei neu gebauten Spielen vorhanden); „🐞 Etwas geht nicht" als geführte
      Fehlermeldung (ab Hilfe-Stufe 1); „↩︎ Einen Schritt zurück" für die Gruppe selbst (kostet
      keinen Versuch, wird als eigene Fassung festgehalten). Die Eingabe bleibt in der
      Bedienspalte immer sichtbar, Hinweise darüber scrollen für sich.
      Geprüft lokal mit dem Mock-Anbieter im Browser (alle Abläufe, Quer- und Hochformat, Admin-
      Formular) und per API (ältere Stufen, 3-Termine-Format, Container-Migration). Nicht geprüft:
      Sprachausgabe auf einem echten iPad, Rückfragen und „Das ist neu" mit dem echten Modell,
      „Gründlichkeit hoch" beim echten Anbieter.
      **Nicht gebaut (bewusst):** fertige Spielvorlagen zum Anklicken, Avatare/Belohnungen,
      „wieder vor" nach einem Schritt zurück.
- [ ] **Ton in den Spielen ist praktisch nicht zu hören** (Peter, 2026-10-11). Befund am Spiel
      „Neo springt" (Gruppe 2, Test-Workshop): Musik und Geräusche sind eingebaut (erzeugte Töne
      per Web Audio, keine Audiodateien), aber (a) der Ton ist beim Start **aus** und muss im Spiel
      über „Ton: aus" eingeschaltet werden, (b) die Musik läuft mit Lautstärke 0,008–0,012 (rund
      1 %), Geräusche mit 0,045 — auf einem Tablet kaum hörbar. Ursache sind unsere Anweisungen:
      Kern „Nie automatisch laute Musik beim Laden. Ton startet leise und hat einen sichtbaren
      Schalter" und Tag 3 „Sounds müssen leise starten". Das Modell macht daraus „aus und fast
      stumm". Vorschlag: im Kern konkrete Werte statt „leise" (Geräusche etwa 0,15–0,25, Musik
      etwa 0,06–0,10, Gesamtregler), Ton-Schalter groß und eindeutig; zu entscheiden: Ton nach
      dem Startknopf **an** (empfohlen, mit Schalter) oder weiter standardmäßig aus. Zusätzlich
      prüfen: iPad-Stummschaltung dämpft Web Audio.
- [ ] **Für Codex (Material), Lernfall:** Der Auftrag hat jetzt fünf Regeln (faule Äpfel), der
      Ablauf läuft über die Geräte der Gruppen und die Stufen der Lehrkraft, nicht mehr über
      einen QR-Code — falls das Material den Lernfall erwähnt, bitte daran ausrichten.
- [ ] **Vorab-Bestätigung von KI-Ergänzungen** als Option für höhere Stufen (heute: sichtbar machen
      und nachträglich herausnehmen) — nicht gebaut, bewusst.

## Gesammelt für den nächsten Build (2026-08-12): Eigener Generierungs-Harness

Peters Anstoß: Wir nutzen nur einen Metaprompt und rufen die APIs ohne echten Harness.
Ist-Stand im Code: `generate.ts` hat bereits DOM-Stub-Verifikation + genau EINEN
Reparaturversuch — aber jeder Edit generiert das komplette HTML neu, ohne statische
Vorprüfung, ohne Mehrrunden-Schleife, ohne messbare Qualität. Vorschlag: schlanker
eigener Harness in `src/lib/harness/` (~300 Zeilen, KEIN LangChain/Framework),
anbieterneutral über die bestehende `llm.ts`-Abstraktion. In Prioritätsreihenfolge:

- [ ] **1. Prüf-Reparatur-Schleife ausbauen** (größter Qualitätsgewinn):
      Statik-Linter VOR der Sandbox (fetch/XHR/WebSocket/externe URLs verboten,
      localStorage nur mit try/catch, Datei vollständig?) — billige Fehler kosten
      dann keinen teuren Modell-Aufruf. DOM-Stub erweitert um Konsolen-Capture
      (nicht nur Crash, auch error-Logs), Checkliste aus der Qualitätsuntergrenze
      von `kern.md` maschinell (Neustart ohne Reload? Touch-Handler? Canvas da?).
      Bis zu 2 Reparaturrunden, jede mit konkretem Befund statt nur Crash-Text.
- [ ] **2. Patch-Edits statt Voll-Neugenerierung**: Bei Änderungswünschen liefert das
      Modell SEARCH/REPLACE-Blöcke statt der ganzen Datei — strukturell erzwungenes
      „Bestehendes bewahren", drastisch weniger Output-Tokens (zahlt direkt auf die
      Token-Transparenz und die Spar-Challenge ein), schnellere Builds für die Kinder.
      Als strukturierte Textausgabe, kein Tool-Calling — funktioniert damit bei allen
      Anbietern (auch Ollama). Fallback: wenn Patches nicht greifen, Voll-Generierung.
- [ ] **3. Spielsteckbrief als echtes Artefakt**: `spec.json` neben dem HTML (heute nur
      HTML-Kommentar) — Titel, Mechanik, Steuerung, offene Wünsche, Fehlerhistorie.
      Der Harness füttert das Modell mit Spec + letzten Wünschen + letztem Befund
      statt „alles im Prompt"; Spec wird pro Runde fortgeschrieben und versioniert
      (passt zu Snapshots/Zeitreise).
- [ ] **4. Eval-Suite aus echten Kinderwünschen**: Golden-Prompts aus dem PromptLog
      (anonym, typische kurze Wünsche) als Regressionslauf: `scripts/eval.ts` baut
      N Spiele, führt Linter+DOM-Stub+Checkliste aus und schreibt eine Ergebnis-
      Matrix. Damit werden Metaprompt-/Harness-Änderungen MESSBAR statt gefühlt —
      vor jedem Release ein Lauf. Kostenkontrolle über eigenen Key + Budget.
- [ ] **5. Harness-Phasen sichtbar machen**: Fortschritt (verstehe → baue → prüfe →
      repariere) in der Kinder-Warteanzeige und im Lehrer-Verlauf („2. Versuch nötig,
      Grund: …") — PromptLog um Rundenzahl/Befunde erweitern.

**Bewusst NICHT** (Nicht-bauen-Liste): kein Framework (LangChain & Co.), kein
Multi-Agent-Aufbau, kein Vision-/Screenshot-Check (teuer; höchstens später für den
Director's Cut), kein RAG. Der Harness bleibt ein handgeschriebener Loop.

## Sofort möglich

- [ ] **Release erstellen** — Druck-Redesign + Materialpaket 2 sind gepusht und deployt
      (2026-08-05); das `latest`-GHCR-Image stammt aber noch von v1.0.1. Ein neues
      Release (Tag + Changelog) erst auf Peters Ansage.

## Offen bei Peter (Entscheidung oder Zugang nötig)

- [ ] **Echte Spiel-Generierung testen** — Verbindung mit gültigem Schlüssel im Admin anlegen,
      `Testen` drücken, dann in einer Gruppe wirklich bauen lassen. Bisher ist der Weg nur
      bis zum Anbieter verifiziert (korrekter 401 mit Dummy-Schlüssel), nie mit echtem Ergebnis.
- [ ] **Repo öffentlich schalten?** AGPL-Lizenz und Selbstbau-Anleitung liegen bereit.
- [ ] **Alte Kopie `sapitvet/studio45`** — löschen oder behalten?
- [ ] **DSGVO/Schulrecht** vor dem ersten Einsatz an einer fremden Schule: AVV nötig?
      Hosting-Standort? (Kinder bleiben anonym, aber Lehrkraft-Daten und Schulnamen fallen an.)
- [ ] **Passwort des Admin-Kontos** wechseln, falls es in dem kurzen Zeitfenster ohne TLS
      auch anderswo genutzt wird.

## Erledigt (gebaut am 2026-10-11)

- [x] **Regler pro Gruppe** — `Group.supportLevel` / `Group.helpLevel` (leer = wie Workshop,
      Migration `20261011090000`, nur ADD COLUMN); `wirksameStufen()` in `audience.ts` ist die
      eine Stelle, die alle fragen (Schüler-Seite, Coach, Generierung). Lehrkraft stellt auf der
      Gruppenkarte ein (speichert sofort, Markierung „eigene Einstellung"); in den
      Workshop-Einstellungen steht, welche Gruppen abweichen, mit Knopf „Alle Gruppen auf
      Workshop-Einstellung" (Rückfrage). Hat der Workshop eine eigene KI-Anweisung, wird der
      Spielraum der Gruppe angehängt. Die Schüler-Seite bekommt nur die Schalter, keine Stufe.
      Hinweis bei der Token-Spar-Challenge, wenn Gruppen unterschiedlichen Spielraum haben.
      Der Mock-Anbieter protokolliert jetzt, welcher Spielraum im Auftrag stand.
      Deployt am 2026-10-11 (Server meldet `v1.1.0-20-g21a18a7`).

## Erledigt (gebaut am 2026-10-10)

- [x] **Spielprüfung isoliert (Review „kritisch")** — drei Schichten: (1) Vorprüfung ohne
      Ausführung in `src/lib/verify.ts` (lehnt `process.…`, `require(`, `import(`, `node:`,
      `eval(`, Function-Konstruktor ab); (2) gehärteter Prüflauf `runtime/pruef-lauf.mjs`
      (leere Umgebung, `--permission`, Speicher-/Zeitlimit; der Stub entfernt `process`/`fetch`);
      (3) eigener Prüf-Container `pruefer` (`runtime/pruefer.mjs`) im internen Docker-Netz ohne
      Ausgang, read-only, ohne Daten. Höchstens 3 Prüfläufe gleichzeitig. Fällt der Prüfdienst
      aus, gibt es keinen stillen Rückfall, keine Reparaturrunde und eine eigene Meldung.
      Nachgewiesen: im Server-Container (Node 22) blockiert das Permission-Model Dateien,
      Schreiben, Kindprozesse, Worker — das Netz nicht (dafür Schicht 3); Angriffsspiel des
      Mock-Anbieters (`MOCK_ANGRIFF=1`) wird abgelehnt. **Schicht 3 ist noch nicht auf dem
      Server gelaufen** (lokal als Prozess getestet, Compose-Datei nur syntaktisch geprüft).
- [x] **Regler getrennt (Review „Sprachhilfe ≠ Spielraum")** — `supportLevel` ist jetzt nur noch
      der Spielraum der KI (Leitplanken, 1 weit … 5 eng), neu `helpLevel` 0–3 für die Hilfe beim
      Formulieren (Impulse, Formulierungshilfe, Team-Check). Migration `20261010090000` leitet
      den neuen Wert aus dem alten ab (nur ADD COLUMN).
- [x] **KI-Ergänzungen sichtbar** — der Steckbrief führt `von_der_gruppe` / `von_der_ki`
      (`prompts/kern.md`), `src/lib/steckbrief.ts` liest sie, die Schüler-Seite zeigt sie nach
      jedem Bau und unter „Was kam von uns — was von der KI?"; „Wollen wir nicht" schreibt den
      Rücknahme-Wunsch ins Eingabefeld. Die Liste schreibt das Modell selbst — ob echte Modelle
      sie zuverlässig führen, ist erst mit einem echten Lauf belegt.
- [x] **Director's Cut mit Zustimmung der Gruppe** — Lehrkraft legt die Beschreibung vor, die
      Gruppe antwortet auf ihrem Gerät mit Ja/Nein (+ Hinweis); gebaut wird nur die zugestimmte
      Fassung. „Ohne Abstimmung bauen" bleibt möglich und steht im Audit-Log.
- [x] **Lernfall „Klarer Auftrag, fehlerhaftes Ergebnis"** — vorbereitetes Spiel
      (`runtime/lernfall.html`) mit drei Abweichungen vom Auftrag; die „reparierte" zweite Fassung
      behebt nur zwei. Seite für Gruppen/Beamer `/w/<slug>/lernfall`, Lehrkraft-Seite mit Ablauf
      und Lösung `/lehrer/<id>/lernfall`. Verhalten beider Fassungen per Simulation bestätigt.
- [x] **Getrennte Worktrees** für Claude und Codex (Regeln in `AGENTS.md`).

## Erledigt (gebaut am 2026-09-20)

- [x] **Lasttest „10 Gruppen parallel"**: Mock-Anbieter `runtime/mock-ki.mjs` (OpenAI-
      Protokoll mit SSE-Streaming, einstellbare Bauzeit, Fehler- und 429-Quote), festes
      Testspiel `runtime/mock-spiel.html`, Compose-Overlay `docker-compose.lasttest.yml`,
      Seed `runtime/lasttest-seed.mjs` (rohes SQLite, `--entfernen`), Treiber
      `scripts/lasttest.ts` (10 Tablets mit eigenem Gerätecookie, State-Polling, Beamer,
      `docker stats` per SSH, Urteil GRÜN/ROT). Lokal verifiziert: 10/10 Builds in einer
      Runde, p95 der Kinder-App 88 ms; mit 50 % kaputten Antworten greifen die
      Reparaturrunden (Tokens verdoppeln sich sichtbar), Urteil korrekt ROT.
      **Gegen den Server noch nicht gefahren** — braucht den Deploy dieser Dateien.
- [x] **Versionsanzeige**: `build-info.json` (git describe, Commit, Bauzeit) via
      `scripts/build-info.mjs` in deploy.sh, CI und Dockerfile; `src/lib/version.ts`,
      `GET /api/version`, Fußzeile in Login/Lehrer/Admin; OCI-Labels `version`/`revision`;
      `deploy.sh` prüft nach dem Start, ob der Server den gebauten Stand meldet.

## Erledigt (gebaut am 2026-08-11)

- [x] **Beamer-Kopf neu geordnet**: Logo steht abgesetzt als eigenes Element über dem
      Titel (kleinere, dezentere weiße Kachel), Workshop-Name ohne „·"-Anhängsel,
      Klasse als Chip, Tag-Zeile darunter; Kopf bricht auf schmalen Screens sauber um.
- [x] **Gruppen-Karten der Beamer-Seite sind klickbar** — öffnen das Studio in neuem
      Tab (fürs interaktive Whiteboard), mit Hover-Effekt und Hinweis „oder antippen".
- [x] **Druckmaterialien: Logo abgesetzt** als eigene Zeile über der Kopfzeile
      (`.kopf-logo`, 10 mm hoch); Höhenbudgets der engen Blätter nachgezogen
      (Rollenkarten, Bugreport-Karten, Notizen), per PDF-Härtetest mit Testlogo
      verifiziert — alles bleibt exakt eine A4-Seite.

- [x] **Design-Refresh „Werkbank"**: Der schwerste Fund zuerst — `--font-sans` war in
      `globals.css` zirkulär definiert und löste nie auf, die gesamte App renderte in
      der Browser-Serifenschrift. Jetzt selbst gehostet via fontsource: **Inter** für
      Lehrer/Admin/Druck, **Nunito** (`--font-kind`) für Kinder-Studio und Beamer.
      Farbwelt: Indigo `#4338ca` als Produktfarbe, Amber als Akzent, warme
      Stone-Neutrale statt farblosem Grau (das alte Theme hatte 0 Chroma — buchstäblich
      farblos). App-Gefühl: Indigo-Kopfleiste mit Wortmarke (Amber-45), Login als
      Markenfläche, Phase als farbiger Status-Chip, Budget-Balken in Ampellogik
      (grün/amber/rot), Versuche als gefüllte Amber-Punkte. Workshop-Branding der
      Schulen färbt Kinder-Studio/Beamer/Materialien unverändert weiter.
      Offen als Feinschliff-Ideen: leere Zustände mit Illustration, Lucide-Icons statt
      Emoji im Chrome, dedizierte Hover-Zustände.

## Erledigt (gebaut am 2026-08-06)

- [x] **Token-Transparenz**: Lehrer-Dashboard zeigt das Budget jetzt absolut
      (Tokens verbraucht/gesamt, optional in €) und pro Gruppe Gesamt-Tokens + letzten
      Bau; Warnhinweis ab 85 % Budget. Kinder-App zeigt unter der Eingabe „Letzter Bau ·
      Gesamt" mit antippbarem ⓘ: Dialog mit Tokens, €-Kosten und **Energie-Vergleich**
      (≈ Handy laden / Minuten Radfahren / LED-Stunden — als grobe Schätzung
      gekennzeichnet). Preise (€/1M Tokens Ein-/Ausgabe) und Energie-Faktor (Wh/1M,
      Standard 100) pflegt der Admin an der KI-Verbindung; ohne Preise keine €-Anzeige.
      **Token-Spar-Challenge** pro Workshop zuschaltbar (Einstellungen-Reiter):
      Rangliste der sparsamsten Gruppen in Fußzeile + Dialog der Kinder-App.
      Rechenkern in `src/lib/verbrauch.ts`; Migration `20260806090000_verbrauch`
      (nur ADD COLUMN). Fehlbuilds kosten weiterhin keinen Versuch.

## Erledigt (gebaut am 2026-08-05)

- [x] **Fünf neue Materialblätter**: „Wie rede ich mit der KI?" (fünf Regeln, Gut/Schlecht-
      Beispiel, „Erst denken, dann tippen") · Laufplan (Rotations-Tabelle Termine × Rollen
      zum Eintragen) · Lehrer-Laufzettel (Vorbereitung + alle Termine + Achtungspunkte auf
      einer Seite) · Testbogen „gut / noch nicht" (Peer-Testing, Zwei Sterne und ein Wunsch) ·
      Bugreport-Karten (2 Schnittkarten mit Detektiv-Fragen und neuem, genauerem Wunsch).
- [x] **Rollenkarten erweitert**: je Rolle jetzt „Das machst du" (drei konkrete Schritte)
      plus Tipps.
- [x] **Test-Tag & Release-Tag** im 5-Termine-Format: Tag 4 testet (iPads tauschen,
      Bugreports, Fixes), Tag 5 released (Feinschliff, Präsentation am Beamer, Urkunden).
      Umgesetzt in Titeln + Merksätzen (`prompts.ts`), neuem Tagesfokus
      `prompts/day-4-test.md` (ersetzt `day-4-challenge.md`), Tages-Chips aller drei
      Altersstufen (`audience.ts`) und eigenen 45-Minuten-Abläufen der Termin-Seiten.
      Das 3-Tage-Format bleibt unverändert (eigener Schlusssatz, eigene Laufzettel-Zeile).

- [x] **Druckmaterialien neu aufbereitet** — gemeinsames Gestaltungssystem in `print.css.ts`
      (Typo-Skala, Kopf mit Akzentlinie, Fußzeile mit Seitenzahl, Kasten/Merksatz/Schreib-
      linien/Ankreuzfelder, `print-color-adjust`), exakte A4-Geometrie: jedes Blatt ist genau
      eine Seite, Umbruch per `break-before` (kein Leerseiten-Bug mehr). Im Einzelnen:
      Rollenkarten mit Schnittlinien + Scherensymbol · Thementafeln als echte Querformat-
      Plakate (`@page landscape` pro Dokument) · QR-Blätter mit Schrittfolge 1-2-3 ·
      Stundenverläufe **eine Seite pro Termin** (Merksatz, Minutenplan, Checkliste, Notizen)
      plus Methodenseite · Ich-kann-Bogen mit Ausmal-Kreisen · Elternbrief in Briefform ·
      Urkunde mit Serifenschrift und Doppelrahmen. Farbe kommt aus Akzentlinien statt
      Vollflächen (tonerfreundlich, keine Folien-Optik); Grundschul-Workshops bekommen
      rundere Ecken (`verspielt`).
- [x] **`scripts/druck-pdf.ts`**: rendert alle Blätter per Headless-Chrome (CDP
      `printToPDF` mit `preferCSSPageSize` — das CLI-Flag `--print-to-pdf` ignoriert
      `@page`-Größen!) und prüft Seitenmaße + Seitenzahlen hart gegen A4.

## Erledigt (gebaut am 2026-08-04)

- [x] **Altersstufe pro Workshop** (Grundschule / Klasse 5–10 / Klasse 10–13) — Optik, Ansprache,
      Chips und Metaprompt hängen daran; die Lehrkraft stellt sie in den Workshop-Einstellungen ein.
- [x] **Metaprompt neu aufgebaut**: fester Kern (`prompts/kern.md`) mit Ausgabeformat, Sandbox-Grenzen,
      Kinderschutz, Qualitätsuntergrenze, Lückenfüll-Rangfolge, wohlwollender Deutung von
      Spracherkennung, Anti-Mustern und **Spielsteckbrief** als Gedächtnis in der Datei.
- [x] **Unterstützungslevel 1–5** ersetzt das dreistufige `guidance` und steuert Oberfläche *und*
      KI-Verhalten (Lückenfüllen, Überraschungs-Budget, Chips, Team-Check, Formulierungshilfe).
- [x] **Preprompt sichtbar und anpassbar**: Reiter „KI-Anweisung" zeigt alle Blöcke mit Herkunft;
      die didaktische Zone ist editierbar und zurücksetzbar, der Kern bleibt fest.
- [x] **Prompt-Coach**: schlägt bei kurzen Wünschen eine genauere Fassung vor (zum Übernehmen,
      Bauen oder Verwerfen) — zählt nicht gegen das Kontingent.

Offen daraus: **Trockenlauf** („Prompt testen" mit Beispielwunsch), **Prompt als Vorlage speichern**,
Staffelung des Unterstützungslevels über die Termine.

## Ideen aus der Konzeptphase, noch nicht gebaut

- [ ] **Lernziel-Presets pro Fach** (Mathe 4, Sachkunde, Englisch …) statt nur Freitext —
      war im Piloten vorhanden, in Studio45 bisher nur das freie Lernziel-Feld.
- [ ] **Workshop-Vorlagen / Template-Galerie**: fertige Workshops zum Übernehmen.
- [ ] **Onboarding-Wizard** für die Lehrkraft (5 Fragen → fertiger Workshop inkl. Druckpaket).
- [ ] **Workshop-Archiv als ZIP-Export** (Spiele + Verlauf + Urkunden) zur Übergabe an die Schule.
- [ ] **Zeitreise für die Kinder** — Snapshots wiederherstellen können bisher nur Lehrkräfte.
- [ ] **i18n** — Struktur ist vorbereitet, Oberfläche ist bisher rein deutsch.
- [ ] **Hub-Welt: Personen frei benennen** (im Piloten standen echte Lehrkräfte vor den Ständen;
      generisch heißen die Figuren jetzt nach dem Studio).

## Beobachtungen aus dem Bau (kein Auftrag, nur notiert)

- [ ] **Prompt-Verlauf exportieren** (PDF/CSV) — nützlich für die Reflexionsrunde und für
      Elternabende.
- [ ] **Ratenbegrenzung liegt im Arbeitsspeicher** — bei mehreren Instanzen hinter einem
      Load-Balancer wirkt sie pro Instanz. Für den Ein-Container-Betrieb egal.
- [ ] **Modell-Liste vom Anbieter laden** (`/models`) statt Vorschlagsliste — funktioniert
      aber nicht bei jedem Dienst.
- [ ] **Automatische Sicherung** des `/data`-Volumes auf dem Server (aktuell keine).
- [ ] **Druckseiten rendern ein eigenes `<html>` innerhalb des Root-Layouts** — erzeugt
      eine (rein kosmetische) Hydration-Warnung im Dev-Overlay. Sauber wäre eine
      Route-Group mit eigenem Root-Layout für `/druck`; Druckausgabe ist nachweislich
      korrekt, daher nur notiert.
