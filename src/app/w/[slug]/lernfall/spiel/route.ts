import { db } from "@/lib/db";
import { lernfallHtml } from "@/lib/lernfall";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Liefert das Lernfall-Spiel — wie ein generiertes Spiel mit strenger CSP und für ein sandbox-iframe. */
export async function GET(req: Request, ctx: RouteContext<"/w/[slug]/lernfall/spiel">) {
  const { slug } = await ctx.params;
  const w = await db.workshop.findUnique({ where: { slug }, select: { archived: true, lernfallStufe: true, teacherId: true } });
  if (!w || w.archived) return new Response("Nicht gefunden", { status: 404 });

  const gewuenscht = new URL(req.url).searchParams.get("fassung") === "zweite" ? "zweite" : "erste";
  // Die Lehrkraft schaltet frei: aus = gar nichts, erste Fassung = nur die erste. Erst ab der
  // zweiten Stufe gibt es die „reparierte" Fassung. Die eigene Lehrkraft darf zur Vorbereitung immer.
  const frei = w.lernfallStufe >= (gewuenscht === "zweite" ? 2 : 1);
  if (!frei) {
    const user = await currentUser();
    if (!user || user.id !== w.teacherId) return new Response("Nicht freigegeben", { status: 404 });
  }
  const fassung = gewuenscht;
  return new Response(lernfallHtml(fassung), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
    },
  });
}
