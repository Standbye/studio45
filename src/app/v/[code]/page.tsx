import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AutoRefresh } from "@/components/auto-refresh";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { attemptsLeft, laeuftGerade } from "@/lib/generate";
import { dayMotto, dayTitle } from "@/lib/prompts";
import { vertretungsWorkshop } from "@/lib/vertretung";
import {
  vertretungBonusAction,
  vertretungNeueStundeAction,
  vertretungPhaseAction,
  vertretungSperreAction,
  vertretungTagAction,
} from "./actions";

export const dynamic = "force-dynamic";

/**
 * Stundensteuerung für eine Vertretung — ohne Konto, über den Link der Lehrkraft.
 * Bewusst nur das, was man in einer laufenden Stunde braucht.
 */
export default async function VertretungPage({ params }: PageProps<"/v/[code]">) {
  const { code } = await params;
  const w = await vertretungsWorkshop(code);
  if (!w) notFound();

  const groups = await db.group.findMany({
    where: { workshopId: w.id },
    orderBy: { index: "asc" },
    include: { prompts: { orderBy: { createdAt: "desc" }, take: 1, select: { prompt: true, ok: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <AutoRefresh seconds={15} />
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Studio45 · Vertretung</p>
        <h1 className="text-2xl font-black">{w.name}</h1>
        <p className="text-sm text-muted-foreground">
          Von hier aus steuern Sie die Stunde. Einstellungen und KI-Zugang verwaltet die Lehrkraft, die Ihnen diesen Link gegeben hat.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stunde</CardTitle>
          <CardDescription>
            Tag {w.currentDay}: <b>{dayTitle(w.currentDay, w.totalDays)}</b> · Merksatz: „{dayMotto(w.currentDay, w.totalDays)}“
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-sm font-medium text-muted-foreground">Phase</span>
            {(["PLENUM", "STUDIO", "PAUSE"] as const).map((p) => (
              <form key={p} action={vertretungPhaseAction}>
                <input type="hidden" name="code" value={code} />
                <input type="hidden" name="phase" value={p} />
                <Button type="submit" size="sm" variant={w.phase === p ? "default" : "outline"}>
                  {p === "PLENUM" ? "🗣️ Plenum (Geräte gesperrt)" : p === "STUDIO" ? "🎮 Studio" : "⏸️ Pause"}
                </Button>
              </form>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-sm font-medium text-muted-foreground">Tag</span>
            {Array.from({ length: w.totalDays }, (_, i) => i + 1).map((d) => (
              <form key={d} action={vertretungTagAction}>
                <input type="hidden" name="code" value={code} />
                <input type="hidden" name="day" value={d} />
                <Button type="submit" size="sm" variant={w.currentDay === d ? "default" : "outline"}>
                  {d}
                </Button>
              </form>
            ))}
            <form action={vertretungNeueStundeAction} className="ml-auto">
              <input type="hidden" name="code" value={code} />
              <Button type="submit" size="sm" variant="secondary">
                🔄 Neue Stunde (Versuche zurücksetzen)
              </Button>
            </form>
          </div>
          <a href={`/w/${w.slug}`} target="_blank" rel="noopener" className="inline-block text-sm font-semibold underline underline-offset-4">
            Beamer-Seite mit den QR-Codes öffnen ↗
          </a>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => {
          const left = attemptsLeft(g, w.genLimitPerLesson);
          const letzter = g.prompts[0];
          return (
            <Card key={g.id} className={g.locked ? "border-destructive/50" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{g.studioName || `Gruppe ${g.index}`}</CardTitle>
                <CardDescription>
                  {laeuftGerade(g) ? "🛠️ baut gerade · " : ""}
                  {g.locked ? "🔒 gesperrt · " : ""}
                  noch {left} Versuch{left === 1 ? "" : "e"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {letzter && (
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {letzter.ok ? "Letzter Wunsch: " : "Letzter Wunsch (nicht gebaut): "}„{letzter.prompt}“
                  </p>
                )}
                <div className="flex gap-2">
                  <form action={vertretungSperreAction}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="groupId" value={g.id} />
                    <Button type="submit" size="sm" variant="outline">
                      {g.locked ? "🔓 Entsperren" : "🔒 Sperren"}
                    </Button>
                  </form>
                  <form action={vertretungBonusAction}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="groupId" value={g.id} />
                    <Button type="submit" size="sm" variant="outline">
                      ➕ 1 Versuch
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
