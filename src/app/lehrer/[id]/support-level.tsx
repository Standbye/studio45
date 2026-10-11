"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Auswahl } from "@/components/auswahl";
import { HILFE_STUFEN, SUPPORT_STUFEN } from "@/lib/audience";

/**
 * Zwei getrennte Regler:
 *  - Spielraum der KI (Leitplanken): Wie viel darf die KI selbst ergänzen und entscheiden?
 *  - Hilfe beim Formulieren: Welche sprachliche Unterstützung sieht die Gruppe?
 * Früher war das ein Regler — wer Sprachhilfe brauchte, bekam zwangsläufig eine KI, die
 * mitentscheidet. Die Wirkung steht direkt darunter, sonst rät man, was „3" bedeutet.
 */
export function SpielraumWahl({ standard }: { standard: number }) {
  const [stufe, setStufe] = useState(standard);
  const profil = SUPPORT_STUFEN.find((s) => s.stufe === stufe) ?? SUPPORT_STUFEN[2];

  return (
    <div className="space-y-2">
      <Label htmlFor="supportLevel">
        Spielraum der KI (Leitplanken): <span className="text-primary">{profil.stufe} — {profil.name}</span>
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
        <span>1 · weit: die KI denkt mit</span>
        <span>5 · eng: nur was verlangt ist</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {profil.kurz} Je enger die Leitplanken, desto genauer trifft das Ergebnis den Wunsch — und
        desto weniger überrascht es. Was die KI von sich aus ergänzt, sieht die Gruppe nach jedem Bau.
      </p>
    </div>
  );
}

export function HilfeWahl({ standard }: { standard: number }) {
  const [stufe, setStufe] = useState(standard);
  const profil = HILFE_STUFEN.find((h) => h.stufe === stufe) ?? HILFE_STUFEN[2];

  return (
    <div className="space-y-2">
      <Label htmlFor="helpLevel">Hilfe beim Formulieren</Label>
      <Auswahl
        id="helpLevel"
        name="helpLevel"
        wert={String(standard)}
        onWert={(wert) => setStufe(Number(wert))}
        className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
      >
        {HILFE_STUFEN.map((h) => (
          <option key={h.stufe} value={h.stufe}>
            {h.name}
          </option>
        ))}
      </Auswahl>
      <p className="text-xs text-muted-foreground">
        {profil.kurz} Das ändert nichts daran, was die KI aus dem Wunsch macht — entscheiden
        darf die Gruppe selbst.
      </p>
    </div>
  );
}
