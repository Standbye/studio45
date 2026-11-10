import type { AgeGroup } from "@/generated/prisma/enums";
import type { FokusId } from "@/lib/tagesfokus";

/**
 * Kurzformat: ein Workshop in zwei Runden statt in drei oder fünf Terminen — für
 * Veranstaltungen, bei denen Erwachsene Studio45 in einer Stunde selbst ausprobieren.
 * Runde 1: ein Spiel bauen. Runde 2: der KI eine Grenze setzen. Umgeschaltet wird wie
 * sonst zwischen den Terminen (Knöpfe „Tag 1 / 2“ im Lehrer-Dashboard).
 *
 * Ein Workshop ist im Kurzformat, wenn er genau zwei Termine hat (Admin → Workshop
 * bearbeiten → „2 Runden“). Alles, was das Format ausmacht, steht in dieser Datei.
 *
 * So lässt es sich wieder entfernen:
 *   1. diese Datei löschen,
 *   2. die mit „Kurzformat“ kommentierten Zeilen samt ihren Importen entfernen — je eine in
 *      `dayFocusPrompt`, `dayTitle` und `dayMotto` (prompts.ts), eine in `fokusProfil`
 *      (tagesfokus.ts) und eine bei `chips` in api/g/[code]/state/route.ts,
 *   3. in admin/forms.tsx die 2 aus `TERMIN_AUSWAHL` streichen und `terminAuswahlText(t)`
 *      wieder durch `{t} Termine` ersetzen.
 * Der Typcheck (`npx tsc --noEmit`) zeigt jede vergessene Stelle.
 * Workshops mit zwei Terminen laufen danach wie ein auf zwei Termine gekürztes
 * Drei-Termine-Format weiter; an der Datenbank ändert sich nichts.
 */
export function istKurzformat(totalDays: number): boolean {
  return totalDays === 2;
}

type Runde = {
  titel: string;
  /** Merksatz für Beamer und Plenum. Das Komma trennt im Vortrags-Design leise und laut. */
  merksatz: string;
  /** Anweisung an die KI — ersetzt den Tagesfokus der Termin-Formate */
  prompt: string;
  /** „Heute geht es um …“ im Studio der Gruppe (für alle Altersstufen gleich) */
  heute: string;
  teamFrage: string;
  /** Hinweis an die Formulierungshilfe */
  coach: string;
  /** Eigene Satzanfänge; fehlen sie, gelten die der Altersstufe für die erste Idee */
  chips?: string[];
};

const RUNDEN: [Runde, Runde] = [
  {
    titel: "Bauen",
    merksatz: "Was man nicht sagt, entscheidet die KI.",
    heute: "Runde 1: ein Spiel bauen. Worum geht es, was tut man, wann hat man gewonnen?",
    teamFrage: "Steht im Wunsch, worum es geht und wann man gewinnt?",
    coach: "ein kleines, vollständiges Spiel — worum es geht, was man tut, wann man gewinnt oder verliert",
    prompt: `# Runde 1 von 2 — Bauen

**Format:** Kurzworkshop in zwei Runden von je rund zehn Minuten. Es gibt keinen nächsten Termin.

**Am Ende dieser Runde soll stehen:** ein vollständiges, sofort spielbares Spiel — Titel, eine klare
Regel, ein Ziel, Rückmeldung beim Spielen und ein Ende (gewonnen oder verloren, mit Neustart).

**Worauf du dich konzentrierst:**
- Baue das Spiel gleich aus dem ersten Wunsch ganz: Idee, Regel und Aussehen in einem Zug.
- Die Runde ist kurz, und die Gruppe wartet auf jeden Bau. Schreibe kompakten Code: ein
  Bildschirm, eine Kernregel. Mehrere Level, lange Texte oder aufwendige Menüs nur, wenn die
  Gruppe sie verlangt.
- Was die Gruppe ausdrücklich verlangt, baust du. Wie viel du darüber hinaus ergänzt, bestimmt
  allein der Abschnitt „Spielraum der KI“.

**Wenn der Wunsch zu offen ist:** Triff die naheliegendste Entscheidung und baue ein einfaches,
vollständiges Spiel zum genannten Thema.`,
  },
  {
    titel: "Grenze setzen",
    merksatz: "Die KI schlägt vor, ich entscheide.",
    heute: "Runde 2: der KI eine Grenze setzen. Was bleibt, wie es ist? Was darf sie nicht? Was ändert sich als Einziges?",
    teamFrage: "Steht im Wunsch eine Grenze: was bleiben muss oder was die KI nicht darf?",
    coach: "die Grenze für die KI — was unverändert bleiben muss, was sie nicht darf und was sich als Einziges ändern soll",
    chips: ["Das bleibt, wie es ist: …", "Das darf die KI nicht: …", "Nur das ändert sich: …", "Ändere … und sonst nichts."],
    prompt: `# Runde 2 von 2 — Grenze setzen

**In dieser Runde setzt die Gruppe dir eine Grenze:** was bleiben muss, was du nicht darfst, was
sich als Einziges ändern soll. Das Spiel aus Runde 1 ist der Ausgangspunkt.

**Worauf du dich konzentrierst:**
- Die genannte Grenze gilt strikt. „Das bleibt, wie es ist“ heißt: Aussehen und Verhalten dieser
  Teile bleiben genau erhalten. „Nur das ändert sich“ heißt: Du fasst nichts anderes an — auch
  keine Verbesserungen, die dir sinnvoll erscheinen.
- Setze den Wunsch innerhalb der Grenze um. Innerhalb der Grenze gilt dein Spielraum weiter.
- Lässt sich der Wunsch nicht umsetzen, ohne die Grenze zu verletzen, dann halte die Grenze ein,
  setze um, was möglich ist, und nenne im Steckbrief, was offen bleibt.
- Nennt die Gruppe keine Grenze, ändere so wenig wie möglich: nur das Verlangte, der Rest des
  Spiels bleibt, wie er ist.

**Was du nicht von dir aus tust:** das Spiel neu aufbauen, den Stil wechseln, ungefragte Extras
an Stellen, über die nichts gesagt wurde.`,
  },
];

function runde(day: number): Runde {
  return RUNDEN[day >= 2 ? 1 : 0];
}

export const kurzTitel = (day: number) => runde(day).titel;
export const kurzMerksatz = (day: number) => runde(day).merksatz;
export const kurzPrompt = (day: number) => runde(day).prompt;

/** Dieselbe Form wie `fokusProfil` in tagesfokus.ts, dazu eigene Satzanfänge für Runde 2. */
export function kurzFokus(day: number) {
  const r = runde(day);
  const heute: Record<AgeGroup, string> = { GRUNDSCHULE: r.heute, MITTELSTUFE: r.heute, OBERSTUFE: r.heute };
  // Die Kennung wird nur für die Satzanfänge der Altersstufe gebraucht (Runde 1: die der Idee)
  const id: FokusId = day >= 2 ? "mechanik" : "idee";
  return { id, chipsNummer: 1, heute, teamFrage: r.teamFrage, coach: r.coach, chips: r.chips };
}

/** Beschriftung der Auswahl „Termine“ im Admin-Bereich */
export function terminAuswahlText(n: number): string {
  return istKurzformat(n) ? "2 Runden (Kurzformat)" : `${n} Termine`;
}
