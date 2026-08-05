import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { AgeGroup } from "@/generated/prisma/enums";
import { alterProfil, supportProfil } from "@/lib/audience";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

function load(name: string): string {
  return fs.readFileSync(path.join(PROMPTS_DIR, `${name}.md`), "utf8");
}

/** Fester Kern: Format, Sandbox-Grenzen, Kinderschutz, Qualitätsuntergrenze, Steckbrief. */
export function kernPrompt(): string {
  return load("kern");
}

/**
 * Tagesfokus: 5-Tage-Prompts aus dem Piloten; bei 3-Tage-Workshops
 * wird komprimiert (Idee → Mechanik → Politur inkl. Punkte).
 */
export function dayFocusPrompt(day: number, totalDays: number): string {
  const five = ["day-1-idee", "day-2-mechanik", "day-3-visuals", "day-4-test", "day-5-polish"];
  const three = ["day-1-idee", "day-2-mechanik", "day-5-polish"];
  const list = totalDays <= 3 ? three : five;
  const idx = Math.min(Math.max(day, 1), list.length) - 1;
  return load(list[idx]);
}

export const DAY_TITLES_5 = [
  "Idee & erstes Lebenszeichen",
  "Spielregel",
  "Hübsch & Hörbar",
  "Test-Tag",
  "Release-Tag",
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
    "Jeder Fehler, den wir finden, macht unser Spiel besser.",
    "Fertig ist, was wir stolz zeigen können.",
  ];
  // Das 3-Tage-Format behält seinen eigenen Schlusssatz — Tag 3 ist dort
  // Feinschliff UND Release in einem.
  const three = [five[0], five[1], "Ich entscheide, die KI schlägt vor."];
  const list = totalDays <= 3 ? three : five;
  return list[Math.min(Math.max(day, 1), list.length) - 1];
}

// ---------------------------------------------------------------------------
// Zusammensetzen des Metaprompts
// ---------------------------------------------------------------------------

export type PromptBlock = {
  /** Überschrift in der Vorschau für die Lehrkraft */
  titel: string;
  /** Woher der Text kommt — für die Herkunftsanzeige */
  herkunft: string;
  /** Kann die Lehrkraft diesen Block ändern? */
  editierbar: boolean;
  text: string;
};

export type PromptKontext = {
  ageGroup: AgeGroup;
  supportLevel: number;
  learningGoal: string;
  /** Eigene Fassung der didaktischen Zone; leer = erzeugte Fassung */
  promptDidactic: string;
  day: number;
  totalDays: number;
};

/**
 * Die didaktische Zone in ihrer erzeugten Fassung: Altersstufe,
 * Unterstützungslevel und Lernziel. Genau das kann die Lehrkraft
 * übernehmen und überschreiben.
 */
export function didaktikStandard(k: PromptKontext): string {
  const alter = alterProfil(k.ageGroup);
  const support = supportProfil(k.supportLevel);
  const teile = [alter.promptBlock, support.promptBlock];

  if (k.learningGoal.trim()) {
    teile.push(`## Lernziel der Lehrkraft — verbindlich

${k.learningGoal.trim()}

Baue passende Aufgaben so ein, dass sie **zum Spielfortschritt gehören**: als Tor, das sich
öffnet, als Belohnung, als Schlüssel zum nächsten Abschnitt. Kein vorgeschaltetes Quiz, das
man wegklicken kann. Antwortflächen groß, Rückmeldung sofort, bei Fehlern ein zweiter Versuch
ohne Strafe.`);
  }

  return teile.join("\n\n");
}

/** Alle Blöcke des Metaprompts mit Herkunft — Grundlage für Vorschau und Aufruf. */
export function promptBloecke(k: PromptKontext): PromptBlock[] {
  const alter = alterProfil(k.ageGroup);
  const support = supportProfil(k.supportLevel);
  const eigene = k.promptDidactic.trim();

  return [
    {
      titel: "Fester Kern",
      herkunft: "Studio45 — Format, Sandbox-Grenzen, Kinderschutz, Qualitätsuntergrenze",
      editierbar: false,
      text: kernPrompt(),
    },
    {
      titel: `Tagesfokus — Tag ${k.day} von ${k.totalDays}`,
      herkunft: `Ablaufplan: ${dayTitle(k.day, k.totalDays)}`,
      editierbar: false,
      text: dayFocusPrompt(k.day, k.totalDays),
    },
    {
      titel: "Didaktische Zone",
      herkunft: eigene
        ? "eigene Fassung dieses Workshops"
        : `erzeugt aus: ${alter.name} · Unterstützung ${support.stufe} (${support.name})${
            k.learningGoal.trim() ? " · Lernziel" : ""
          }`,
      editierbar: true,
      text: eigene || didaktikStandard(k),
    },
  ];
}

/** Systemanweisungen für den Modellaufruf (erster Block ist der cachebare Kern). */
export function systemTeile(k: PromptKontext): string[] {
  return promptBloecke(k).map((b) => b.text);
}
