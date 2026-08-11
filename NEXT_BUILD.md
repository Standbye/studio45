# Studio45 — Sammelliste

> **Arbeitsweise:**
> 1. Neue Anforderungen und Ideen werden hier nur **notiert**. Gebaut wird ausschließlich
>    auf ausdrückliches Kommando von Peter — nichts aus dieser Liste wird ungefragt umgesetzt.
> 2. **Releases und Versions-Tags nur auf Ansage.** Auch nach einem fertigen Fix wird kein
>    Release erstellt, bis Peter es sagt.

Stand: 2026-08-04 · Live: https://studio45.littleproject.de · Repo: `Standbye/studio45`

---

## Gesammelt für den nächsten Build (2026-08-11): Design-Refresh

Peters Eindruck: wirkt „lieblos und zu steril", soll mehr wie eine App wirken, mit gutem
Farbkonzept. Diagnose + Plan:

- [ ] **Font-Bug beheben (Ursache Nr. 1 der Sterilität!)**: `globals.css` definiert
      `--font-sans: var(--font-sans)` — zirkulär, löst nie auf; es wird nirgends eine
      Schrift geladen. Die GESAMTE App (auch Kinder-Seite und Beamer) rendert in der
      Browser-Serifenschrift (Times-Optik). Fix: Schrift per `next/font` selbst hosten
      (keine externen Requests, Offline-Prinzip!) und `--font-sans` korrekt verdrahten.
      Vorschlag: **Inter** für Lehrer/Admin, für Kinder-Flächen ggf. **Nunito** (runder,
      freundlicher) als `--font-kind`.
- [ ] **Produkt-Farbkonzept** (Studio45-Marke — unabhängig vom Workshop-Branding, das
      Kinder-UI/Beamer/Materialien weiter färbt). Drei Richtungen vorgestellt:
      **A „Werkbank" (Empfehlung)**: Indigo `#4338CA` als Primärfarbe, Amber `#F59E0B`
      als Akzent, warme Neutrale (Stone statt Zinc: Hintergrund `#FAFAF9`, Text `#292524`)
      — professionell genug für Lehrkräfte, mit sichtbarer Spielfreude.
      **B „Schulhaus"**: Petrol `#0F766E` + Koralle `#E8604C` + Creme `#FAF7F0`.
      **C „Arcade"**: Violett `#7C3AED` + Cyan `#06B6D4`, dunkle Kopfleiste `#241D3D`.
      Umsetzung als shadcn-Theme-Tokens (CSS-Variablen in `globals.css`), damit alles
      durchgängig zieht.
- [ ] **App-Gefühl im Lehrer-/Admin-Bereich**:
      - Farbige Kopfleiste mit Logo/Wortmarke statt weißem Balken; aktive Navigation.
      - Karten mit etwas mehr Radius, weichem (dezentem) Schatten und Hover-Zustand.
      - Status sichtbar machen: Phase als farbiger Chip (Plenum/Studio/Pause), Budget-
        Balken in Ampellogik, Versuche als gefüllte Punkte statt „4/4"-Text.
      - Leere Zustände mit freundlichem Text + kleiner Illustration statt nackter Tabelle.
      - Login-Seite mit Markenauftritt (Farbfläche, Wortmarke, ein Satz, was Studio45 ist).
      - Icons konsistent (Lucide ist über shadcn da) statt Emoji-Streusel im Chrome;
        Emoji bleiben bewusst in kindgerichteten Texten.
- [ ] **Abgrenzung**: Kinder-Studio behält das Workshop-Branding als Hauptfarbe —
      der Design-Refresh gibt ihm nur die reparierte Schrift und Feinschliff
      (Abstände, Radien aus `audience.ts` bleiben führend).

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
