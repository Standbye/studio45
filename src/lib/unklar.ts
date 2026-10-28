/**
 * Unklare Wörter in einem Wunsch — „Mach schöner hilft nicht“ (Kernbotschaft, Konzept
 * Abschnitt 1). Sie lösen die Formulierungshilfe auch bei langen Wünschen aus; die Hilfe
 * fragt dann, was genau gemeint ist („Was genau soll passieren, wenn …?“).
 *
 * Bewusst eine kurze Liste von Wertungen ohne Inhalt, keine Grammatik-Prüfung: Ein Treffer
 * zu viel kostet eine Rückfrage, einer zu wenig nur die Chance darauf.
 */
const UNKLAR = [
  "schöner", "schön", "besser", "cooler", "cool", "toller", "toll", "spannender", "lustiger",
  "witziger", "interessanter", "moderner", "hübscher", "professioneller", "krasser", "geiler",
  "irgendwie", "irgendwas", "bisschen", "verbessern", "aufhübschen", "optimieren",
  "anders",
];

/** Liefert die unklaren Wörter in der Reihenfolge ihres ersten Auftretens (ohne Dopplungen). */
export function unklareWoerter(text: string): string[] {
  const gefunden: string[] = [];
  for (const roh of text.toLowerCase().split(/[^a-zäöüß]+/)) {
    if (roh && UNKLAR.includes(roh) && !gefunden.includes(roh)) gefunden.push(roh);
  }
  return gefunden;
}
