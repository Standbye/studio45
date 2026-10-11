"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Es liest immer nur einer vor: Der zuletzt gestartete Knopf setzt den vorherigen zurück. */
let stoppeAktiven: (() => void) | null = null;

const ohneAbo = () => () => {};

/**
 * Lautsprecher-Knopf: liest einen Text mit der Sprachausgabe des Geräts vor.
 * Für Kinder, die noch nicht sicher lesen. Kostet nichts und braucht kein Netz.
 * Gibt es auf dem Gerät keine Sprachausgabe, erscheint der Knopf nicht.
 */
export function Vorlesen({ text, hell = false }: { text: string; hell?: boolean }) {
  const kann = useSyncExternalStore(ohneAbo, () => "speechSynthesis" in window, () => false);
  const [spricht, setSpricht] = useState(false);

  // Beim Verlassen (Dialog zu, Seite gewechselt) nicht weiterreden
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (!kann) return null;

  function umschalten() {
    const synth = window.speechSynthesis;
    synth.cancel();
    stoppeAktiven?.();
    stoppeAktiven = null;
    if (spricht) {
      setSpricht(false);
      return;
    }
    const satz = new SpeechSynthesisUtterance(text);
    satz.lang = "de-DE";
    satz.rate = 0.95;
    const stimme = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith("de"));
    if (stimme) satz.voice = stimme;
    const fertig = () => setSpricht(false);
    satz.onend = fertig;
    satz.onerror = fertig;
    stoppeAktiven = fertig;
    setSpricht(true);
    synth.speak(satz);
  }

  return (
    <button
      type="button"
      onClick={umschalten}
      aria-label={spricht ? "Vorlesen stoppen" : "Vorlesen"}
      title={spricht ? "Vorlesen stoppen" : "Vorlesen"}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-lg ${
        hell ? "border-white/60 bg-white/15" : "border-slate-300 bg-white"
      } ${spricht ? "animate-pulse" : ""}`}
    >
      {spricht ? "⏹" : "🔊"}
    </button>
  );
}
