"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type Props = Omit<React.ComponentProps<typeof Button>, "type"> & {
  /** Text der Rückmeldung nach dem Speichern */
  fertigText?: string;
};

/**
 * Absende-Knopf für Formulare mit Server-Action: zeigt, dass gespeichert WIRD, und danach,
 * dass gespeichert IST. Ohne das sieht ein Formular nach dem Speichern aus wie davor.
 * Die Rückmeldung verschwindet, sobald wieder etwas im Formular geändert wird.
 */
export function SpeichernKnopf({ children = "Speichern", fertigText = "Gespeichert", ...knopf }: Props) {
  const { pending } = useFormStatus();
  const [lief, setLief] = useState(false);
  const [fertig, setFertig] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Übergang „läuft → fertig" erkennen (Zustand beim Rendern nachführen, kein Effekt nötig)
  if (pending !== lief) {
    setLief(pending);
    if (!pending) setFertig(true);
  }

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const geaendert = () => setFertig(false);
    form.addEventListener("input", geaendert);
    return () => form.removeEventListener("input", geaendert);
  }, []);

  return (
    <span ref={ref} className="inline-flex items-center gap-3">
      <Button {...knopf} type="submit" disabled={pending || knopf.disabled}>
        {pending ? "Wird gespeichert …" : children}
      </Button>
      {fertig && !pending && (
        <span role="status" className="text-sm font-medium text-emerald-700">
          ✓ {fertigText}
        </span>
      )}
    </span>
  );
}
