"use client";

import { Button } from "@/components/ui/button";
import { Auswahl } from "@/components/auswahl";
import { HILFE_STUFEN, SUPPORT_STUFEN } from "@/lib/audience";
import { resetGroupLevelsAction, setGroupLevelsAction } from "../actions";

/**
 * Eigene Regler einer Gruppe: Unterschiedlich starke Gruppen lassen sich unterschiedlich
 * begleiten. „wie Workshop" ist der Normalfall; eine Auswahl wird sofort gespeichert.
 * Die Gruppe selbst sieht davon nichts — auf ihrem Gerät steht keine Stufe.
 */
export function GruppenRegler({
  groupId,
  supportLevel,
  helpLevel,
  workshopSupport,
  workshopHelp,
}: {
  groupId: string;
  supportLevel: number | null;
  helpLevel: number | null;
  workshopSupport: number;
  workshopHelp: number;
}) {
  const wsSpielraum = SUPPORT_STUFEN.find((s) => s.stufe === workshopSupport);
  const wsHilfe = HILFE_STUFEN.find((h) => h.stufe === workshopHelp);
  const feld = "h-8 w-full rounded-md border bg-transparent px-2 text-xs";
  const eigen = "border-amber-400 bg-amber-50";

  return (
    <form action={setGroupLevelsAction} className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="groupId" value={groupId} />
      <label className="space-y-1 text-xs text-muted-foreground">
        Spielraum der KI
        <Auswahl
          name="supportLevel"
          wert={String(supportLevel ?? "")}
          onWert={(_, feld) => feld.form?.requestSubmit()}
          className={`${feld} ${supportLevel !== null ? eigen : ""}`}
        >
          <option value="">wie Workshop ({wsSpielraum?.stufe} — {wsSpielraum?.name})</option>
          {SUPPORT_STUFEN.map((s) => (
            <option key={s.stufe} value={s.stufe}>
              {s.stufe} — {s.name}
            </option>
          ))}
        </Auswahl>
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        Hilfe beim Formulieren
        <Auswahl
          name="helpLevel"
          wert={String(helpLevel ?? "")}
          onWert={(_, feld) => feld.form?.requestSubmit()}
          className={`${feld} ${helpLevel !== null ? eigen : ""}`}
        >
          <option value="">wie Workshop ({wsHilfe?.name})</option>
          {HILFE_STUFEN.map((h) => (
            <option key={h.stufe} value={h.stufe}>
              {h.name}
            </option>
          ))}
        </Auswahl>
      </label>
    </form>
  );
}

/** Alle Gruppen auf einmal zurück auf die Einstellung des Workshops — mit Rückfrage. */
export function AlleZuruecksetzen({ workshopId, anzahl }: { workshopId: string; anzahl: number }) {
  return (
    <form
      action={resetGroupLevelsAction}
      onSubmit={(e) => {
        if (!window.confirm(`${anzahl === 1 ? "Eine Gruppe hat" : `${anzahl} Gruppen haben`} eigene Einstellungen. Alle auf die Einstellung des Workshops zurückstellen?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="workshopId" value={workshopId} />
      <Button type="submit" size="sm" variant="outline">
        Alle Gruppen auf Workshop-Einstellung
      </Button>
    </form>
  );
}
