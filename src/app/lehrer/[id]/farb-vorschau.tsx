"use client";

import { useState } from "react";
import { farbschema, kontrast } from "@/lib/kontrast";
import { Label } from "@/components/ui/label";

/**
 * Farbwahl mit sofortiger Vorschau.
 *
 * Ohne sie wählt eine Lehrkraft ihr Schulweiß und wundert sich, warum die
 * Schüler-Seite leer aussieht. Studio45 rechnet die Schriftfarben aus — hier
 * sieht man das Ergebnis, bevor es die Klasse sieht.
 */
export function FarbVorschau({ primary, accent }: { primary: string; accent: string }) {
  const [haupt, setHaupt] = useState(primary);
  const [akzent, setAkzent] = useState(accent);
  const f = farbschema(haupt, akzent);

  const kHaupt = kontrast(f.primary, f.aufPrimary);
  const kAkzent = kontrast(f.accent, f.aufAccent);
  const hell = kontrast(f.primary, "#ffffff") < 1.6;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-6">
        <div className="space-y-2">
          <Label htmlFor="colorPrimary">Hauptfarbe</Label>
          <input
            id="colorPrimary"
            name="colorPrimary"
            type="color"
            value={haupt}
            onChange={(e) => setHaupt(e.target.value)}
            className="h-10 w-20 cursor-pointer rounded border"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="colorAccent">Akzentfarbe</Label>
          <input
            id="colorAccent"
            name="colorAccent"
            type="color"
            value={akzent}
            onChange={(e) => setAkzent(e.target.value)}
            className="h-10 w-20 cursor-pointer rounded border"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div
          className="flex items-center gap-3 px-3 py-2 text-sm font-bold"
          style={{ background: f.primary, color: f.aufPrimary }}
        >
          Studio-Name
          <span
            className="ml-auto rounded-full px-3 py-0.5 text-xs"
            style={{ background: f.accent, color: f.aufAccent }}
          >
            Noch 3 Versuche
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-white p-3">
          <span
            className="rounded-full border-2 px-3 py-1 text-xs font-semibold"
            style={{ borderColor: f.primaryText, color: f.primaryText }}
          >
            Unser Spiel heißt …
          </span>
          <span
            className="rounded-lg px-4 py-2 text-sm font-black"
            style={{ background: f.accent, color: f.aufAccent }}
          >
            Bauen!
          </span>
          <span className="text-xs" style={{ color: f.primaryText }}>
            Überschrift im Druckmaterial
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Schrift auf der Hauptfarbe: Kontrast {kHaupt.toFixed(1)}:1 · auf der Akzentfarbe:{" "}
        {kAkzent.toFixed(1)}:1. Studio45 wählt automatisch helle oder dunkle Schrift und dunkelt
        sehr helle Farben ab, wo sie als Text auf weißem Grund stehen.
        {hell && (
          <>
            {" "}
            <b>Hinweis:</b> Ein sehr heller Hauptton wirkt auf der Beamer-Seite blass — kräftige
            Töne kommen im Klassenzimmer besser an.
          </>
        )}
      </p>
    </div>
  );
}
