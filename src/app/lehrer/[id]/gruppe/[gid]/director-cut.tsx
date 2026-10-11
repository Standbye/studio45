"use client";

import { useCallback, useEffect, useState } from "react";
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

type Abstimmung = { status: "" | "offen" | "ja" | "nein"; spec: string; hinweis: string };

/**
 * Director's Cut: Aus allen Wünschen der Gruppe wird EIN Gesamtspiel gebaut.
 * Es bleibt das Spiel der Gruppe — deshalb sieht sie die Beschreibung vorher und stimmt zu.
 */
export function DirectorCutDialog({ groupId, studioName }: { groupId: string; studioName: string }) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [spec, setSpec] = useState("");
  const [engine3d, setEngine3d] = useState(false);
  const [busy, setBusy] = useState<"" | "destillieren" | "vorlegen" | "bauen">("");
  const [sekunden, setSekunden] = useState(0);
  const [fehler, setFehler] = useState("");
  const [fertig, setFertig] = useState(false);
  const [abstimmung, setAbstimmung] = useState<Abstimmung>({ status: "", spec: "", hinweis: "" });

  useEffect(() => {
    if (!busy) return;
    setSekunden(0);
    const t = setInterval(() => setSekunden((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const ladeStand = useCallback(async (uebernehmeText: boolean) => {
    try {
      const res = await fetch(`/api/lehrer/${groupId}/director`, { cache: "no-store" });
      if (!res.ok) return;
      const a: Abstimmung = await res.json();
      setAbstimmung(a);
      if (uebernehmeText && a.spec) setSpec((vorher) => vorher || a.spec);
    } catch {
      /* kurze Aussetzer still aushalten */
    }
  }, [groupId]);

  // Solange die Gruppe abstimmt, alle paar Sekunden nachfragen (beim Öffnen: siehe onOpenChange)
  useEffect(() => {
    if (!offen || abstimmung.status !== "offen") return;
    const t = setInterval(() => void ladeStand(false), 3000);
    return () => clearInterval(t);
  }, [offen, abstimmung.status, ladeStand]);

  async function ruf(aktion: "destillieren" | "vorlegen" | "zuruecknehmen" | "bauen", ohneAbstimmung = false) {
    setBusy(aktion === "zuruecknehmen" ? "vorlegen" : aktion);
    setFehler("");
    setFertig(false);
    try {
      const res = await fetch(`/api/lehrer/${groupId}/director`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion, spec: spec.trim(), engine3d, ohneAbstimmung }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFehler(data.error ?? "Unbekannter Fehler");
      } else if (aktion === "destillieren") {
        setSpec(data.spec ?? "");
      } else if (aktion === "vorlegen" || aktion === "zuruecknehmen") {
        await ladeStand(false);
      } else {
        setFertig(true);
        setAbstimmung({ status: "", spec: "", hinweis: "" });
        router.refresh();
      }
    } catch {
      setFehler("Verbindungsfehler");
    } finally {
      setBusy("");
    }
  }

  const text = spec.trim();
  const zugestimmt = abstimmung.status === "ja" && abstimmung.spec.trim() === text;
  const nachZustimmungGeaendert = abstimmung.status === "ja" && !zugestimmt;

  return (
    <Dialog
      open={offen}
      onOpenChange={(auf) => {
        setOffen(auf);
        if (auf) void ladeStand(true);
      }}
    >
      <DialogTrigger className={buttonVariants({ variant: "secondary", size: "sm" })}>
        🎬 Director&apos;s Cut
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Director&apos;s Cut — {studioName}</DialogTitle>
          <DialogDescription>
            Alle Wünsche der Gruppe werden zu einer Beschreibung verdichtet. Die Gruppe sieht sie auf
            ihrem Gerät und stimmt zu — erst dann wird daraus ein vollständiges Spiel gebaut. Der
            bisherige Stand wird vorher gesichert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {fehler && <Alert variant="destructive"><AlertDescription>{fehler}</AlertDescription></Alert>}
          {fertig && <Alert><AlertDescription>✅ Neues Spiel veröffentlicht — der alte Stand liegt als Spielstand bereit.</AlertDescription></Alert>}

          <Button variant="outline" onClick={() => ruf("destillieren")} disabled={busy !== ""} className="w-full">
            {busy === "destillieren" ? `Wünsche werden verdichtet … (${sekunden}s)` : "1. Wünsche der Gruppe verdichten"}
          </Button>

          <Textarea
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            rows={10}
            placeholder="Hier erscheint die verdichtete Beschreibung — du kannst sie frei bearbeiten oder direkt selbst schreiben."
            className="font-mono text-xs"
          />

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => ruf("vorlegen")}
                disabled={busy !== "" || text.length < 30 || (abstimmung.status === "offen" && abstimmung.spec.trim() === text)}
              >
                {abstimmung.status === "" ? "2. Der Gruppe vorlegen" : "Diese Fassung (neu) vorlegen"}
              </Button>
              {abstimmung.status === "offen" && (
                <Button variant="ghost" size="sm" onClick={() => ruf("zuruecknehmen")} disabled={busy !== ""}>
                  Zurücknehmen
                </Button>
              )}
            </div>
            <p className="text-sm">
              {abstimmung.status === "" && <span className="text-muted-foreground">Noch nicht vorgelegt. Die Gruppe sieht die Beschreibung auf ihrem Gerät und antwortet mit Ja oder Nein.</span>}
              {abstimmung.status === "offen" && <span>⏳ Liegt der Gruppe vor — warte auf ihre Antwort …</span>}
              {zugestimmt && <span className="font-medium text-emerald-700">✅ Die Gruppe ist einverstanden.</span>}
              {nachZustimmungGeaendert && <span className="text-amber-700">Die Gruppe hat einer anderen Fassung zugestimmt — bitte die geänderte Fassung neu vorlegen.</span>}
              {abstimmung.status === "nein" && (
                <span className="text-amber-700">
                  ✋ Die Gruppe möchte Änderungen{abstimmung.hinweis ? <>: „{abstimmung.hinweis}“</> : "."} Beschreibung anpassen und neu vorlegen.
                </span>
              )}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={engine3d} onChange={(e) => setEngine3d(e.target.checked)} className="h-4 w-4" />
            Als echtes 3D-Spiel bauen (Three.js wird lokal eingebettet)
          </label>

          <Button onClick={() => ruf("bauen")} disabled={busy !== "" || !zugestimmt} className="w-full">
            {busy === "bauen" ? `Spiel wird gebaut … (${sekunden}s — kann mehrere Minuten dauern)` : "3. Spiel bauen & veröffentlichen"}
          </Button>
          {!zugestimmt && text.length >= 30 && (
            <button
              type="button"
              disabled={busy !== ""}
              onClick={() => {
                if (window.confirm("Ohne Zustimmung der Gruppe bauen? Das ersetzt ihr Spiel durch eine Fassung, die sie nicht gesehen hat. Sinnvoll nur, wenn die Gruppe nicht mehr erreichbar ist.")) {
                  void ruf("bauen", true);
                }
              }}
              className="w-full text-center text-xs text-muted-foreground underline underline-offset-2 disabled:opacity-50"
            >
              Ohne Abstimmung bauen (z. B. nach Unterrichtsende) — wird im Protokoll vermerkt
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
