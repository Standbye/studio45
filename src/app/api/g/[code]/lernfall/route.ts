import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { DEVICE_COOKIE, deviceIdFrom, rateLimit } from "@/lib/rate-limit";
import { LERNFALL, fassungZurStufe, setzeBefund } from "@/lib/lernfall";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  fassung: z.enum(["erste", "zweite"]),
  regel: z.number().int().min(0).max(LERNFALL.regeln.length - 1),
  urteil: z.enum(["", "ok", "fehler"]),
  notiz: z.string().trim().max(300),
});

/**
 * Die Gruppe hält zu einer Regel des Lernfall-Auftrags fest, was sie beobachtet hat.
 * Gespeichert wird nur für die Fassung, die die Lehrkraft gerade freigegeben hat —
 * so kann niemand vorarbeiten oder nach der Auflösung nachbessern.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/g/[code]/lernfall">) {
  const { code } = await ctx.params;
  const jar = await cookies();
  const device = deviceIdFrom(jar.get(DEVICE_COOKIE)?.value);
  if (!rateLimit(`lernfall:${device}`, 240, 600).allowed) {
    return NextResponse.json({ error: "zu viele Anfragen" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ungültig" }, { status: 400 });
  const { fassung, regel, urteil, notiz } = parsed.data;

  const ergebnis = await db.$transaction(async (tx) => {
    const group = await tx.group.findUnique({
      where: { code },
      select: { id: true, lernfallBefunde: true, workshop: { select: { archived: true, lernfallStufe: true } } },
    });
    if (!group || group.workshop.archived) return 404;
    if (fassungZurStufe(group.workshop.lernfallStufe) !== fassung) return 409;
    await tx.group.update({
      where: { id: group.id },
      data: { lernfallBefunde: setzeBefund(group.lernfallBefunde, fassung, regel, { urteil, notiz }) },
    });
    return 200;
  });

  if (ergebnis === 404) return NextResponse.json({ error: "unbekannt" }, { status: 404 });
  if (ergebnis === 409) return NextResponse.json({ error: "gerade nicht freigegeben" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
