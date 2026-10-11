import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { buildFromSpec, distillSpec } from "@/lib/llm";
import { verifyGameHtml } from "@/lib/verify";
import { publishGame, readPlayHtml } from "@/lib/games";

export const dynamic = "force-dynamic";
export const maxDuration = 900;

const bodySchema = z.object({
  aktion: z.enum(["destillieren", "vorlegen", "zuruecknehmen", "bauen"]),
  spec: z.string().max(20000).optional(),
  engine3d: z.boolean().optional(),
  /** Bauen, obwohl die Gruppe (noch) nicht zugestimmt hat — bewusste Entscheidung der Lehrkraft */
  ohneAbstimmung: z.boolean().optional(),
});

/** Stand der Abstimmung mit der Gruppe — der Dialog der Lehrkraft fragt ihn laufend ab. */
export async function GET(_req: Request, ctx: RouteContext<"/api/lehrer/[gid]/director">) {
  let user;
  try {
    user = await requireUser("TEACHER");
  } catch {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const { gid } = await ctx.params;
  const group = await db.group.findFirst({
    where: { id: gid, workshop: { teacherId: user.id } },
    select: { dcStatus: true, dcSpec: true, dcHinweis: true },
  });
  if (!group) return NextResponse.json({ error: "nicht gefunden" }, { status: 404 });
  return NextResponse.json({ status: group.dcStatus, spec: group.dcSpec, hinweis: group.dcHinweis });
}

export async function POST(req: Request, ctx: RouteContext<"/api/lehrer/[gid]/director">) {
  let user;
  try {
    user = await requireUser("TEACHER");
  } catch {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const { gid } = await ctx.params;

  const group = await db.group.findFirst({
    where: { id: gid, workshop: { teacherId: user.id } },
    include: { workshop: { include: { apiKey: true } }, prompts: { orderBy: { createdAt: "asc" } } },
  });
  if (!group) return NextResponse.json({ error: "nicht gefunden" }, { status: 404 });

  const w = group.workshop;

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "ungültige Anfrage" }, { status: 400 });

  // Abstimmung mit der Gruppe: braucht weder KI-Verbindung noch Budget
  if (body.data.aktion === "vorlegen") {
    const vorlage = (body.data.spec ?? "").trim();
    if (vorlage.length < 30) return NextResponse.json({ error: "Spezifikation ist zu kurz." }, { status: 400 });
    await db.group.update({ where: { id: group.id }, data: { dcSpec: vorlage, dcStatus: "offen", dcHinweis: "" } });
    await audit(user.id, "director.vorgelegt", group.studioName || `Gruppe ${group.index}`);
    return NextResponse.json({ ok: true, status: "offen" });
  }
  if (body.data.aktion === "zuruecknehmen") {
    await db.group.update({ where: { id: group.id }, data: { dcStatus: "", dcHinweis: "" } });
    return NextResponse.json({ ok: true, status: "" });
  }

  if (!w.apiKey) return NextResponse.json({ error: "Kein API-Key hinterlegt." }, { status: 400 });
  if (w.tokensUsed >= w.tokenBudget) {
    return NextResponse.json({ error: "Token-Budget aufgebraucht." }, { status: 400 });
  }

  const studioName = group.studioName || `Gruppe ${group.index}`;
  const common = {
    verbindung: {
      protocol: w.apiKey.protocol,
      secret: w.apiKey.secret,
      baseUrl: w.apiKey.baseUrl,
      gruendlich: w.apiKey.gruendlich === "hoch",
    },
    learningGoal: w.learningGoal,
    studioName,
  };

  if (body.data.aktion === "destillieren") {
    const prompts = group.prompts.filter((p) => p.source === "child").map((p) => p.prompt);
    if (prompts.length === 0) {
      return NextResponse.json({ error: "Diese Gruppe hat noch keine Wünsche geäußert." }, { status: 400 });
    }
    const out = await distillSpec({ ...common, model: w.apiKey.modelDirector, prompts });
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

  // Es ist das Spiel der Gruppe: Gebaut wird die Fassung, der sie zugestimmt hat — oder die
  // Lehrkraft entscheidet ausdrücklich anders (z. B. nach Unterrichtsende), dann steht es im Protokoll.
  const zugestimmt = group.dcStatus === "ja" && group.dcSpec.trim() === spec;
  if (!zugestimmt && !body.data.ohneAbstimmung) {
    return NextResponse.json(
      { error: "Die Gruppe hat dieser Fassung noch nicht zugestimmt. Erst der Gruppe vorlegen — oder bewusst ohne Abstimmung bauen." },
      { status: 409 }
    );
  }

  const result = await buildFromSpec({
    ...common,
    model: w.apiKey.modelDirector,
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

  if (result.html && "technisch" in verify && verify.technisch) {
    return NextResponse.json({ error: `Die Spielprüfung ist nicht erreichbar (${verify.detail}). Das Spiel wurde nicht veröffentlicht.` }, { status: 503 });
  }
  if (!result.html || !verify.ok) {
    return NextResponse.json({ error: `Generierung fehlgeschlagen: ${verify.detail}` }, { status: 502 });
  }

  // Alten Stand als Snapshot sichern, bevor der Cut veröffentlicht wird
  const current = readPlayHtml(group.id);
  if (current) await publishGame(group.id, current, w.currentDay, "Sicherung vor Director's Cut");
  await publishGame(group.id, result.html, w.currentDay, "Director's Cut");
  await db.group.update({ where: { id: group.id }, data: { dcStatus: "", dcSpec: "", dcHinweis: "" } });
  await audit(user.id, "director.published", `${studioName}${zugestimmt ? " (mit Zustimmung der Gruppe)" : " (ohne Abstimmung)"}`);

  return NextResponse.json({ ok: true });
}
