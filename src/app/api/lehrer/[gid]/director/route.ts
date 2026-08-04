import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { buildFromSpec, distillSpec } from "@/lib/anthropic";
import { verifyGameHtml } from "@/lib/verify";
import { publishGame, readPlayHtml } from "@/lib/games";

export const dynamic = "force-dynamic";
export const maxDuration = 900;

const bodySchema = z.object({
  aktion: z.enum(["destillieren", "bauen"]),
  spec: z.string().max(20000).optional(),
  engine3d: z.boolean().optional(),
});

export async function POST(req: Request, ctx: RouteContext<"/api/lehrer/[gid]/director">) {
  const user = await requireUser("TEACHER");
  const { gid } = await ctx.params;

  const group = await db.group.findFirst({
    where: { id: gid, workshop: { teacherId: user.id } },
    include: { workshop: { include: { apiKey: true } }, prompts: { orderBy: { createdAt: "asc" } } },
  });
  if (!group) return NextResponse.json({ error: "nicht gefunden" }, { status: 404 });

  const w = group.workshop;
  if (!w.apiKey) return NextResponse.json({ error: "Kein API-Key hinterlegt." }, { status: 400 });
  if (w.tokensUsed >= w.tokenBudget) {
    return NextResponse.json({ error: "Token-Budget aufgebraucht." }, { status: 400 });
  }

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "ungültige Anfrage" }, { status: 400 });

  const studioName = group.studioName || `Gruppe ${group.index}`;
  const common = {
    apiKey: w.apiKey.secret,
    baseUrl: w.apiBaseUrl || undefined,
    learningGoal: w.learningGoal,
    studioName,
  };

  if (body.data.aktion === "destillieren") {
    const prompts = group.prompts.filter((p) => p.source === "child").map((p) => p.prompt);
    if (prompts.length === 0) {
      return NextResponse.json({ error: "Diese Gruppe hat noch keine Wünsche geäußert." }, { status: 400 });
    }
    const out = await distillSpec({ ...common, model: w.modelDirector, prompts });
    await db.workshop.update({
      where: { id: w.id },
      data: { tokensUsed: { increment: out.tokensIn + out.tokensOut } },
    });
    if (out.error) return NextResponse.json({ error: out.error }, { status: 502 });
    await audit(user.id, "director.distilled", `${studioName} (${prompts.length} Wünsche)`);
    return NextResponse.json({ spec: out.spec });
  }

  // aktion === "bauen"
  const spec = (body.data.spec ?? "").trim();
  if (spec.length < 30) return NextResponse.json({ error: "Spezifikation ist zu kurz." }, { status: 400 });

  const result = await buildFromSpec({
    ...common,
    model: w.modelDirector,
    spec,
    engine3d: Boolean(body.data.engine3d),
  });
  await db.workshop.update({
    where: { id: w.id },
    data: { tokensUsed: { increment: result.tokensIn + result.tokensOut } },
  });

  const verify = result.html ? await verifyGameHtml(result.html) : { ok: false, detail: result.error ?? "keine Antwort" };
  await db.promptLog.create({
    data: {
      groupId: group.id,
      day: w.currentDay,
      source: "director-cut",
      prompt: spec.slice(0, 4000),
      ok: Boolean(result.html) && verify.ok,
      error: verify.ok ? "" : verify.detail.slice(0, 400),
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    },
  });

  if (!result.html || !verify.ok) {
    return NextResponse.json({ error: `Generierung fehlgeschlagen: ${verify.detail}` }, { status: 502 });
  }

  // Alten Stand als Snapshot sichern, bevor der Cut veröffentlicht wird
  const current = readPlayHtml(group.id);
  if (current) await publishGame(group.id, current, w.currentDay, "Sicherung vor Director's Cut");
  await publishGame(group.id, result.html, w.currentDay, "Director's Cut");
  await audit(user.id, "director.published", studioName);

  return NextResponse.json({ ok: true });
}
