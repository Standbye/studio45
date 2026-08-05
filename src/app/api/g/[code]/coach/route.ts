import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { coachWunsch } from "@/lib/llm";
import { readPlayHtml } from "@/lib/games";
import { supportProfil } from "@/lib/audience";
import { DEVICE_COOKIE, deviceIdFrom, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({ prompt: z.string().trim().min(1).max(4000) });

/**
 * Formulierungshilfe: schlägt eine genauere Fassung des Wunsches vor.
 * Kostet einen kleinen Modellaufruf und zählt NICHT gegen das Kontingent —
 * besser formulieren soll sich lohnen, nicht bestraft werden.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/g/[code]/coach">) {
  const { code } = await ctx.params;
  const jar = await cookies();
  const device = deviceIdFrom(jar.get(DEVICE_COOKIE)?.value);
  if (!rateLimit(`coach:${device}`, 30, 600).allowed) {
    return NextResponse.json({ error: "zu viele Anfragen" }, { status: 429 });
  }

  const group = await db.group.findUnique({
    where: { code },
    include: { workshop: { include: { apiKey: true } } },
  });
  if (!group) return NextResponse.json({ error: "unbekannt" }, { status: 404 });

  const w = group.workshop;
  if (!w.apiKey) return NextResponse.json({ error: "keine Verbindung" }, { status: 400 });
  if (supportProfil(w.supportLevel).coachAbZeichen === 0) {
    return NextResponse.json({ error: "nicht aktiv" }, { status: 400 });
  }
  if (w.tokensUsed >= w.tokenBudget) {
    return NextResponse.json({ error: "Budget aufgebraucht" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ungültig" }, { status: 400 });

  const out = await coachWunsch({
    verbindung: { protocol: w.apiKey.protocol, secret: w.apiKey.secret, baseUrl: w.apiKey.baseUrl },
    model: w.apiKey.modelKid,
    wunsch: parsed.data.prompt,
    currentHtml: readPlayHtml(group.id),
    studioName: group.studioName || `Gruppe ${group.index}`,
    ageGroup: w.ageGroup,
    learningGoal: w.learningGoal,
  });

  await db.workshop.update({
    where: { id: w.id },
    data: { tokensUsed: { increment: out.tokensIn + out.tokensOut } },
  });

  if (out.error || !out.vorschlag) {
    return NextResponse.json({ error: out.error ?? "kein Vorschlag" }, { status: 502 });
  }
  return NextResponse.json({ vorschlag: out.vorschlag });
}
