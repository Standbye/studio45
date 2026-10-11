import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Lernfall „Klarer Auftrag, fehlerhaftes Ergebnis".
 *
 * Kinder erleben sonst nur, dass ein unklarer Wunsch zu einem falschen Spiel führt — und
 * schließen daraus, Fehler lägen immer bei ihnen. Dieser Fall zeigt das Gegenstück: Der
 * Auftrag ist eindeutig, das Spiel hält sich trotzdem nicht daran. Die Gruppe prüft jede
 * Regel einzeln, hält fest, was sie beobachtet hat, und prüft dann eine angebliche
 * Reparatur — die nicht alles behebt und dabei etwas Neues kaputt macht. Das Spiel ist
 * vorbereitet (runtime/lernfall.html), kein echter KI-Lauf; das steht auch so auf der Seite.
 *
 * Die Lehrkraft steuert den Ablauf über Workshop.lernfallStufe. Die Lösung (was je Fassung
 * falsch ist) bleibt auf dem Server, bis die Auflösung freigegeben ist.
 */

export type LernfallFassung = "erste" | "zweite";
export type Urteil = "" | "ok" | "fehler";
export type Befund = { urteil: Urteil; notiz: string };
export type Befunde = { erste: Befund[]; zweite: Befund[] };

type Regel = {
  /** So steht die Regel im Auftrag */
  text: string;
  /** Kurzform für Tabellenköpfe */
  kurz: string;
  /** Was das Spiel in dieser Fassung falsch macht — null = hält sich an die Regel */
  erste: string | null;
  zweite: string | null;
};

export const LERNFALL = {
  titel: "Apfelkorb",
  regeln: [
    {
      text: "Ein Korb fängt fallende Äpfel.",
      kurz: "Korb fängt Äpfel",
      erste: null,
      zweite: null,
    },
    {
      text: "Jeder gefangene rote Apfel gibt genau 1 Punkt.",
      kurz: "Roter Apfel: 1 Punkt",
      erste: "Ab 5 Punkten zählt jeder rote Apfel doppelt (5 → 7 → 9).",
      zweite: null,
    },
    {
      text: "Braune Äpfel sind faul: Wer einen fängt, verliert 1 Punkt (weniger als 0 gibt es nicht). Faule Äpfel durchfallen lassen ist richtig und zählt nicht als verpasst.",
      kurz: "Fauler Apfel: 1 Punkt Abzug",
      erste: null,
      zweite: "Neu kaputt: Ein gefangener fauler Apfel kostet keinen Punkt mehr.",
    },
    {
      text: "Wer 3 rote Äpfel verpasst, hat verloren — dann endet das Spiel.",
      kurz: "Ende nach 3 verpassten",
      erste: "Das Spiel endet erst beim vierten verpassten Apfel; die Anzeige bleibt bei 3/3 stehen.",
      zweite: null,
    },
    {
      text: "Der Knopf „Nochmal“ startet neu: 0 Punkte, 0 verpasst.",
      kurz: "„Nochmal“ startet bei 0",
      erste: "Die Punkte bleiben nach dem Neustart stehen.",
      zweite: "Nicht behoben: Die Punkte bleiben nach dem Neustart weiter stehen.",
    },
  ] satisfies Regel[],
  merksatz:
    "Ein klarer Auftrag schützt nicht vor Fehlern der KI — und „ist repariert“ ist eine Behauptung, kein Beleg. Nach jeder Reparatur alles noch einmal prüfen, nicht nur das Gemeldete.",
} as const;

export const LERNFALL_STUFEN = [
  { stufe: 0, name: "Aus", kurz: "Gruppen sehen ihr Studio, der Lernfall ist nicht erreichbar." },
  { stufe: 1, name: "Erste Fassung", kurz: "Gruppen prüfen das Spiel Regel für Regel." },
  { stufe: 2, name: "Zweite Fassung", kurz: "„Alles repariert“ — die Gruppen prüfen noch einmal." },
  { stufe: 3, name: "Auflösung", kurz: "Lösung und Befunde sind sichtbar, auch am Beamer." },
] as const;

export function stufenName(stufe: number): string {
  return LERNFALL_STUFEN.find((s) => s.stufe === stufe)?.name ?? "Aus";
}

/** Welche Fassung die Gruppen bei dieser Stufe prüfen — null = gerade keine. */
export function fassungZurStufe(stufe: number): LernfallFassung | null {
  return stufe === 1 ? "erste" : stufe === 2 ? "zweite" : null;
}

const ANZAHL = LERNFALL.regeln.length;
const NOTIZ_MAX = 300;

function leereListe(): Befund[] {
  return Array.from({ length: ANZAHL }, () => ({ urteil: "" as Urteil, notiz: "" }));
}

function normalisiere(liste: unknown): Befund[] {
  const aus = leereListe();
  if (!Array.isArray(liste)) return aus;
  for (let i = 0; i < ANZAHL; i++) {
    const b = liste[i] as Partial<Befund> | undefined;
    if (!b || typeof b !== "object") continue;
    aus[i] = {
      urteil: b.urteil === "ok" || b.urteil === "fehler" ? b.urteil : "",
      notiz: typeof b.notiz === "string" ? b.notiz.slice(0, NOTIZ_MAX) : "",
    };
  }
  return aus;
}

/**
 * Prüfliste einer Gruppe aus der Datenbank lesen. `runde` wechselt, wenn die Lehrkraft die
 * Befunde leert — daran erkennt die Kinder-Ansicht, dass sie neu anfangen muss.
 */
export function leseBefunde(roh: string): Befunde & { runde: number } {
  let daten: { r?: unknown; erste?: unknown; zweite?: unknown } = {};
  try {
    if (roh) daten = JSON.parse(roh);
  } catch {
    /* kaputter Inhalt zählt als leer */
  }
  return {
    runde: typeof daten.r === "number" ? daten.r : 0,
    erste: normalisiere(daten.erste),
    zweite: normalisiere(daten.zweite),
  };
}

export function setzeBefund(roh: string, fassung: LernfallFassung, regel: number, befund: Befund): string {
  const stand = leseBefunde(roh);
  if (regel >= 0 && regel < ANZAHL) {
    stand[fassung][regel] = { urteil: befund.urteil, notiz: befund.notiz.slice(0, NOTIZ_MAX) };
  }
  return JSON.stringify({ r: stand.runde, erste: stand.erste, zweite: stand.zweite });
}

/** Leere Prüfliste mit neuer Rundenmarke — für „Befunde leeren". */
export function leereBefunde(): string {
  return JSON.stringify({ r: Date.now() });
}

export type Treffer = "offen" | "richtig" | "falsch";

/** Hat die Gruppe die Regel richtig beurteilt? */
export function bewerte(befunde: Befund[], fassung: LernfallFassung): Treffer[] {
  return LERNFALL.regeln.map((regel, i) => {
    const urteil = befunde[i]?.urteil ?? "";
    if (urteil === "") return "offen";
    const soll: Urteil = regel[fassung] === null ? "ok" : "fehler";
    return urteil === soll ? "richtig" : "falsch";
  });
}

/** Lösung in der Form, in der sie nach der Freigabe an Kinder-App und Beamer geht. */
export function loesung() {
  return LERNFALL.regeln.map((r) => ({ erste: r.erste, zweite: r.zweite }));
}

export function lernfallHtml(fassung: LernfallFassung): string {
  const html = fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "runtime", "lernfall.html"), "utf8");
  return fassung === "zweite" ? html.replace('var FASSUNG = "erste";', 'var FASSUNG = "zweite";') : html;
}
