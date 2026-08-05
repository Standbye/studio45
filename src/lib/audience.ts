/**
 * Zielgruppe und Unterstützungslevel — die zwei Regler der Lehrkraft.
 *
 * Beide wirken an drei Stellen zugleich: im Metaprompt (wie die KI baut), in der
 * Schüler-Oberfläche (Optik, Ansprache, Hilfen) und in den Standardwerten.
 * Alles, was sich zwischen einer 4. Klasse und einer 10. unterscheidet, steht hier
 * — und nirgendwo sonst verstreut.
 */

import type { AgeGroup } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Altersstufen
// ---------------------------------------------------------------------------

export type AltersProfil = {
  id: AgeGroup;
  name: string;
  klassen: string;
  /** Vorschlag für das Unterstützungslevel */
  levelVorschlag: number;
  /** Optik der Schüler-Oberfläche */
  optik: {
    /** Verspieltheit: rundere Ecken, größere Flächen, mehr Emoji */
    verspielt: boolean;
    radius: string;
    grundschrift: string;
    knopfHoehe: string;
    emojiImKopf: boolean;
    animationen: boolean;
  };
  /** Ansprache in der Oberfläche */
  texte: {
    eingabeHinweis: string;
    bauKnopf: string;
    wartenTitel: string;
    fertig: string;
    plenum: string;
    tipp: string;
  };
  /** Satzanfänge/Impulse je Tag */
  chips: Record<number, string[]>;
  /** Block für den Metaprompt */
  promptBlock: string;
};

