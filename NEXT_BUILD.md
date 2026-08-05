# Studio45 — Sammelliste

> **Arbeitsweise:**
> 1. Neue Anforderungen und Ideen werden hier nur **notiert**. Gebaut wird ausschließlich
>    auf ausdrückliches Kommando von Peter — nichts aus dieser Liste wird ungefragt umgesetzt.
> 2. **Releases und Versions-Tags nur auf Ansage.** Auch nach einem fertigen Fix wird kein
>    Release erstellt, bis Peter es sagt.

Stand: 2026-08-04 · Live: https://studio45.littleproject.de · Repo: `Standbye/studio45`

---

## Sofort möglich

- [ ] **Produktion auf 1.0.1 bringen** — der Lesbarkeits-Fix (helle Marken-Farben) ist gebaut,
      getestet, released und als Image verfügbar; `studio45.littleproject.de` läuft aber noch
      auf dem Stand davor. Ein Deploy dauert ~2 Minuten. Praktisch relevant nur, wenn jemand
      einen sehr hellen Hauptton einstellt — der Demo-Workshop nutzt die Standardfarben.

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
