/**
 * Token-Transparenz: was das Bauen kostet — in Tokens, Euro und Alltagsenergie.
 *
 * Die Euro-Preise pflegt der Admin an der KI-Verbindung (0 = keine Anzeige).
 * Der Energie-Faktor ist eine ehrliche GROBE Schätzung: was ein Token wirklich
 * an Strom kostet, hängt von Modell und Rechenzentrum ab und ist öffentlich
 * nur ungefähr bekannt. Der Standardwert liegt in der Mitte der Literatur
 * (~0,1–1 J pro Token) und lässt sich pro Verbindung überschreiben.
 */

/** Wh pro 1 Mio Tokens, wenn die Verbindung nichts anderes vorgibt (≈ 0,36 J/Token). */
export const STANDARD_WH_PRO_M = 100;

/** Alltagsanker für den Energievergleich. */
const HANDY_AKKU_WH = 12; // typischer Smartphone-Akku
const RAD_WATT = 100; //     Dauerleistung beim zügigen Radfahren
const LED_WATT = 8; //       eine helle LED-Lampe

export type VerbindungsTarife = {
  eurPerMTokensIn: number;
  eurPerMTokensOut: number;
  whPerMTokens: number;
} | null;

export function tokenText(n: number): string {
  return n.toLocaleString("de-DE");
}

/** Euro-Kosten, oder null wenn keine Preise hinterlegt sind. */
export function euroKosten(tokensIn: number, tokensOut: number, tarife: VerbindungsTarife): number | null {
  if (!tarife || (tarife.eurPerMTokensIn <= 0 && tarife.eurPerMTokensOut <= 0)) return null;
  return (tokensIn / 1_000_000) * tarife.eurPerMTokensIn + (tokensOut / 1_000_000) * tarife.eurPerMTokensOut;
}

export function euroText(betrag: number): string {
  if (betrag > 0 && betrag < 0.01) return "unter 0,01 €";
  return `${betrag.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function wattstunden(tokens: number, tarife: VerbindungsTarife): number {
  const faktor = tarife && tarife.whPerMTokens > 0 ? tarife.whPerMTokens : STANDARD_WH_PRO_M;
  return (tokens / 1_000_000) * faktor;
}

/** Kindgerechte Rundung: unter 10 eine Nachkommastelle, darüber ganze Zahlen. */
function rund(n: number): string {
  const wert = n < 10 ? Math.round(n * 10) / 10 : Math.round(n);
  return wert.toLocaleString("de-DE");
}

/**
 * Übersetzt Wattstunden in greifbare Vergleiche.
 * Liefert Zeilen wie „≈ 3× Handy laden" — bei sehr kleinen Werten ehrlich „weniger als …".
 */
export function energieVergleich(wh: number): string[] {
  if (wh <= 0) return [];
  const handy = wh / HANDY_AKKU_WH;
  const radMinuten = (wh / RAD_WATT) * 60;
  const ledStunden = wh / LED_WATT;
  return [
    handy >= 0.1 ? `≈ ${rund(handy)}× Handy laden` : "weniger als ein Zehntel Handy-Akku",
    radMinuten >= 1 ? `≈ ${rund(radMinuten)} Minuten Radfahren` : "weniger als 1 Minute Radfahren",
    ledStunden >= 0.1 ? `≈ ${rund(ledStunden)} Stunden LED-Lampe` : "ein kurzes LED-Blinken",
  ];
}
