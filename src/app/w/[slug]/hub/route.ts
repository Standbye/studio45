import { db } from "@/lib/db";
import { renderHub } from "@/lib/hub";

export const dynamic = "force-dynamic";

/**
 * Begehbare Hub-Welt eines Workshops: isometrischer Schulhof, aus dem heraus
 * die Spiele der Gruppen gestartet werden. Die Welt wird aus den Workshop-Daten
 * erzeugt (Schulname, Studios, Anzahl Gruppen) — dieselbe Engine für jede Schule.
 */
export async function GET(_req: Request, ctx: RouteContext<"/w/[slug]/hub">) {
  const { slug } = await ctx.params;
  const w = await db.workshop.findUnique({
    where: { slug },
    include: { groups: { orderBy: { index: "asc" } }, teacher: true },
  });
  if (!w || w.archived) return new Response("Nicht gefunden", { status: 404 });

  const html = renderHub({
    schulname: w.name,
    className: w.className,
    gastgeber: w.teacher?.displayName ?? "Eure Lehrkraft",
    gruppen: w.groups.map((g) => ({ index: g.index, studioName: g.studioName, code: g.code })),
    blaetterZiel: 10,
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
