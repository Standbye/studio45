"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export type VorschauBlock = {
  titel: string;
  herkunft: string;
  editierbar: boolean;
  text: string;
};

/**
 * Zeigt der Lehrkraft den vollständigen Metaprompt, aus dem die KI baut —
 * mit Herkunft jedes Blocks. Die didaktische Zone kann sie übernehmen und
 * überschreiben; der Kern ist sichtbar, aber unveränderlich.
 */
export function PromptVorschau({
  bloecke,
  eigeneFassung,
  standardFassung,
}: {
  bloecke: VorschauBlock[];
  eigeneFassung: string;
  standardFassung: string;
}) {
  const [offen, setOffen] = useState<string | null>(null);
  const [eigen, setEigen] = useState(eigeneFassung);
  const bearbeitet = eigen.trim().length > 0;

  return (
    <div className="space-y-3">
      {bloecke.map((b) => {
        const istOffen = offen === b.titel;
        return (
          <div key={b.titel} className="rounded-lg border">
            <button
              type="button"
              onClick={() => setOffen(istOffen ? null : b.titel)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
            >
              <span className="font-medium">{b.titel}</span>
              {b.editierbar ? (
                <Badge variant={bearbeitet ? "default" : "secondary"}>
                  {bearbeitet ? "eigene Fassung" : "anpassbar"}
                </Badge>
              ) : (
                <Badge variant="outline">fest</Badge>
              )}
              <span className="ml-auto text-xs text-muted-foreground">{istOffen ? "▲" : "▼"}</span>
            </button>
            {istOffen && (
              <div className="space-y-2 border-t px-3 py-3">
                <p className="text-xs text-muted-foreground">Herkunft: {b.herkunft}</p>
                {b.editierbar ? (
                  <>
                    <Textarea
                      name="promptDidactic"
                      value={eigen || b.text}
                      onChange={(e) => setEigen(e.target.value)}
                      rows={16}
                      className="font-mono text-xs"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEigen("")}
                        disabled={!bearbeitet}
                      >
                        Auf Standard zurücksetzen
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {bearbeitet
                          ? "Eigene Fassung — Zielgruppe und Unterstützungslevel wirken hier nicht mehr automatisch."
                          : "Wird automatisch aus Zielgruppe, Unterstützungslevel und Lernziel erzeugt. Beim Bearbeiten übernimmst du diesen Text."}
                      </span>
                    </div>
                  </>
                ) : (
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-3 font-mono text-xs">
                    {b.text}
                  </pre>
                )}
              </div>
            )}
          </div>
        );
      })}
      {/* Feld immer mitschicken, auch wenn der Block zugeklappt ist */}
      {offen !== bloecke.find((b) => b.editierbar)?.titel && (
        <input type="hidden" name="promptDidactic" value={eigen} />
      )}
      <p className="text-xs text-muted-foreground">
        Änderungen gelten ab der <b>nächsten</b> Generierung. Der feste Kern (Ausgabeformat,
        Sandbox-Grenzen, Kinderschutz, Qualitätsuntergrenze) lässt sich nicht abschalten —
        er hält die Spiele lauffähig und sicher.
      </p>
      {standardFassung !== eigen && bearbeitet && (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm">Standard-Fassung zum Vergleich anzeigen</summary>
          <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-3 font-mono text-xs">
            {standardFassung}
          </pre>
        </details>
      )}
    </div>
  );
}
