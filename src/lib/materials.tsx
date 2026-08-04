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
    aufgabe: "Spricht mit der KI — laut, deutlich, in ganzen Sätzen.",
    tipps: ["Erst im Team besprechen, dann sprechen", "Sagen, WAS passieren soll und WIE es aussieht", "Nicht nur Stichworte!"],
  },
  {
    emoji: "🧪",
    name: "Tester:in",
    farbe: "#0b6e4f",
    aufgabe: "Probiert das Spiel nach jeder Änderung sofort aus.",
    tipps: ["Alles antippen, auch Unsinn", "Funktioniert es? Macht es Spaß?", "Fehler laut sagen — die sind wichtig!"],
  },
  {
    emoji: "🎨",
    name: "Gestalter:in",
    farbe: "#5e35b1",
    aufgabe: "Achtet auf Farben, Figuren und wie das Spiel aussieht.",
    tipps: ["Passen die Farben zusammen?", "Sieht die Figur nach dem aus, was wir wollten?", "Vorschläge machen: heller, größer, lustiger"],
  },
  {
    emoji: "🤝",
    name: "Teamchef:in",
    farbe: "#e65100",
    aufgabe: "Achtet darauf, dass alle drankommen und die Zeit reicht.",
    tipps: ["Jede:r darf einmal ans Mikro", "Bei Streit: abstimmen", "Auf die Versuche achten — nicht verschwenden!"],
  },
] as const;

export const TAFEL_1 = {
  titel: "Die KI ist ein Werkzeug — kein Mensch",
  emoji: "🤖",
  punkte: [
    { icon: "🎭", text: "Die KI klingt immer sicher — **auch wenn sie falsch liegt.** Prüfe nach!" },
    { icon: "💙", text: "Die KI hat **keine Gefühle** und ist kein echter Freund — auch wenn sie nett schreibt." },
    { icon: "📚", text: "Die KI **weiß** nichts. Sie hat aus ganz vielen Texten von Menschen gelernt." },
    { icon: "👑", text: "**Du bist der Chef / die Chefin.** Die KI schlägt vor — entscheiden musst du." },
  ],
};

export const TAFEL_2 = {
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
  return [
    { zeit: "5 min", was: "Plenum & Merksatz", detail: `„${dayMotto(day, totalDays)}"` },
    { zeit: "25 min", was: "Studio-Phase", detail: `Gruppen bauen — Fokus: ${dayTitle(day, totalDays)}` },
    { zeit: "10 min", was: "Testen & Tauschen", detail: "Gruppen spielen die Spiele der anderen: Zwei Sterne und ein Wunsch" },
    { zeit: "5 min", was: "Reflexion", detail: "Abschlussrunde mit den Leitfragen" },
  ];
}

/** Kopfzeile für alle Materialblätter — trägt das Branding des Workshops. */
export function Kopf({ ctx, titel }: { ctx: MaterialKontext; titel: string }): ReactNode {
  return (
    <div className="kopf">
      {ctx.logoUrl && <img src={ctx.logoUrl} alt="" />}
      <div className="titel">
        <div className="marke">Studio45 · {ctx.workshopName}{ctx.className ? ` · ${ctx.className}` : ""}</div>
        <h1>{titel}</h1>
      </div>
    </div>
  );
}