export const ALTERSSTUFEN: Record<AgeGroup, AltersProfil> = {
  GRUNDSCHULE: {
    id: "GRUNDSCHULE",
    name: "Grundschule",
    klassen: "Klasse 1–4",
    levelVorschlag: 2,
    optik: {
      verspielt: true,
      radius: "1.5rem",
      grundschrift: "1.125rem",
      knopfHoehe: "4rem",
      emojiImKopf: true,
      animationen: true,
    },
    texte: {
      eingabeHinweis: "Was soll die KI bauen oder ändern?",
      bauKnopf: "Bauen!",
      wartenTitel: "Die KI baut euer Spiel",
      fertig: "✅ Fertig! Testet euer Spiel — was wollt ihr als Nächstes ändern?",
      plenum: "Gerade ist Plenum — schaut nach vorne! 👀",
      tipp: "💡 Gute Wünsche sagen WAS passieren soll und WIE es aussehen soll.",
    },
    chips: {
      1: ["Unser Spiel heißt …", "Die Hauptfigur ist …", "Die Farben sollen … sein", "Wenn man die Figur antippt, soll …"],
      2: ["Man muss … sammeln", "Man muss … ausweichen", "Man gewinnt, wenn …", "Man verliert, wenn …"],
      3: ["Der Hintergrund soll …", "Die Figur soll wackeln, wenn …", "Bei einem Treffer soll es … machen", "Baut Sterne ein, wenn …"],
      4: ["Wir haben einen Fehler gefunden: …", "Repariert bitte: …", "Das war zu schwer: …", "Das war zu leicht: …"],
      5: ["Ein Startbildschirm mit unserem Studio-Namen", "Eine kurze Anleitung für andere Kinder", "Macht unser Spiel fertig zum Zeigen", "Ein Endbildschirm mit Feier"],
    },
    promptBlock: `## Zielgruppe: Grundschule (Klasse 1–4, 6–10 Jahre)

- Sprache: kurze Hauptsätze, vertraute Wörter, kein Fachjargon. Anrede „du"/„ihr".
- Lesemenge: so wenig wie möglich. Symbole und Farben statt Text, wo es geht.
- Mechanik: **eine** Regel, sofort begreifbar. Sammeln, ausweichen, treffen, sortieren.
  Keine Kombinationen aus mehreren Systemen, keine Menüs, keine Inventare.
- Steuerung: Antippen oder Ziehen. Nichts, was Timing im Zehntelsekundenbereich verlangt.
- Schwierigkeit: sehr freundlich. Fehler kosten nie mehr als einen kleinen Rückschritt.
- Optik: kräftige, fröhliche Farben, große runde Formen, Figuren mit Gesicht und Augen.
- Belohnung: viel und sofort — Sterne, Konfetti, fröhliche Töne, Lob in großen Buchstaben.
- Lernaufgaben (falls gewünscht): Zahlenraum und Wortschatz der Grundschule, eine Aufgabe
  pro Bildschirm, Antwortmöglichkeiten als große Knöpfe.`,
  },

  MITTELSTUFE: {
    id: "MITTELSTUFE",
    name: "Mittelstufe",
    klassen: "Klasse 5–10",
    levelVorschlag: 3,
    optik: {
      verspielt: false,
      radius: "0.75rem",
      grundschrift: "1rem",
      knopfHoehe: "3.25rem",
      emojiImKopf: true,
      animationen: true,
    },
    texte: {
      eingabeHinweis: "Was soll geändert oder ergänzt werden?",
      bauKnopf: "Bauen",
      wartenTitel: "Dein Spiel wird gebaut",
      fertig: "✅ Fertig — probiert es aus. Was fällt euch auf?",
      plenum: "Plenum — bitte nach vorne schauen.",
      tipp: "Je genauer die Beschreibung, desto näher am Ziel: WAS passiert, WIE sieht es aus, WANN gewinnt man?",
    },
    chips: {
      1: ["Titel und Hauptfigur", "Setting/Umgebung", "Farbstimmung", "Erste Interaktion"],
      2: ["Spielregel", "Gewinnbedingung", "Verlierbedingung", "Steuerung"],
      3: ["Optik verbessern", "Sound-Effekte", "Animationen", "Feedback bei Treffern"],
      4: ["Gemeldete Bugs beheben", "Schwierigkeit anpassen", "Test-Feedback umsetzen", "Steuerung verständlicher machen"],
      5: ["Startbildschirm", "Anleitung für neue Spieler", "Abschluss-Bildschirm", "Letzter Feinschliff fürs Publikum"],
    },
    promptBlock: `## Zielgruppe: Mittelstufe (Klasse 5–10, 10–16 Jahre)

- Sprache: normal, sachlich-freundlich, ohne Babytonfall. Anrede „du"/„ihr".
- Mechanik: darf zwei Systeme verbinden (z. B. Sammeln + Ausweichen, Punkte + Zeit).
  Ein Fortschritt über mehrere Level oder Wellen ist erwünscht.
- Steuerung: Touch bleibt Pflicht, Geschicklichkeit darf gefordert sein.
- Schwierigkeit: es soll fordern. Verlieren ist erlaubt, Neustart geht sofort.
- Optik: klarer, moderner Look; kein Kindergarten-Bunt, aber lebendig. Effekte gerne.
- Lernaufgaben (falls gewünscht): Sekundarstufe I, in den Spielfluss eingebaut
  (Tor öffnen, Gegner entwaffnen, Bonus freischalten) statt als vorgeschaltetes Quiz.`,
  },

  OBERSTUFE: {
    id: "OBERSTUFE",
    name: "Oberstufe",
    klassen: "Klasse 10–13",
    levelVorschlag: 4,
    optik: {
      verspielt: false,
      radius: "0.5rem",
      grundschrift: "0.9375rem",
      knopfHoehe: "2.75rem",
      emojiImKopf: false,
      animationen: false,
    },
    texte: {
      eingabeHinweis: "Anforderung eingeben — je präziser, desto besser das Ergebnis.",
      bauKnopf: "Generieren",
      wartenTitel: "Generierung läuft",
      fertig: "Fertig. Testet das Ergebnis und prüft, ob es der Anforderung entspricht.",
      plenum: "Plenum — Eingabe ist gesperrt.",
      tipp: "Präzise Anforderungen enthalten: Verhalten, Darstellung, Randfälle.",
    },
    chips: {
      1: ["Konzept und Kernschleife", "Steuerungsmodell", "Visuelles Konzept", "Zielgruppe des Spiels"],
      2: ["Spielmechanik im Detail", "Zustandsautomat", "Sieg-/Verlierbedingungen", "Balancing-Parameter"],
      3: ["Visuelle Politur", "Audio-Design", "Animation und Übergänge", "Rückmeldung an die Spielenden"],
      4: ["Bugfixes aus dem Peer-Test", "Balancing nach Testeindrücken", "Randfälle absichern", "Usability-Probleme beheben"],
      5: ["Onboarding für fremde Spielende", "Abschluss und Auswertung", "Präsentierbarer Endzustand", "Letzte Politur"],
    },
    promptBlock: `## Zielgruppe: Oberstufe (Klasse 10–13, ab 16 Jahren)

- Sprache: erwachsen und präzise. Kein Kindertonfall, keine übertriebene Ermunterung.
- Mechanik: anspruchsvoll erlaubt — Zustandsautomaten, Ressourcen, Gegnerverhalten,
  mehrere ineinandergreifende Systeme, echte Balancing-Entscheidungen.
- Optik: reduziert und stimmig; ein bewusst gewähltes Farbkonzept schlägt bunt.
- Code: sauber strukturiert und kommentiert — er wird im Unterricht angeschaut und
  besprochen. Sprechende Namen, klare Funktionen, keine Copy-Paste-Blöcke.
- Schwierigkeit: darf fordern; Frustvermeidung durch faire Regeln, nicht durch Weichspülen.
- Lernaufgaben (falls gewünscht): Sekundarstufe II, inhaltlich korrekt und nicht trivial.`,
  },
};

