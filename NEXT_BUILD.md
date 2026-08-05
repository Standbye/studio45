# Studio45 — Sammelliste

> **Arbeitsweise:**
> 1. Neue Anforderungen und Ideen werden hier nur **notiert**. Gebaut wird ausschließlich
>    auf ausdrückliches Kommando von Peter — nichts aus dieser Liste wird ungefragt umgesetzt.
> 2. **Releases und Versions-Tags nur auf Ansage.** Auch nach einem fertigen Fix wird kein
>    Release erstellt, bis Peter es sagt.

Stand: 2026-08-04 · Live: https://studio45.littleproject.de · Repo: `Standbye/studio45`

---

## Sofort möglich

- [ ] **Druck-Redesign pushen** — der Neusatz der Druckmaterialien (2026-08-05) liegt als
      lokaler Commit vor und ist per rsync zum Testen auf dem Server (damit läuft dort
      auch der 1.0.1-Lesbarkeits-Fix). Auf Peters Ansage: „kein deployment auf github" —
      Push und Release erst auf Kommando; GHCR-Image ist entsprechend noch alt.

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

## Erledigt (gebaut am 2026-08-05, lokaler Commit — noch nicht gepusht)

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

- [ ] **Kosten in Euro statt Tokens** anzeigen — Tokenzahlen sagen einer Lehrkraft wenig.
      Bräuchte hinterlegte Preise pro Modell.
- [ ] **Budget-Warnung** an die Lehrkraft, bevor es aufgebraucht ist (z. B. ab 85 %).
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
