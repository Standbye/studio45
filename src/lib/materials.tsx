import type { ReactNode } from "react";
import { dayMotto, dayTitle } from "@/lib/prompts";

export type MaterialKontext = {
  workshopName: string;
  className: string;
  totalDays: number;
  colorPrimary: string;
  colorAccent: string;
  logoUrl: string | null;
  groups: { index: number; studioName: string; code: string }[];
};

export const ROLLEN = [
  {
    emoji: "🎤",
    name: "Sprecher:in",
    farbe: "#1d4e89",
    aufgabe: "Du bist die Stimme eures Teams — du sprichst mit der KI.",
    schritte: [
      "Sammle die Wünsche vom ganzen Team ein",
      "Sprich den Satz einmal leise zur Probe",
      "Drücke aufs Mikro und sprich laut und deutlich",
    ],
    tipps: ["Ganze Sätze, keine Stichworte!", "Sag WAS passieren soll und WIE es aussieht"],
  },
  {
    emoji: "🧪",
    name: "Tester:in",
    farbe: "#0b6e4f",
    aufgabe: "Du prüfst nach jedem Bauen, ob das Spiel wirklich funktioniert.",
    schritte: [
      "Spiele das Spiel sofort, wenn es fertig gebaut ist",
      "Tippe alles an — auch Unsinn",
      "Melde dem Team, was klappt und was nicht",
    ],
    tipps: ["Fehler sind wichtig — sag sie laut!", "Teste auch, ob es Spaß macht"],
  },
  {
    emoji: "🎨",
    name: "Gestalter:in",
    farbe: "#5e35b1",
    aufgabe: "Du achtest darauf, wie das Spiel aussieht und klingt.",
    schritte: [
      "Schau dir Farben, Figuren und Töne genau an",
      "Vergleiche: Sieht es so aus, wie ihr es wolltet?",
      "Mache konkrete Vorschläge für den nächsten Wunsch",
    ],
    tipps: ["Sag es genau: heller, größer, lustiger", "Weniger ist manchmal schöner"],
  },
  {
    emoji: "🤝",
    name: "Teamchef:in",
    farbe: "#e65100",
    aufgabe: "Du sorgst dafür, dass alle drankommen und die Zeit reicht.",
    schritte: [
      "Behalte Uhr und übrige Versuche im Blick",
      "Gib jedem Kind einmal das Wort",
      "Bei Streit: kurz abstimmen lassen",
    ],
    tipps: ["Erst besprechen, dann bauen", "Versuche sind wertvoll — nicht verschwenden!"],
  },
] as const;

export type TafelPunkt = { icon: string; text: string; ampel?: "rot" | "gelb" | "gruen" };
export type Tafel = { titel: string; emoji: string; punkte: TafelPunkt[] };

export const TAFEL_1: Tafel = {
  titel: "Die KI ist ein Werkzeug — kein Mensch",
  emoji: "🤖",
  punkte: [
    { icon: "🎭", text: "Die KI klingt immer sicher — **auch wenn sie falsch liegt.** Prüfe nach!" },
    { icon: "💙", text: "Die KI hat **keine Gefühle** und ist kein echter Freund — auch wenn sie nett schreibt." },
    { icon: "📚", text: "Die KI **weiß** nichts. Sie hat aus ganz vielen Texten von Menschen gelernt." },
    { icon: "👑", text: "**Du bist der Chef / die Chefin.** Die KI schlägt vor — entscheiden musst du." },
  ],
};

export const TAFEL_2: Tafel = {
  titel: "Sicher unterwegs mit KI",
  emoji: "🚦",
  punkte: [
    { ampel: "rot", icon: "🔴", text: "**Niemals eingeben:** echten Namen, Adresse, Schule, Fotos, Geheimnisse." },
    { ampel: "rot", icon: "🔴", text: "Nicht alles glauben, was echt aussieht — **Bilder und Stimmen können gefälscht sein.**" },
    { ampel: "gelb", icon: "🟡", text: "**Erst selber denken, dann fragen.** Die KI ist Werkzeug, kein Ersatz fürs Denken." },
    { ampel: "gruen", icon: "🟢", text: "Kommt dir etwas komisch vor? **Stopp sagen und eine erwachsene Person holen.**" },
  ],
};

