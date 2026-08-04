import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function LehrerIndex() {
  const user = await requireUser("TEACHER");
  const workshops = await db.workshop.findMany({
    where: { teacherId: user.id, archived: false },
    include: { groups: true },
    orderBy: { createdAt: "desc" },
  });

  if (workshops.length === 1) redirect(`/lehrer/${workshops[0].id}`);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Deine Workshops</h1>
      {workshops.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Dir ist noch kein Workshop zugeordnet — der Admin legt Workshops an.
        </CardContent></Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {workshops.map((w) => (
          <Link key={w.id} href={`/lehrer/${w.id}`}>
            <Card className="transition hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {w.name} {w.className && <Badge variant="secondary">{w.className}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {w.groups.length} Gruppen · Tag {w.currentDay}/{w.totalDays} · {w.phase}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
