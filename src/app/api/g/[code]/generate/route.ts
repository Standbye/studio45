import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { runGeneration } from "@/lib/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

const bodySchema = z.object({ prompt: z.string().trim().min(3).max(4000) });

export async function POST(req: Request, ctx: RouteContext<"/api/g/[code]/generate">) {
  const { code } = await ctx.params;
  const group = await db.group.findUnique({ where: { code }, select: { id: true } });
  if (!group) return NextResponse.json({ error: "unbekannt" }, { status: 404 });

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
  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 200 });
}
