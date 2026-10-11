import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { laeuftGerade } from "@/lib/generate";
import { schrittZurueck } from "@/lib/games";
import { DEVICE_COOKIE, deviceIdFrom, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Einen Schritt zurück: Die Gruppe holt selbst die Fassung vor dem letzten Bau wieder.
 * Kostet keinen Versuch — wer etwas kaputtgebaut hat, soll nicht festhängen.
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/g/[code]/zurueck">) {
  const { code } = await ctx.params;
  const jar = await cookies();
  const device = deviceIdFrom(jar.get(DEVICE_COOKIE)?.value);
  if (!rateLimit(`zurueck:${device}`, 15, 600).allowed) {
    return NextResponse.json({ ok: false, reason: "Zu viele Anfragen — wartet kurz." }, { status: 429 });
  }

  const group = await db.group.findUnique({ where: { code }, include: { workshop: true } });
  if (!group || group.workshop.archived) return NextResponse.json({ error: "unbekannt" }, { status: 404 });
  if (group.workshop.phase !== "STUDIO") {
    return NextResponse.json({ ok: false, reason: "Das geht nur, wenn das Studio offen ist." }, { status: 409 });
  }
  if (group.locked) return NextResponse.json({ ok: false, reason: "Eure Gruppe ist gerade gesperrt." }, { status: 409 });
  if (laeuftGerade(group)) return NextResponse.json({ ok: false, reason: "Die KI baut gerade — wartet, bis sie fertig ist." }, { status: 409 });

  const ok = await schrittZurueck(group.id, group.workshop.currentDay);
  if (!ok) return NextResponse.json({ ok: false, reason: "Es gibt keine frühere Fassung." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
