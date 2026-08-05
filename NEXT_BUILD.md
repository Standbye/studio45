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

**Die Altersstufe stellt die Lehrkraft selbst ein** (Workshop-Einstellungen, neben Lernziel
und Führungslevel) — sie kennt ihre Klasse. Aus der Einstellung leitet sich unmittelbar der
Metaprompt ab, siehe nächster Abschnitt.

### Metaprompt neu aufbauen — gute Spiele trotz karger Eingaben

**Das Kernproblem:** Kinder sagen „mach ein spiel mit einem drachen" und erwarten ein fertiges
Spiel. Nachfragen kann das System nicht (die Oberfläche ist ein Einbahn-Kanal, und Rückfragen
würden den knappen 45-Minuten-Takt sprengen). Der Metaprompt muss aus drei Worten also ein
vollständiges, spielbares, altersgerechtes Spiel machen — und trotzdem die Idee der Kinder
erkennbar lassen. Vorschlag in Bausteinen:

**1. Lücken füllen statt nachfragen — mit fester Rangfolge.**
Ein eigener Abschnitt „Wenn Informationen fehlen": (a) Was schon im Spiel existiert, bleibt
und gibt die Richtung vor. (b) Danach greifen Genre-Konventionen des genannten Themas
(Drache → fliegen, Feuer, Schätze sammeln). (c) Erst dann altersabhängige Standards. Die KI
**trifft eine konkrete Entscheidung** und stellt keine Rückfrage — falsch geratene Details
korrigieren die Kinder in der nächsten Runde, und genau das ist der Lerneffekt.

**2. Qualitätsuntergrenze, die unabhängig vom Input immer gilt.**
Checkliste im Prompt, die jedes Spiel erfüllen muss: Startbildschirm mit Titel · sofort
verständliches Ziel · jede Aktion gibt sofort sichtbares Feedback · Sieg- **und**
Verlierbedingung · Neustart immer erreichbar · keine Sackgassen · lesbar auf Armlänge
(Mindestgrößen) · Touch-Flächen groß genug · Ton abschaltbar · nichts Externes.
Damit ist auch das Ergebnis eines Ein-Wort-Prompts nie ein Fragment.

**3. Ein „Überraschungs-Budget".**
Die KI darf **genau eine** kleine Sache ergänzen, die niemand verlangt hat (Idle-Animation,
Partikel beim Treffer, ein witziger Sound, ein verstecktes Detail). Das erzeugt den
Wow-Moment, wenn nur drei Worte kamen — begrenzt auf eine Sache, damit die Vision der Kinder
nicht überschrieben wird.

**4. Spielsteckbrief als Gedächtnis im Spiel selbst.**
Die KI legt einen maschinenlesbaren Kommentarblock in die HTML-Datei (Titel, Figur, Ziel,
Steuerung, Siegbedingung, Stil, Lernaufgaben-Einbau, bereits umgesetzte Wünsche). Bei der
nächsten Änderung liest sie ihren eigenen Steckbrief mit — dadurch bleibt die Linie erhalten,
auch wenn der neue Wunsch nur „mach es grün" lautet. Nebeneffekt: Die Lehrkraft kann im
Verlauf sehen, wie die KI das Spiel *verstanden* hat.

**5. Wohlwollende Interpretation von Spracherkennung.**
Der Prompt bekommt einen Abschnitt zu typischen Verhörern der deutschen Diktat-Erkennung und
zur Regel: erst sinnvoll deuten, dann bauen — niemals wörtlich Unsinn umsetzen.

**6. Anti-Muster ausdrücklich verbieten.**
Textwände, Tastatursteuerung, Mini-Buttons, „Game Over" ohne sofortigen Neustart,
Schwierigkeit, die frustriert statt reizt.

**7. Altersblock aus der Lehrer-Einstellung.**
Wortschatz, Lesemenge, Mechaniktiefe, Anspruch der Lernaufgaben und visueller Stil kommen aus
`ageGroup`. Der heutige Prompt ist fest auf „4. Klasse" gemünzt — das muss heraus und
stufenabhängig werden, sonst bekommt eine 10. Klasse trotz erwachsener Oberfläche ein
Kindergarten-Spiel.

**8. Optionaler Prompt-Coach in der Schüler-Oberfläche** (didaktisch der stärkste Hebel):
Ist der Wunsch sehr knapp, zeigt Studio45 vor dem Bauen eine **ausformulierte Fassung**
(„So könnte man es genauer sagen: …") zum Übernehmen, Ändern oder Verwerfen. Die Kinder
sehen dadurch am eigenen Beispiel, was ein guter Prompt ist — das ist Unterricht, nicht nur
Technik. Kostet einen zusätzlichen, kleinen Modellaufruf; als Schalter pro Workshop denkbar
(passt zum bestehenden Führungslevel).

Offene Frage für den Bau: ob die Anreicherung in **einem** Aufruf passiert (billiger) oder in
zwei Schritten „Wunsch verstehen → Spiel bauen" (deutlich bessere Ergebnisse bei kargem Input,
doppelte Kosten). Vorschlag: zweistufig nur im geführten Modus und bei sehr kurzen Eingaben.

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
