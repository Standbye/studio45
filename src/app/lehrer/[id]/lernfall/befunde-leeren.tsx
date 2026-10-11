"use client";

import { Button } from "@/components/ui/button";
import { resetLernfallBefundeAction } from "../../actions";

/** Prüflisten aller Gruppen leeren — mit Rückfrage, weil es sich nicht zurückholen lässt. */
export function BefundeLeeren({ workshopId }: { workshopId: string }) {
  return (
    <form
      action={resetLernfallBefundeAction}
      onSubmit={(e) => {
        if (!window.confirm("Die Prüflisten aller Gruppen leeren? Das lässt sich nicht zurückholen.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="workshopId" value={workshopId} />
      <Button type="submit" size="sm" variant="outline">
        Prüflisten leeren
      </Button>
    </form>
  );
}
