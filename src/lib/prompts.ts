import "server-only";
import fs from "node:fs";
import path from "node:path";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

function load(name: string): string {
  return fs.readFileSync(path.join(PROMPTS_DIR, `${name}.md`), "utf8");
}

export function gameBuilderPrompt(): string {
  return load("game-builder");
}

/**
 * Tagesfokus: 5-Tage-Prompts aus dem Piloten; bei 3-Tage-Workshops
 * wird komprimiert (Idee → Mechanik → Politur inkl. Punkte).
 */
export function dayFocusPrompt(day: number, totalDays: number): string {
  const five = ["day-1-idee", "day-2-mechanik", "day-3-visuals", "day-4-challenge", "day-5-polish"];
  const three = ["day-1-idee", "day-2-mechanik", "day-5-polish"];
  const list = totalDays <= 3 ? three : five;
  const idx = Math.min(Math.max(day, 1), list.length) - 1;
  return load(list[idx]);
}

export const DAY_TITLES_5 = [
  "Idee & erstes Lebenszeichen",
  "Spielregel",
  "Hübsch & Hörbar",
  "Herausforderung",
  "Feinschliff & Release",
];
export const DAY_TITLES_3 = ["Idee & erstes Lebenszeichen", "Spielregel", "Feinschliff & Release"];

export function dayTitle(day: number, totalDays: number): string {
  const list = totalDays <= 3 ? DAY_TITLES_3 : DAY_TITLES_5;
  return list[Math.min(Math.max(day, 1), list.length) - 1];
}

/** Merksatz des Tages — didaktischer Kernsatz für Beamer/Plenum. */
export function dayMotto(day: number, totalDays: number): string {
  const five = [
    "Je genauer ich sage, was ich will, desto besser versteht mich die KI.",
    "Die KI macht Fehler — Testen gehört dazu.",
    "Schön wird es, wenn ich beschreibe, WIE es aussehen soll.",
    "Eine gute Herausforderung ist schwer, aber schaffbar.",
    "Ich entscheide, die KI schlägt vor.",
  ];
  const three = [five[0], five[1], five[4]];
  const list = totalDays <= 3 ? three : five;
  return list[Math.min(Math.max(day, 1), list.length) - 1];
}
