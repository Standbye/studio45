import "server-only";

/**
 * Live-Fortschritt eines laufenden Baus, damit die Gruppe sieht, was gerade passiert
 * („Generierung an den Client streamen“, Konzept Abschnitt 9). Die KI-Antwort kommt
 * gestreamt herein; hier steht nur, wie weit sie ist — das halbfertige Spiel zeigen wir
 * bewusst nicht, ein kaputter Zwischenstand würde die Kinder nur verwirren.
 *
 * Im Speicher des Server-Prozesses (Studio45 läuft als ein Prozess). Auf globalThis,
 * weil Next die Route-Handler getrennt bündelt und ein Modul sonst mehrfach existiert.
 */
export type BauPhase = "plant" | "schreibt" | "prueft" | "repariert";

export type BauFortschritt = {
  phase: BauPhase;
  /** Bisher geschriebene Zeilen des Spiels (nur in den Phasen schreibt/repariert) */
  zeilen: number;
};

const g = globalThis as unknown as { __s45Bau?: Map<string, BauFortschritt> };
const stand = (g.__s45Bau ??= new Map<string, BauFortschritt>());

export function setzeFortschritt(groupId: string, phase: BauPhase, zeilen = 0): void {
  stand.set(groupId, { phase, zeilen });
}

export function leseFortschritt(groupId: string): BauFortschritt | null {
  return stand.get(groupId) ?? null;
}

export function beendeFortschritt(groupId: string): void {
  stand.delete(groupId);
}

/** Zeilen im bisher empfangenen Text — billig genug für jeden Stream-Teil */
export function zaehleZeilen(text: string): number {
  let n = 0;
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) n++;
  return n;
}
