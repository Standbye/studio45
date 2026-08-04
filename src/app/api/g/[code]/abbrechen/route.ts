import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { DEVICE_COOKIE, deviceIdFrom, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Wartestatus abbrechen.
 *
 * Der Aufruf beim KI-Dienst lässt sich nicht zurückholen — hier wird nur die
 * Gruppe wieder freigegeben, damit die Kinder nicht endlos vor einem
 * Ladebildschirm sitzen, wenn eine Generierung hängt oder abgebrochen ist.
 * Kommt die alte Antwort doch noch, erscheint das Spiel einfach nachträglich.
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/g/[code]/abbrechen">) {
  const { code } = await ctx.params;
  const jar = await cookies();
  const device = deviceIdFrom(jar.get(DEVICE_COOKIE)?.value);
  if (!rateLimit(`abbruch:${device}`, 10, 300).allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const group = await db.group.findUnique({ where: { code }, select: { id: true } });
  if (!group) return NextResponse.json({ error: "unbekannt" }, { status: 404 });

  await db.group.updateMany({
    where: { id: group.id, generating: true },
    data: { generating: false, generatingSince: null },
  });
  return NextResponse.json({ ok: true });
}
