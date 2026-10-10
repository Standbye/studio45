import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Lernfall „Klarer Auftrag, fehlerhaftes Ergebnis".
 *
 * Kinder erleben sonst nur, dass ein unklarer Wunsch zu einem falschen Spiel führt — und
 * schließen daraus, Fehler lägen immer bei ihnen. Dieser Fall zeigt das Gegenstück: Der
 * Auftrag ist eindeutig, das Spiel hält sich trotzdem nicht daran. Die Gruppe findet die
 * Abweichungen, belegt sie und prüft dann eine angebliche Reparatur — die nicht alles
 * behebt. Das Spiel ist vorbereitet (runtime/lernfall.html), kein echter KI-Lauf; das
 * steht auch so auf der Seite.
 */
export const LERNFALL = {
  titel: "Apfelkorb",
  auftrag: [
    "Ein Korb fängt fallende Äpfel.",
    "Jeder gefangene Apfel gibt genau 1 Punkt.",
    "Wer 3 Äpfel verpasst, hat verloren — dann endet das Spiel.",
    "Der Knopf „Nochmal“ startet neu: 0 Punkte, 0 verpasst.",
  ],
  aufgaben: [
    "Spielt das Spiel und prüft jede Regel aus dem Auftrag einzeln.",
    "Wo hält sich das Spiel nicht an den Auftrag? Schreibt auf, was ihr erwartet habt und was passiert ist.",
    "Zeigt es einer anderen Gruppe: Woran kann man den Fehler sehen?",
    "Lag es am Auftrag — oder hat die KI einen Fehler gemacht?",
  ],
  reparatur:
    "Stellt euch vor, ihr meldet der KI die Fehler. Sie antwortet: „Ich habe alles repariert.“ Ladet die zweite Fassung und prüft, ob das stimmt.",
  /** Nur für die Lehrkraft */
  loesung: [
    { regel: "Genau 1 Punkt je Apfel", fehler: "Ab 5 Punkten zählt jeder Apfel doppelt (5 → 7 → 9).", zweite: "behoben" },
    { regel: "Ende nach 3 verpassten Äpfeln", fehler: "Das Spiel endet erst beim vierten; die Anzeige bleibt bei 3/3 stehen.", zweite: "behoben" },
    { regel: "„Nochmal“ startet mit 0 Punkten", fehler: "Die Punkte bleiben nach dem Neustart stehen.", zweite: "NICHT behoben — obwohl „alles repariert“ behauptet wird" },
  ],
} as const;

export type LernfallFassung = "erste" | "zweite";

export function lernfallHtml(fassung: LernfallFassung): string {
  const html = fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "runtime", "lernfall.html"), "utf8");
  return fassung === "zweite" ? html.replace('var FASSUNG = "erste";', 'var FASSUNG = "zweite";') : html;
}
