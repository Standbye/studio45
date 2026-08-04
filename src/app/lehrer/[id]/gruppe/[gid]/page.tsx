import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { restoreSnapshotAction } from "@/app/lehrer/actions";
import { DirectorCutDialog } from "./director-cut";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function GroupDetail({ params }: PageProps<"/lehrer/[id]/gruppe/[gid]">) {
  const user = await requireUserPage("TEACHER");
  const { id, gid } = await params;
  const group = await db.group.findFirst({
    where: { id: gid, workshopId: id, workshop: { teacherId: user.id } },
    include: {
      workshop: true,
      prompts: { orderBy: { createdAt: "asc" } },
      snapshots: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!group) notFound();

  const byDay = new Map<number, typeof group.prompts>();
  for (const p of group.prompts) {
    if (!byDay.has(p.day)) byDay.set(p.day, []);
    byDay.get(p.day)!.push(p);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/lehrer/${id}`} className="text-sm text-primary underline-offset-2 hover:underline">← Zurück</Link>
        <h1 className="text-2xl font-bold">
          Gruppe {group.index}
          {group.studioName && <span className="text-muted-foreground"> · „{group.studioName}"</span>}
        </h1>
        <div className="ml-auto flex items-center gap-3">
          <DirectorCutDialog groupId={group.id} studioName={group.studioName || `Gruppe ${group.index}`} />
          <a href={`/g/${group.code}`} target="_blank" className="text-sm text-primary underline-offset-2 hover:underline">
            Kinder-Ansicht öffnen ↗
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktuelles Spiel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[4/3] overflow-hidden rounded-lg border">
              <iframe
                src={`/g/${group.code}/play`}
                sandbox="allow-scripts"
                className="h-full w-full border-0"
                title="Spiel-Vorschau"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spielstände (Zeitreise)</CardTitle>
            <CardDescription>Einen früheren Stand wiederherstellen — der aktuelle bleibt als Snapshot erhalten.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-96 space-y-2 overflow-y-auto">
            {group.snapshots.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Spielstände.</p>}
            {group.snapshots.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border p-2 text-sm">
                <Badge variant="outline">Tag {s.day}</Badge>
                <span className="min-w-0 flex-1 truncate">{s.label || s.fileName}</span>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {s.createdAt.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
                <form action={restoreSnapshotAction}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="snapshotId" value={s.id} />
                  <Button type="submit" size="sm" variant="outline">Wiederherstellen</Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prompt-Verlauf ({group.prompts.length})</CardTitle>
          <CardDescription>Was die Kinder der KI gesagt haben — Reflexionsgold fürs Plenum.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[...byDay.entries()].map(([day, prompts]) => (
            <div key={day} className="space-y-2">
              <h3 className="font-semibold">Tag {day}</h3>
              {prompts.map((p) => (
                <div key={p.id} className={`rounded-lg border p-3 text-sm ${p.ok ? "" : "border-destructive/40 bg-destructive/5"}`}>
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{p.createdAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
                    {p.source !== "child" && <Badge variant="secondary">{p.source}</Badge>}
                    {!p.ok && <Badge variant="destructive">fehlgeschlagen</Badge>}
                    <span className="ml-auto">{p.tokensIn + p.tokensOut} Tokens</span>
                  </div>
                  <p className="whitespace-pre-wrap">{p.prompt}</p>
                  {p.error && <p className="mt-1 text-xs text-destructive">{p.error}</p>}
                </div>
              ))}
            </div>
          ))}
          {group.prompts.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Prompts.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
