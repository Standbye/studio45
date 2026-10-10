/**
 * Liest aus dem Spielsteckbrief, was von der Gruppe kam und was die KI ergänzt hat.
 *
 * Die Listen schreibt das Modell (siehe prompts/kern.md) — sie sind also fremder Text:
 * nur als Text anzeigen, Länge und Anzahl begrenzen, nie als HTML einsetzen.
 */
export type Herkunft = { gruppe: string[]; ki: string[] };

const MAX_EINTRAEGE = 12;
const MAX_ZEICHEN = 90;

function liste(block: string, feld: string): string[] {
  const zeilen = block.split("\n");
  const start = zeilen.findIndex((z) => z.trim().toLowerCase() === `${feld}:`);
  if (start < 0) return [];
  const eintraege: string[] = [];
  for (const zeile of zeilen.slice(start + 1)) {
    const m = zeile.match(/^\s*[-•*]\s+(.+?)\s*$/);
    if (!m) break; // nächste Überschrift oder Ende
    const text = m[1].replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, MAX_ZEICHEN);
    if (text && text.toLowerCase() !== "nichts") eintraege.push(text);
    if (eintraege.length >= MAX_EINTRAEGE) break;
  }
  return eintraege;
}

/** null, wenn das Spiel (noch) keinen Steckbrief mit Herkunftsangaben hat. */
export function leseHerkunft(html: string | null): Herkunft | null {
  if (!html) return null;
  const block = html.match(/<!--\s*STUDIO45\s*\n([\s\S]{0,6000}?)-->/)?.[1];
  if (!block || !/von_der_ki\s*:/i.test(block)) return null;
  return { gruppe: liste(block, "von_der_gruppe"), ki: liste(block, "von_der_ki") };
}
