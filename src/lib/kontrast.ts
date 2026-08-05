/**
 * Lesbarkeit der Marken-Farben.
 *
 * Schulen wählen ihre echten Farben — darunter helle Gelbtöne und reines Weiß.
 * Fest verdrahtetes „weißer Text auf Markenfarbe" wird dann unsichtbar. Hier
 * werden Textfarben deshalb aus der Hintergrundfarbe berechnet (WCAG-Leuchtdichte),
 * und für Marken-Farbe *als Text* auf hellem Grund so weit abgedunkelt, bis sie
 * lesbar ist.
 */

const DUNKEL = "#14171f";
const HELL = "#ffffff";

type Rgb = { r: number; g: number; b: number };

function hexZuRgb(hex: string): Rgb {
  const h = hex.trim().replace("#", "");
  const voll = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const zahl = Number.parseInt(voll.slice(0, 6), 16);
  if (!Number.isFinite(zahl)) return { r: 0, g: 0, b: 0 };
  return { r: (zahl >> 16) & 255, g: (zahl >> 8) & 255, b: zahl & 255 };
}

function rgbZuHex({ r, g, b }: Rgb): string {
  const teil = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${teil(r)}${teil(g)}${teil(b)}`;
}

/** Relative Leuchtdichte nach WCAG 2.1 */
function leuchtdichte(farbe: Rgb): number {
  const kanal = (wert: number) => {
    const v = wert / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * kanal(farbe.r) + 0.7152 * kanal(farbe.g) + 0.0722 * kanal(farbe.b);
}

/** Kontrastverhältnis zweier Farben (1 = identisch, 21 = Schwarz zu Weiß) */
export function kontrast(hexA: string, hexB: string): number {
  const a = leuchtdichte(hexZuRgb(hexA));
  const b = leuchtdichte(hexZuRgb(hexB));
  const hell = Math.max(a, b);
  const dunkel = Math.min(a, b);
  return (hell + 0.05) / (dunkel + 0.05);
}

/** Schrift, die auf dieser Hintergrundfarbe am besten lesbar ist. */
export function textAuf(hintergrund: string): string {
  return kontrast(hintergrund, HELL) >= kontrast(hintergrund, DUNKEL) ? HELL : DUNKEL;
}

/**
 * Marken-Farbe als Textfarbe auf hellem Grund: so weit abdunkeln, bis sie
 * gegen Weiß mindestens 4.5:1 erreicht. Reines Weiß wird dabei zu Grau —
 * das ist ehrlicher als unsichtbare Schrift.
 */
export function alsTextfarbe(hex: string, mindestKontrast = 4.5): string {
  let farbe = hexZuRgb(hex);
  // Farblose Töne (Weiß/sehr helles Grau) haben keine Richtung zum Abdunkeln:
  // dann direkt auf einen dunklen Neutralton gehen.
  if (farbe.r > 240 && farbe.g > 240 && farbe.b > 240) return "#3f4654";

  let versuche = 0;
  while (kontrast(rgbZuHex(farbe), HELL) < mindestKontrast && versuche < 40) {
    farbe = { r: farbe.r * 0.9, g: farbe.g * 0.9, b: farbe.b * 0.9 };
    versuche++;
  }
  return rgbZuHex(farbe);
}

/**
 * Zweite Farbe für einen Verlauf: dunklere Variante der Marken-Farbe, damit
 * heller Hintergrund nicht in ein zufälliges Dunkelblau kippt.
 */
export function verlaufsEnde(hex: string): string {
  const f = hexZuRgb(hex);
  const dunkler = { r: f.r * 0.35, g: f.g * 0.35, b: f.b * 0.35 };
  // Fast weiße Töne: nicht ins Graue kippen lassen, sondern klar abdunkeln
  if (f.r > 240 && f.g > 240 && f.b > 240) return "#4a4f5c";
  return rgbZuHex(dunkler);
}

/** Alles, was die Oberflächen für ein Farbschema brauchen. */
export function farbschema(primary: string, accent: string) {
  return {
    primary,
    accent,
    /** Schrift auf der Hauptfarbe */
    aufPrimary: textAuf(primary),
    /** Schrift auf der Akzentfarbe */
    aufAccent: textAuf(accent),
    /** Hauptfarbe als Schrift auf hellem Grund */
    primaryText: alsTextfarbe(primary),
    /** Akzentfarbe als Schrift auf hellem Grund */
    accentText: alsTextfarbe(accent),
    /** Verlaufsende für großflächige Hintergründe */
    primaryDunkel: verlaufsEnde(primary),
  };
}

export type Farbschema = ReturnType<typeof farbschema>;
