"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { SUPPORT_STUFEN } from "@/lib/audience";

/**
 * Regler 1–5 für die Unterstützung durch die KI. Die Wirkung steht direkt
 * darunter — sonst rät die Lehrkraft, was „3" bedeutet.
 */
export function SupportLevelWahl({ standard }: { standard: number }) {
  const [stufe, setStufe] = useState(standard);
  const profil = SUPPORT_STUFEN.find((s) => s.stufe === stufe) ?? SUPPORT_STUFEN[2];

  return (
    <div className="space-y-2">
      <Label htmlFor="supportLevel">
        Unterstützung durch die KI: <span className="text-primary">{profil.stufe} — {profil.name}</span>
      </Label>
      <input
        id="supportLevel"
        name="supportLevel"
        type="range"
        min={1}
        max={5}
        step={1}
        value={stufe}
        onChange={(e) => setStufe(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-[0.7rem] text-muted-foreground">
        <span>1 · viel Hilfe</span>
        <span>5 · reines Werkzeug</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {profil.kurz}
        {profil.chips || profil.teamCheck || profil.coachAbZeichen > 0 ? " Auf der Schüler-Seite: " : " Keine Hilfen auf der Schüler-Seite."}
        {[
          profil.chips ? "Satz-Vorschläge" : null,
          profil.teamCheck ? "Team-Check vor dem Bauen" : null,
          profil.coachAbZeichen > 0 ? "Formulierungshilfe bei kurzen Wünschen" : null,
        ]
          .filter(Boolean)
          .join(", ")}
        {profil.chips || profil.teamCheck || profil.coachAbZeichen > 0 ? "." : ""}
      </p>
    </div>
  );
}
