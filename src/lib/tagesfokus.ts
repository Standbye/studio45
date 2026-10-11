import type { AgeGroup } from "@/generated/prisma/enums";

/**
 * Worauf liegt heute der Schwerpunkt? Eine Quelle für alles, was der Gruppe dazu gezeigt
 * oder der Formulierungshilfe mitgegeben wird — damit Fokus-Karte, Satzanfänge, Rückfragen
 * und Team-Check dasselbe meinen.
 *
 * Die Zuordnung Termin → Schwerpunkt muss zu `dayFocusPrompt` in prompts.ts passen
 * (dort wählt sie die Anweisung an die KI): fünf Termine = alle Schwerpunkte der Reihe
 * nach; drei Termine = Idee, Spielregel, Fertigmachen.
 */
export type FokusId = "idee" | "mechanik" | "visuals" | "test" | "polish";

const FUENF: FokusId[] = ["idee", "mechanik", "visuals", "test", "polish"];
const DREI: FokusId[] = ["idee", "mechanik", "polish"];

export function fokusDesTages(day: number, totalDays: number): FokusId {
  const liste = totalDays <= 3 ? DREI : FUENF;
  return liste[Math.min(Math.max(day, 1), liste.length) - 1];
}

type FokusProfil = {
  /** Unter dieser Nummer liegen die Satzanfänge in den Altersprofilen (audience.ts) */
  chipsNummer: number;
  /** „Heute geht es um …" in der Sprache der Altersstufe */
  heute: Record<AgeGroup, string>;
  /** Frage im Team-Check vor dem Bauen */
  teamFrage: string;
  /** Hinweis an die Formulierungshilfe: wonach sie heute fragen bzw. wohin sie präzisieren soll */
  coach: string;
};

export const FOKUS: Record<FokusId, FokusProfil> = {
  idee: {
    chipsNummer: 1,
    heute: {
      GRUNDSCHULE: "Heute erfindet ihr euer Spiel: Wie heißt es? Wer ist die Hauptfigur? Was passiert, wenn man sie antippt?",
      MITTELSTUFE: "Heute entsteht die Idee: Titel, Hauptfigur, Stimmung — und eine erste Sache, die auf Eingaben reagiert.",
      OBERSTUFE: "Heute steht das Konzept: Kernidee, Steuerung und ein erster interaktiver Prototyp.",
    },
    teamFrage: "Habt ihr an das Thema von heute gedacht: Idee, Name und Hauptfigur?",
    coach: "die Idee des Spiels — Name, Hauptfigur, Stimmung und eine erste Reaktion auf Antippen",
  },
  mechanik: {
    chipsNummer: 2,
    heute: {
      GRUNDSCHULE: "Heute bekommt euer Spiel eine Regel: Was muss man tun? Wann gewinnt man? Wann verliert man?",
      MITTELSTUFE: "Heute geht es um die Spielregel: Ziel, Gewinn- und Verlierbedingung, Steuerung.",
      OBERSTUFE: "Heute geht es um die Mechanik: Regeln, Zustände, Sieg- und Verlierbedingungen.",
    },
    teamFrage: "Habt ihr an das Thema von heute gedacht: die Spielregel — gewinnen und verlieren?",
    coach: "die Spielregel — was man tun muss, wann man gewinnt und wann man verliert",
  },
  visuals: {
    chipsNummer: 3,
    heute: {
      GRUNDSCHULE: "Heute wird euer Spiel schön: Farben, Figuren, Bewegungen und Geräusche. Sagt genau, WIE es aussehen soll.",
      MITTELSTUFE: "Heute geht es um Optik und Ton: Aussehen, Animationen, Effekte, Sounds.",
      OBERSTUFE: "Heute geht es um Gestaltung: visuelles Konzept, Animation, Audio, Rückmeldung an die Spielenden.",
    },
    teamFrage: "Habt ihr an das Thema von heute gedacht: Aussehen, Bewegung und Geräusche?",
    coach: "Aussehen und Ton — Farben, Figuren, Bewegung, Geräusche",
  },
  test: {
    chipsNummer: 4,
    heute: {
      GRUNDSCHULE: "Heute wird getestet: Andere spielen euer Spiel. Was geht kaputt? Was ist zu schwer oder zu leicht? Das repariert ihr.",
      MITTELSTUFE: "Heute ist Test-Tag: Fehler aus den Tests beheben, Schwierigkeit anpassen, Steuerung verständlicher machen.",
      OBERSTUFE: "Heute ist Test-Tag: Befunde aus dem Peer-Test priorisieren und beheben, Balancing und Randfälle.",
    },
    teamFrage: "Habt ihr an das Thema von heute gedacht: Fehler finden und genau beschreiben?",
    coach: "Testen und Reparieren — was genau kaputt, zu schwer oder zu leicht ist und wann es passiert",
  },
  polish: {
    chipsNummer: 5,
    heute: {
      GRUNDSCHULE: "Heute wird euer Spiel fertig zum Zeigen: Startbildschirm, eine kurze Anleitung und ein schöner Schluss.",
      MITTELSTUFE: "Heute wird das Spiel fertig fürs Publikum: Startbildschirm, Anleitung, Abschluss, letzter Feinschliff.",
      OBERSTUFE: "Heute geht es um den präsentierbaren Endzustand: Onboarding, Abschluss, letzte Politur.",
    },
    teamFrage: "Habt ihr an das Thema von heute gedacht: das Spiel fertig machen zum Zeigen?",
    coach: "das Fertigmachen zum Zeigen — Startbildschirm, Anleitung, Schluss",
  },
};

export function fokusProfil(day: number, totalDays: number): FokusProfil & { id: FokusId } {
  const id = fokusDesTages(day, totalDays);
  return { id, ...FOKUS[id] };
}
