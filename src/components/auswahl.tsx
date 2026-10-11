"use client";

import { useEffect, useRef, useState } from "react";

type Props = Omit<React.ComponentProps<"select">, "value" | "defaultValue" | "onChange"> & {
  /** Der gespeicherte Wert (vom Server) bzw. der Startwert */
  wert: string;
  /** Wird nach jeder Auswahl aufgerufen — das Feld selbst zeigt den neuen Wert dann schon */
  onWert?: (wert: string, feld: HTMLSelectElement) => void;
};

/**
 * Auswahlfeld für Formulare mit Server-Action.
 *
 * Warum nicht einfach <select>? React setzt ein Formular nach dem Speichern zurück. Ein
 * <select> springt dabei auf den Eintrag, mit dem es aufgebaut wurde — egal ob mit
 * defaultValue oder value. Es sieht dann aus, als wäre nichts gespeichert worden.
 * Dieses Feld merkt sich die Auswahl, übernimmt einen neuen gespeicherten Wert vom Server
 * und stellt die Anzeige nach dem Zurücksetzen wieder her.
 */
export function Auswahl({ wert, onWert, children, ...rest }: Props) {
  const [aktuell, setAktuell] = useState(wert);
  const [vorgabe, setVorgabe] = useState(wert);
  // Neuer gespeicherter Wert vom Server → übernehmen (Zustand beim Rendern nachführen)
  if (wert !== vorgabe) {
    setVorgabe(wert);
    setAktuell(wert);
  }

  const feld = useRef<HTMLSelectElement>(null);
  const zuletzt = useRef(aktuell);
  useEffect(() => {
    zuletzt.current = aktuell;
  }, [aktuell]);

  useEffect(() => {
    const el = feld.current;
    const form = el?.form;
    if (!el || !form) return;
    // „reset" feuert, bevor der Browser die Felder zurücksetzt — danach die Auswahl wiederherstellen
    const nachReset = () => setTimeout(() => (el.value = zuletzt.current), 0);
    form.addEventListener("reset", nachReset);
    return () => form.removeEventListener("reset", nachReset);
  }, []);

  return (
    <select
      {...rest}
      ref={feld}
      value={aktuell}
      onChange={(e) => {
        setAktuell(e.target.value);
        onWert?.(e.target.value, e.currentTarget);
      }}
    >
      {children}
    </select>
  );
}