export const REFLEXIONSFRAGEN = [
  "Welcher Satz hat heute besonders gut funktioniert? Warum?",
  "Wann hat die KI etwas anderes gemacht, als ihr wolltet?",
  "Was habt ihr beim nächsten Mal anders formuliert?",
  "Was war heute euer größter Erfolg?",
];

export const ICH_KANN = [
  "Ich kann der KI eine genaue Anweisung geben.",
  "Ich kann prüfen, ob das Ergebnis stimmt.",
  "Ich kann sagen, was ich ändern will.",
  "Ich weiß, welche Daten ich der KI NICHT gebe.",
  "Ich weiß, dass die KI Fehler macht.",
  "Ich kann im Team zusammenarbeiten.",
];

export function stundenverlauf(day: number, totalDays: number) {
  const merksatz = { zeit: "5 min", was: "Plenum & Merksatz", detail: `„${dayMotto(day, totalDays)}"` };
  // Beim 5-Tage-Format haben Test-Tag (4) und Release-Tag (5) eigene Abläufe —
  // dort wird nicht mehr 25 Minuten am Stück gebaut.
  if (totalDays > 3 && day === 4) {
    return [
      merksatz,
      { zeit: "15 min", was: "Testrunde", detail: "iPads zwischen den Gruppen tauschen: fremdes Spiel testen, Testbogen und Bugreport-Karten ausfüllen" },
      { zeit: "20 min", was: "Studio-Phase", detail: "Zurück am eigenen Spiel: gemeldete Fehler beheben, Schwierigkeit anpassen" },
      { zeit: "5 min", was: "Reflexion", detail: "Welcher gefundene Fehler hat euer Spiel am meisten verbessert?" },
    ];
  }
  if (totalDays > 3 && day >= 5) {
    return [
      merksatz,
      { zeit: "10 min", was: "Letzter Feinschliff", detail: "Startbildschirm, Anleitung, letzte kleine Wünsche — nichts Großes mehr!" },
      { zeit: "20 min", was: "Release & Präsentation", detail: "Jede Gruppe zeigt ihr Spiel am Beamer — danach spielen alle die Spiele der anderen" },
      { zeit: "10 min", was: "Abschluss", detail: "Urkunden überreichen, Ich-kann-Bogen ausfüllen, gemeinsamer Blick in die begehbare Schule" },
    ];
  }
  return [
    merksatz,
    { zeit: "25 min", was: "Studio-Phase", detail: `Gruppen bauen — Fokus: ${dayTitle(day, totalDays)}` },
    { zeit: "10 min", was: "Testen & Tauschen", detail: "Gruppen spielen die Spiele der anderen: Zwei Sterne und ein Wunsch" },
    { zeit: "5 min", was: "Reflexion", detail: "Abschlussrunde mit den Leitfragen" },
  ];
}

/** „Wie rede ich mit der KI?" — die fünf Grundregeln für gute Wünsche. */
export const KI_TIPPS = [
  { regel: "Erst im Team besprechen.", erklaerung: "Redet zuerst miteinander: Was wollen wir? Dann erst sprecht ihr mit der KI." },
  { regel: "Sag WAS passieren soll — und WIE es aussieht.", erklaerung: `„Ein Drache" ist zu wenig. „Ein grüner Drache, der über die Wiese fliegt" — das versteht die KI.` },
  { regel: "Ganze Sätze statt Stichworte.", erklaerung: "Die KI versteht dich wie ein Mensch: Ein richtiger Satz sagt viel mehr als ein einzelnes Wort." },
  { regel: "Ein Wunsch nach dem anderen.", erklaerung: "Fünf Sachen auf einmal gehen schief. Baut Schritt für Schritt — wie mit Bausteinen." },
  { regel: "Nach jedem Bauen: sofort testen!", erklaerung: "Erst wenn ihr gespielt habt, wisst ihr, was der nächste Wunsch sein soll." },
] as const;

export const KI_BEISPIEL = {
  schlecht: "Drache",
  gut: "Baut einen grünen Drachen, der über die Wiese fliegt. Wenn man ihn antippt, lässt er einen Stern fallen und man bekommt einen Punkt.",
};

