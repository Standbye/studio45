/**
 * Spracheingabe: baut aus den Ergebnissen der Web-Speech-Erkennung den gesprochenen Text.
 *
 * Der Text wird bei jedem Ereignis vollständig aus der Ergebnisliste neu aufgebaut — nie
 * „das Neue hinten anhängen". Sonst landet schon Gesagtes bei jedem weiteren Ereignis noch
 * einmal im Feld (genau dieser Fehler stand hier vorher).
 */

type Ergebnis = { isFinal: boolean; 0: { transcript: string } };
type Ergebnisliste = { length: number; [index: number]: Ergebnis };

function verbinde(a: string, b: string): string {
  return a && b ? `${a} ${b}` : a || b;
}

/** Fester und noch vorläufiger Text einer Ergebnisliste. */
export function diktatText(results: Ergebnisliste): { fest: string; vorlaeufig: string } {
  let fest = "";
  let vorlaeufig = "";
  for (let i = 0; i < results.length; i++) {
    const stueck = results[i][0].transcript.trim();
    if (!stueck) continue;
    if (!results[i].isFinal) {
      vorlaeufig = verbinde(vorlaeufig, stueck);
      continue;
    }
    // Chrome auf Android liefert jedes Endergebnis kumulativ („hallo", „hallo wie", …):
    // Beginnt das neue Stück mit allem bisher Gesagten, ersetzt es das Bisherige.
    const wiederholt =
      fest.length > 0 &&
      stueck.toLowerCase().startsWith(fest.toLowerCase()) &&
      (stueck.length === fest.length || /\s/.test(stueck[fest.length]));
    fest = wiederholt ? stueck : verbinde(fest, stueck);
  }
  return { fest, vorlaeufig };
}

/**
 * Eine Aufnahme vom Antippen des Mikrofons bis zum Stopp. `start` ist, was schon im Feld stand.
 */
export function diktatSitzung(start: string) {
  let basis = start.trim();
  let letzterFest = "";
  /** Die Endergebnisse des letzten Ereignisses, nach Position in der Liste */
  let letzteFesten: (string | null)[] = [];
  return {
    ergebnis(results: Ergebnisliste): { text: string; vorlaeufig: string } {
      // Safari fängt nach einer Sprechpause manchmal mit einer neuen Liste an: Was eben noch
      // als Endergebnis an einer Stelle stand, ist dort weg. Das bis dahin Gesagte sichern.
      const neuBegonnen = letzteFesten.some((alt, i) => {
        if (alt === null) return false;
        const jetzt = i < results.length && results[i].isFinal ? results[i][0].transcript.trim() : null;
        return jetzt === null || !jetzt.toLowerCase().startsWith(alt.toLowerCase());
      });
      if (neuBegonnen) basis = verbinde(basis, letzterFest);

      const { fest, vorlaeufig } = diktatText(results);
      letzterFest = fest;
      letzteFesten = Array.from({ length: results.length }, (_, i) => (results[i].isFinal ? results[i][0].transcript.trim() : null));
      return { text: verbinde(basis, fest), vorlaeufig };
    },
  };
}