export function alterProfil(id: AgeGroup): AltersProfil {
  return ALTERSSTUFEN[id] ?? ALTERSSTUFEN.GRUNDSCHULE;
}

// ---------------------------------------------------------------------------
// Unterstützungslevel 1–5
// ---------------------------------------------------------------------------

export type SupportProfil = {
  stufe: number;
  name: string;
  kurz: string;
  /** Zeigt die Oberfläche Satz-Chips? */
  chips: boolean;
  /** Team-Check-Dialog vor dem Bauen? */
  teamCheck: boolean;
  /** Ab welcher Kürze (Zeichen) schlägt der Prompt-Coach an? 0 = nie */
  coachAbZeichen: number;
  promptBlock: string;
};

export const SUPPORT_STUFEN: SupportProfil[] = [
  {
    stufe: 1,
    name: "Partner",
    kurz: "Die KI denkt mit und ergänzt großzügig, was fehlt.",
    chips: true,
    teamCheck: true,
    coachAbZeichen: 120,
    promptBlock: `## Unterstützung: Stufe 1 von 5 — die KI denkt mit

Die Klasse braucht viel Rückenwind. Sei ein mitdenkender Partner:

- **Lücken großzügig füllen.** Fehlt etwas, entscheide selbst und baue es aus — Titel, Ziel,
  Gegenspieler, Punkte, Endbildschirm. Die Gruppe soll sich nie fragen, was jetzt passieren
  soll.
- **Überraschungs-Budget:** Du darfst zwei bis drei kleine Extras ergänzen, die niemand
  verlangt hat (Idle-Animation, Konfetti, ein witziges Geräusch, ein verstecktes Detail).
- **Politur inklusive:** Auch ohne Auftrag darfst du Farben harmonisieren, Abstände
  aufräumen und die Lesbarkeit verbessern.
- Der geäußerte Wunsch bleibt trotzdem der Star — er muss im Ergebnis klar erkennbar sein.`,
  },
  {
    stufe: 2,
    name: "Unterstützend",
    kurz: "Die KI ergänzt Fehlendes und macht das Spiel rund.",
    chips: true,
    teamCheck: false,
    coachAbZeichen: 80,
    promptBlock: `## Unterstützung: Stufe 2 von 5 — freundlich unterstützend

- **Lücken füllen**, damit ein rundes Spiel entsteht: Was zum Spielen fehlt, ergänzt du.
- **Überraschungs-Budget:** genau ein kleines Extra, das niemand verlangt hat.
- Kleine Politur (Lesbarkeit, Farbharmonie) ist erlaubt, größere Umbauten nicht.`,
  },
  {
    stufe: 3,
    name: "Ausgewogen",
    kurz: "Die KI ergänzt nur, was zum Spielen nötig ist.",
    chips: true,
    teamCheck: false,
    coachAbZeichen: 40,
    promptBlock: `## Unterstützung: Stufe 3 von 5 — ausgewogen

- **Nur ergänzen, was zum Spielen nötig ist.** Wo der Wunsch offen bleibt, triffst du die
  naheliegendste Entscheidung — mehr nicht.
- **Überraschungs-Budget:** höchstens ein kleines Extra, dezent.
- Keine ungefragte Politur an Stellen, über die nichts gesagt wurde.`,
  },
  {
    stufe: 4,
    name: "Zurückhaltend",
    kurz: "Die KI setzt um, was dasteht — Lücken bleiben sichtbar.",
    chips: false,
    teamCheck: false,
    coachAbZeichen: 0,
    promptBlock: `## Unterstützung: Stufe 4 von 5 — zurückhaltend

- **Setze um, was dasteht.** Ergänze nur das absolut Notwendige, damit die Datei
  vollständig und startbar ist.
- **Kein** Überraschungs-Extra, keine ungefragte Politur.
- Unklare Stellen löst du minimal und erkennbar schlicht — die Gruppe soll merken, dass
  hier eine genauere Ansage gefehlt hat.`,
  },
  {
    stufe: 5,
    name: "Werkzeug",
    kurz: "Die KI macht ausschließlich, was verlangt wird.",
    chips: false,
    teamCheck: false,
    coachAbZeichen: 0,
    promptBlock: `## Unterstützung: Stufe 5 von 5 — reines Werkzeug

- **Führe exakt und ausschließlich aus, was verlangt wird.** Nichts hinzufügen, nichts
  interpretieren, nichts verschönern.
- Fehlt eine Angabe, wähle die schlichteste denkbare Variante — kein Ausschmücken.
- Die Qualitätsuntergrenze aus dem Kern gilt weiterhin: Das Ergebnis ist vollständig und
  startbar. Aber es ist genau so reich, wie die Anforderung war.`,
  },
];

export function supportProfil(stufe: number): SupportProfil {
  return SUPPORT_STUFEN.find((s) => s.stufe === stufe) ?? SUPPORT_STUFEN[2];
}