/** Detektiv-Fragen der Bugreport-Karte — warum ging es schief? */
export const BUG_FRAGEN = [
  "Wir haben nicht gesagt, WIE es aussehen oder funktionieren soll.",
  "Der Wunsch war zu groß — mehrere Dinge auf einmal.",
  "Der Satz war unklar — die KI hat uns anders verstanden.",
] as const;

/** Lehrer-Laufzettel: eine Zeile pro Termin — was tun, worauf achten. */
export function laufzettel(totalDays: number): { termin: number; fokus: string; tun: string; achten: string }[] {
  const fuenf = [
    {
      tun: `QR-Blätter und Rollenkarten austeilen, „Was ist KI?"-Einstieg (10 min), dann Phase auf Studio.`,
      achten: "Erst besprechen, dann sprechen — Stichwort-Spam gleich am Anfang bremsen.",
    },
    {
      tun: "Regelfrage ins Plenum: Wann gewinnt man, wann verliert man? Dann bauen lassen.",
      achten: "Gruppen ohne klare Regel zuerst reden lassen — die KI-Tipps-Karte hilft.",
    },
    {
      tun: "Thementafel 1 besprechen (5 min). Fokus heute: Aussehen und Klang.",
      achten: `Konkrete Beschreibungen einfordern: nicht „schöner", sondern „heller, größer, blauer".`,
    },
    {
      tun: "iPads zwischen Gruppen tauschen, Testbogen + Bugreport-Karten austeilen, danach Fixes bauen lassen.",
      achten: "Feedback-Regel durchsetzen: Zwei Sterne und ein Wunsch — freundlich und konkret.",
    },
    {
      tun: "Beamer für die Präsentationen vorbereiten, Urkunden bereitlegen, Ich-kann-Bogen austeilen.",
      achten: "Keine neuen Features mehr zulassen — heute zählt Stabilität und der stolze Moment.",
    },
  ];
  const drei = [
    fuenf[0],
    fuenf[1],
    {
      tun: "Letzte Wünsche bauen lassen, dann Präsentationsrunde am Beamer, Urkunden überreichen.",
      achten: "Rechtzeitig einfrieren: die letzten 15 Minuten gehören dem Zeigen, nicht dem Bauen.",
    },
  ];
  const liste = totalDays <= 3 ? drei : fuenf;
  return Array.from({ length: totalDays }, (_, i) => {
    const eintrag = liste[Math.min(i, liste.length - 1)];
    return { termin: i + 1, fokus: dayTitle(i + 1, totalDays), ...eintrag };
  });
}

/** Checkliste vor jeder Stunde — auf jeder Termin-Seite des Stundenverlaufs. */
export function vorbereitung(slug: string): string[] {
  return [
    `Beamer zeigt die Startseite (…/w/${slug}) — QR-Codes und Merksatz sind zu sehen`,
    "iPads geladen, Kamera-Zugriff für die Spracheingabe erlaubt",
    `Phase steht auf „Plenum" — die Eingabe ist gesperrt, bis Sie freigeben`,
    "Versuche der Gruppen und Token-Budget im Dashboard geprüft",
  ];
}

/**
 * Kopfzeile für alle Materialblätter — trägt das Branding des Workshops.
 * `schlicht` lässt den Blatt-Titel weg (Briefform: der Betreff übernimmt).
 */
export function Kopf({ ctx, titel, schlicht }: { ctx: MaterialKontext; titel?: string; schlicht?: boolean }): ReactNode {
  return (
    <div className="kopf">
      {ctx.logoUrl && <img src={ctx.logoUrl} alt="" />}
      <div className="titel">
        <div className="marke">Studio45 · {ctx.workshopName}{ctx.className ? ` · ${ctx.className}` : ""}</div>
        {!schlicht && titel && <h1>{titel}</h1>}
      </div>
    </div>
  );
}

/** Fußzeile mit Seitenzählung — auf jedem Blatt außer der Urkunde. */
export function Fuss({ ctx, blatt, seite, von }: { ctx: MaterialKontext; blatt: string; seite: number; von: number }): ReactNode {
  return (
    <div className="fuss">
      <span>Studio45 · {ctx.workshopName}</span>
      <span>{blatt} · Seite {seite} von {von}</span>
    </div>
  );
}
