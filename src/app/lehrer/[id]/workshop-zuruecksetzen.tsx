"use client";

import { Button } from "@/components/ui/button";
import { resetWorkshopAction } from "../actions";

/** Workshop auf Anfang — mit Rückfrage, weil sich die Spiele nicht zurückholen lassen. */
export function WorkshopZuruecksetzen({ workshopId, name }: { workshopId: string; name: string }) {
  return (
    <form
      action={resetWorkshopAction}
      onSubmit={(e) => {
        const frage =
          `„${name}“ zurücksetzen?\n\n` +
          "Gelöscht werden alle Spiele, Verläufe und Versuche der Gruppen, offene Director's Cuts und die Lernfall-Prüflisten. " +
          "Der Workshop steht danach auf Tag 1 im Plenum.\n\n" +
          "Es bleiben: Gruppen mit Namen und QR-Codes, ihre Regler und alle Einstellungen.\n\n" +
          "Das lässt sich nicht zurückholen.";
        if (!window.confirm(frage)) e.preventDefault();
      }}
    >
      <input type="hidden" name="workshopId" value={workshopId} />
      <Button type="submit" variant="destructive">
        Workshop zurücksetzen
      </Button>
    </form>
  );
}
