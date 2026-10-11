"use client";

import { useState } from "react";
import { Vorlesen } from "./vorlesen";

/**
 * Was die Gruppe beobachtet hat → ein Wunsch, mit dem die KI etwas anfangen kann.
 * `wunsch` ist der fertige Satz; „{genauer}" wird durch die Beschreibung der Gruppe ersetzt.
 */
const BEOBACHTUNGEN = [
  { zeichen: "👆", text: "Ein Knopf oder Antippen reagiert nicht", wunsch: "Wir haben einen Fehler gefunden: Ein Knopf oder das Antippen reagiert nicht.{genauer} Repariere nur das — alles andere bleibt, wie es ist." },
  { zeichen: "🏃", text: "Die Figur bewegt sich nicht richtig", wunsch: "Wir haben einen Fehler gefunden: Die Figur bewegt sich nicht richtig.{genauer} Repariere nur das — alles andere bleibt, wie es ist." },
  { zeichen: "🧱", text: "Das Spiel bleibt hängen", wunsch: "Wir haben einen Fehler gefunden: Das Spiel bleibt hängen und geht nicht weiter.{genauer} Repariere nur das — alles andere bleibt, wie es ist." },
  { zeichen: "🔁", text: "Neu starten geht nicht", wunsch: "Wir haben einen Fehler gefunden: Man kann das Spiel nicht neu starten.{genauer} Repariere nur das — alles andere bleibt, wie es ist." },
  { zeichen: "👀", text: "Man sieht etwas nicht richtig", wunsch: "Wir haben einen Fehler gefunden: Man sieht etwas nicht richtig.{genauer} Repariere nur das — alles andere bleibt, wie es ist." },
  { zeichen: "😵", text: "Es ist zu schwer", wunsch: "Unser Spiel ist zu schwer.{genauer} Mach es etwas leichter — alles andere bleibt, wie es ist." },
  { zeichen: "😴", text: "Es ist zu leicht", wunsch: "Unser Spiel ist zu leicht.{genauer} Mach es etwas schwerer — alles andere bleibt, wie es ist." },
  { zeichen: "✏️", text: "Etwas anderes", wunsch: "Wir haben einen Fehler gefunden:{genauer} Repariere nur das — alles andere bleibt, wie es ist." },
] as const;

type Props = {
  vorlesen: boolean;
  /** Der fertige Wunsch — er wandert ins Eingabefeld, gebaut wird erst, wenn die Gruppe abschickt */
  onFertig: (wunsch: string) => void;
  onZu: () => void;
};

/**
 * „Etwas geht nicht": geführte Fehlermeldung. Aus „es passiert nichts" wird eine Meldung,
 * die sagt, WAS nicht geht und WANN — die Gruppe wählt aus und ergänzt einen Satz.
 */
export function FehlerMelden({ vorlesen, onFertig, onZu }: Props) {
  const [wahl, setWahl] = useState<number | null>(null);
  const [genauer, setGenauer] = useState("");
  const gewaehlt = wahl === null ? null : BEOBACHTUNGEN[wahl];
  const brauchtText = gewaehlt?.text === "Etwas anderes";

  function fertig() {
    if (!gewaehlt) return;
    const g = genauer.trim().replace(/[.!?]+$/, "");
    onFertig(gewaehlt.wunsch.replace("{genauer}", g ? ` Genauer: ${g}.` : ""));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 text-slate-900">
      <div className="max-h-[92svh] w-full max-w-lg space-y-4 overflow-y-auto bg-white p-6" style={{ borderRadius: "var(--s45-radius)" }}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-black" style={{ color: "var(--s45-primary-text)" }}>
            🐞 Etwas geht nicht
          </h2>
          {vorlesen && (
            <Vorlesen
              text={
                gewaehlt
                  ? `${gewaehlt.text}. Wann passiert es? Was habt ihr gemacht?`
                  : `Was habt ihr beobachtet? ${BEOBACHTUNGEN.map((b) => b.text).join(". ")}.`
              }
            />
          )}
        </div>

        {!gewaehlt ? (
          <>
            <p className="text-base">Was habt ihr beobachtet?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {BEOBACHTUNGEN.map((b, i) => (
                <button
                  key={b.text}
                  onClick={() => setWahl(i)}
                  className="flex items-center gap-3 border-2 border-slate-200 p-3 text-left text-base font-semibold"
                  style={{ borderRadius: "var(--s45-radius)" }}
                >
                  <span className="text-2xl">{b.zeichen}</span>
                  {b.text}
                </button>
              ))}
            </div>
            <button onClick={onZu} className="w-full text-center text-sm text-slate-500 underline">
              Abbrechen
            </button>
          </>
        ) : (
          <>
            <p className="rounded-lg bg-slate-100 p-3 text-base font-semibold">
              {gewaehlt.zeichen} {gewaehlt.text}
            </p>
            <label className="block text-base font-semibold">
              Wann passiert es? Was habt ihr gemacht?
              <textarea
                value={genauer}
                onChange={(e) => setGenauer(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Zum Beispiel: wenn man zweimal schnell auf Start tippt"
                className="mt-1 w-full resize-none border-2 border-slate-200 p-3 text-base font-normal"
                style={{ borderRadius: "var(--s45-radius)" }}
              />
            </label>
            <p className="text-sm text-slate-500">
              Je genauer ihr den Fehler beschreibt, desto eher kann die KI ihn reparieren.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setWahl(null)}
                className="flex-1 border-2 border-slate-300 py-3 font-bold text-slate-600"
                style={{ borderRadius: "var(--s45-radius)" }}
              >
                Zurück
              </button>
              <button
                onClick={fertig}
                disabled={brauchtText && genauer.trim().length < 3}
                className="flex-1 py-3 font-black disabled:opacity-40"
                style={{ background: "var(--s45-primary)", color: "var(--s45-auf-primary)", borderRadius: "var(--s45-radius)" }}
              >
                In den Wunsch schreiben
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
