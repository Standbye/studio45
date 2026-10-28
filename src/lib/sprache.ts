/**
 * Spracheingabe datensparsam: Kann der Browser Deutsch direkt auf dem Gerät erkennen
 * (neuere Chrome-Versionen, „on-device speech recognition“), nutzen wir das — dann verlässt
 * keine Aufnahme das Gerät. Sonst bleibt nur der Sprachdienst des Browsers (Chrome → Google,
 * Safari → Apple), und die Gruppe sieht vorher einen Hinweis (Konzept Abschnitt 7 und 9).
 *
 * Die Schnittstelle ist neu und nicht überall gleich; alles defensiv, jeder Fehler heißt
 * „nicht lokal“.
 */

/** Workshop-Einstellung: "" = an, "lokal" = nur auf dem Gerät, "aus" = nur tippen */
export type SprachModus = "" | "lokal" | "aus";

type SpracherkennungKlasse = {
  available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string>;
  install?: (o: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
};

const OPTIONEN = { langs: ["de-DE"], processLocally: true };

/**
 * Kann dieses Gerät Deutsch lokal erkennen? Mit `installieren` wird ein fehlendes
 * Sprachpaket nachgeladen (geht nur direkt nach einem Tippen der Gruppe).
 */
export async function lokalMoeglich(SR: SpracherkennungKlasse, installieren: boolean): Promise<boolean> {
  try {
    if (typeof SR.available !== "function") return false;
    const stand = await SR.available(OPTIONEN);
    if (stand === "available") return true;
    if (installieren && stand === "downloadable" && typeof SR.install === "function") {
      return await SR.install(OPTIONEN);
    }
    return false;
  } catch {
    return false;
  }
}

/** Merkt sich pro Gerät, dass die Gruppe den Hinweis zum Sprachdienst gesehen hat. */
const HINWEIS_KEY = "s45-sprachhinweis";

export function hinweisGesehen(): boolean {
  try {
    return localStorage.getItem(HINWEIS_KEY) === "1";
  } catch {
    return false;
  }
}

export function merkeHinweis(): void {
  try {
    localStorage.setItem(HINWEIS_KEY, "1");
  } catch {
    /* ohne Speicher kommt der Hinweis eben wieder */
  }
}
