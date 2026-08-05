# Studio45 — Sammelliste

> **Arbeitsweise:** Neue Anforderungen und Ideen werden hier nur **notiert**.
> Gebaut wird ausschließlich auf ausdrückliches Kommando von Peter — nichts aus
> dieser Liste wird ungefragt umgesetzt.

Stand: 2026-08-04 · Live: https://studio45.littleproject.de · Repo: `Standbye/studio45`

---

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

## Vorgemerkt

### Altersstufe pro Workshop — Design und Ansprache anpassen

Die Kinder-Oberfläche ist derzeit fast so nüchtern wie der Lehrerbereich (weiß, dezent,
shadcn-Optik). Für eine 4. Klasse ist das zu erwachsen; für eine Oberstufe wäre kindliche
Gestaltung dagegen peinlich. Deshalb eine **Einstellung „Altersstufe"** am Workshop mit drei
Stufen: **Grundschule · Klasse 5–10 · Klasse 10–13**.

Was daran hängen sollte:

- **Optik der Kinder-/Schüler-Seite**: Grundschule verspielt (kräftige Farben, große runde
  Flächen, Emoji, kleine Animationen, große Schrift); Mittelstufe freundlich, aber sachlicher;
  Oberstufe reduziert und „echtes Werkzeug"-Look, näher am Entwickler-Alltag.
- **Ansprache und Texte**: „Was soll die KI bauen?" vs. „Was möchtest du ändern?" —
  Wartesprüche, Hinweise, Fehlermeldungen, Team-Check-Fragen.
- **Prompt-Chips**: einfache Satzanfänge für die Kleinen, offenere Impulse für die Großen.
- **Systemprompt der Spiel-Generierung**: Anspruch, Mechaniktiefe und Textniveau im Spiel
  selbst (bisher fest auf Grundschule gemünzt: „4. Klasse", große Touch-Flächen, sehr einfache
  Sprache).
- **Merksätze und Reflexionsfragen**: bei Älteren dürfen Themen wie Trainingsdaten,
  Halluzinationen und Urheberrecht dazukommen.
- **Materialien**: Rollenkarten, Thementafeln, Ich-kann-Bogen und Elternbrief in der Sprache
  der jeweiligen Stufe (bei Oberstufe eher „Infoblatt" als „Elternbrief").
- **Standardwerte**: Grundschule kürzere Sessions und mehr Führung, Oberstufe mehr Versuche
  und weniger Denkpause.

Technisch: ein Feld `ageGroup` am Workshop, ein Theme-/Textbaustein-Satz pro Stufe
(vermutlich als eigene Datei analog `src/lib/providers.ts`), und der Systemprompt bekommt
einen stufenabhängigen Block. Die Branding-Farben der Schule bleiben davon unberührt.

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
