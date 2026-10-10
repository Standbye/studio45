import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { DEVICE_COOKIE, deviceIdFrom, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  antwort: z.enum(["ja", "nein"]),
  hinweis: z.string().trim().max(500).optional(),
});

/**
 * Die Gruppe stimmt über den Director's Cut ab: Passt die Beschreibung, aus der die
 * Lehrkraft ein Gesamtspiel bauen lassen will, zu ihrer Idee? Es ist ihr Spiel —
 * ohne ihr Ja (oder eine bewusste Entscheidung der Lehrkraft) wird nichts ersetzt.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/g/[code]/director">) {
  const { code } = await ctx.params;
  const jar = await cookies();
  const device = deviceIdFrom(jar.get(DEVICE_COOKIE)?.value);
  if (!rateLimit(`dc:${device}`, 20, 600).allowed) {
    return NextResponse.json({ error: "zu viele Anfragen" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ungültig" }, { status: 400 });

  // Nur eine offene Vorlage lässt sich beantworten
  const geaendert = await db.group.updateMany({
    where: { code, dcStatus: "offen" },
    data: { dcStatus: parsed.data.antwort, dcHinweis: parsed.data.antwort === "nein" ? (parsed.data.hinweis ?? "") : "" },
  });
  if (geaendert.count === 0) return NextResponse.json({ error: "nichts offen" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
