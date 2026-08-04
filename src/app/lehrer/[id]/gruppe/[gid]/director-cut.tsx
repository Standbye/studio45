"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DirectorCutDialog({ groupId, studioName }: { groupId: string; studioName: string }) {
  const router = useRouter();
  const [spec, setSpec] = useState("");
  const [engine3d, setEngine3d] = useState(false);
  const [busy, setBusy] = useState<"" | "destillieren" | "bauen">("");
  const [sekunden, setSekunden] = useState(0);
  const [fehler, setFehler] = useState("");
  const [fertig, setFertig] = useState(false);

  useEffect(() => {
    if (!busy) return;
    setSekunden(0);
    const t = setInterval(() => setSekunden((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function ruf(aktion: "destillieren" | "bauen") {
    setBusy(aktion);
    setFehler("");
    setFertig(false);
    try {
      const res = await fetch(`/api/lehrer/${groupId}/director`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion, spec, engine3d }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFehler(data.error ?? "Unbekannter Fehler");
      } else if (aktion === "destillieren") {
        setSpec(data.spec ?? "");
      } else {
        setFertig(true);
        router.refresh();
      }
    } catch {
      setFehler("Verbindungsfehler");
    } finally {
      setBusy("");
    }
  }

  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "secondary", size: "sm" })}>
        🎬 Director&apos;s Cut
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Director&apos;s Cut — {studioName}</DialogTitle>
          <DialogDescription>
            Alle Wünsche der Gruppe werden zu einer Spezifikation verdichtet. Du kannst sie bearbeiten,
            bevor daraus ein vollständiges Spiel gebaut wird. Der bisherige Stand wird vorher gesichert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {fehler && <Alert variant="destructive"><AlertDescription>{fehler}</AlertDescription></Alert>}
          {fertig && <Alert><AlertDescription>✅ Neues Spiel veröffentlicht — der alte Stand liegt als Spielstand bereit.</AlertDescription></Alert>}

          <Button variant="outline" onClick={() => ruf("destillieren")} disabled={busy !== ""} className="w-full">
            {busy === "destillieren" ? `Wünsche werden verdichtet … (${sekunden}s)` : "1. Wünsche der Gruppe destillieren"}
          </Button>

          <Textarea
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            rows={12}
            placeholder="Hier erscheint die destillierte Spezifikation — du kannst sie frei bearbeiten oder direkt selbst schreiben."
            className="font-mono text-xs"
          />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={engine3d} onChange={(e) => setEngine3d(e.target.checked)} className="h-4 w-4" />
            Als echtes 3D-Spiel bauen (Three.js wird lokal eingebettet)
          </label>

          <Button onClick={() => ruf("bauen")} disabled={busy !== "" || spec.trim().length < 30} className="w-full">
            {busy === "bauen" ? `Spiel wird gebaut … (${sekunden}s — kann 2–3 Minuten dauern)` : "2. Spiel bauen & veröffentlichen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
