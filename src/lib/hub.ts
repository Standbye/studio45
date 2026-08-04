import "server-only";
import fs from "node:fs";
import path from "node:path";

export type HubGruppe = {
  index: number;
  studioName: string;
  code: string;
};

export type HubDaten = {
  schulname: string;
  className: string;
  gastgeber: string; // Anzeigename der Lehrkraft
  gruppen: HubGruppe[];
  blaetterZiel: number;
};

const FARBEN = ["#e91e63", "#009688", "#673ab7", "#ff9800", "#c8102e", "#00838f", "#6d4c41", "#37474f"];
const KOERPER = ["#c2185b", "#00897b", "#5e35b1", "#e65100", "#ad1457", "#0277bd", "#4e342e", "#455a64"];
const HAARE = ["#6d4c41", "#212121", "#bf360c", "#fdd835", "#3e2723", "#795548", "#263238", "#8d6e63"];

const WELT = { breite: 20, hoehe: 20 };
const BAUM = { gx: 10, gy: 10.2 };

/**
 * Verteilt N Gruppen-Stationen gleichmäßig auf einem Kreis um den Baum.
 * So funktioniert der Hub für 1–8 Gruppen, nicht nur für die vier des Piloten.
 */
function stationsPositionen(anzahl: number) {
  const radius = 6.4;
  return Array.from({ length: anzahl }, (_, i) => {
    // Start links oben, im Uhrzeigersinn; Bogen ohne den Bereich direkt vor dem Eingang
    const winkel = (-Math.PI * 0.85) + (i / Math.max(1, anzahl - 1 || 1)) * Math.PI * 1.7;
    const gx = BAUM.gx + Math.cos(winkel) * radius;
    const gy = BAUM.gy + Math.sin(winkel) * radius * 0.95 + 1.2;
    return {
      stand: { gx: Number(gx.toFixed(2)), gy: Number(gy.toFixed(2)) },
      person: { gx: Number((gx + (gx < BAUM.gx ? 0.9 : -0.9)).toFixed(2)), gy: Number((gy + 1.2).toFixed(2)) },
    };
  });
}

export function hubConfig(d: HubDaten) {
  const positionen = stationsPositionen(d.gruppen.length);

  const spiele: Record<string, { url: string; studio: string; titel: string }> = {};
  const personen: Record<string, unknown>[] = [
    {
      name: d.gastgeber,
      rolle: "Gastgeber:in",
      gx: 10.0,
      gy: 4.6,
      koerper: "#37474f",
      haar: "#9e9e9e",
      krawatte: true,
      text: `Willkommen an der ${d.schulname}! 🌳 Unsere Klasse hat mit KI eigene Lernspiele gebaut. Lauf über den Hof und sprich mit den Studios — jedes zeigt dir sein Spiel. (Laufen: Fingertipp aufs Ziel, Joystick oder Pfeiltasten)`,
      spiel: null,
    },
  ];
  const staende: Record<string, unknown>[] = [];

  d.gruppen.forEach((g, i) => {
    const id = `g${g.index}`;
    const studio = g.studioName || `Gruppe ${g.index}`;
    spiele[id] = { url: `/g/${g.code}/play`, studio, titel: "Unser Lernspiel" };
    const pos = positionen[i];
    staende.push({ spiel: id, gx: pos.stand.gx, gy: pos.stand.gy, farbe: FARBEN[i % FARBEN.length] });
    personen.push({
      name: `Studio ${studio}`,
      rolle: `Gruppe ${g.index}`,
      gx: pos.person.gx,
      gy: pos.person.gy,
      koerper: KOERPER[i % KOERPER.length],
      haar: HAARE[i % HAARE.length],
      text: `Hallo! Wir sind {studio}. Wir haben unser Spiel selbst erdacht und der KI erklärt, wie es sein soll. Wollt ihr es ausprobieren?`,
      spiel: id,
    });
  });

  return {
    schulname: d.schulname,
    spiele,
    personen,
    staende,
    baum: BAUM,
    spielerStart: { gx: 10, gy: 16.5 },
    blaetterZiel: d.blaetterZiel,
    welt: WELT,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

/** Baut die fertige Hub-Seite aus Vorlage + Workshop-Daten. */
export function renderHub(d: HubDaten): string {
  const template = fs.readFileSync(path.join(process.cwd(), "runtime", "hub-template.html"), "utf8");
  const config = hubConfig(d);
  const titel = `🌳 ${d.schulname}`;
  const untertitel = d.className ? `Das Spiele-Studio der ${d.className}` : "Das Spiele-Studio";
  const begruessung = `Herzlich willkommen! Unsere Klasse hat mit einer KI eigene Lernspiele gebaut. Lauf über den Pausenhof und sprich mit den Studios — jedes zeigt dir sein Spiel. Und sammle unterwegs die Blätter unserer Linde! 🍃`;

  return template
    .replaceAll("__STUDIO45_TITEL__", escapeHtml(titel))
    .replaceAll("__STUDIO45_UNTERTITEL__", escapeHtml(untertitel))
    .replaceAll("__STUDIO45_GASTGEBER__", escapeHtml(`👋 ${d.gastgeber}`))
    .replaceAll("__STUDIO45_BEGRUESSUNG__", escapeHtml(begruessung))
    // JSON.stringify liefert gültiges JS; </script> im Text wird entschärft
    .replace("__STUDIO45_CONFIG__", JSON.stringify(config).replace(/<\//g, "<\\/"));
}
