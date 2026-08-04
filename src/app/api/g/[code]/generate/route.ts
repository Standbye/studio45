import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { runGeneration } from "@/lib/generate";
import { DEVICE_COOKIE, deviceIdFrom, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

const bodySchema = z.object({ prompt: z.string().trim().min(3).max(4000) });

export async function POST(req: Request, ctx: RouteContext<"/api/g/[code]/generate">) {
  const { code } = await ctx.params;

  // Enumeration-Schutz: unbekannte Codes pro Gerät stark begrenzen
  const jar = await cookies();
  const device = deviceIdFrom(jar.get(DEVICE_COOKIE)?.value);

  const group = await db.group.findUnique({ where: { code }, select: { id: true } });
  if (!group) {
    rateLimit(`code-miss:${device}`, 10, 300);
    return NextResponse.json({ error: "unbekannt" }, { status: 404 });
  }

  // Zusätzliche Bremse pro Gerät (nicht pro IP — NAT!), unabhängig vom Kontingent
  const limited = rateLimit(`gen:${device}`, 12, 600);
  if (!limited.allowed) {
    return NextResponse.json(
      { ok: false, reason: `Zu viele Anfragen von diesem Gerät — bitte ${limited.retryAfter} Sekunden warten.` },
      { status: 429 }
    );
  }

  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: "ungültige Anfrage" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "Bitte sagt der KI in ein paar Worten, was ihr wollt." }, { status: 400 });
  }

  const outcome = await runGeneration(group.id, parsed.data.prompt);
  return NextResponse.json(outcome);
}
