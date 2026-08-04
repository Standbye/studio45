import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attemptsLeft, cooldownRemaining, laeuftGerade, schaetzeDauerSekunden } from "@/lib/generate";
import { playVersion } from "@/lib/games";
import { dayMotto, dayTitle } from "@/lib/prompts";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/g/[code]/state">) {
  const { code } = await ctx.params;
  const group = await db.group.findUnique({
    where: { code },
    include: { workshop: true },
  });
  if (!group || group.workshop.archived) {
    return NextResponse.json({ error: "unbekannt" }, { status: 404 });
  }
  const w = group.workshop;
  const dauerSchaetzung = await schaetzeDauerSekunden(w.id);
  return NextResponse.json({
    studioName: group.studioName || `Gruppe ${group.index}`,
    groupIndex: group.index,
    workshopName: w.name,
    day: w.currentDay,
    totalDays: w.totalDays,
    dayTitle: dayTitle(w.currentDay, w.totalDays),
    motto: dayMotto(w.currentDay, w.totalDays),
    phase: w.phase,
    locked: group.locked,
    guidance: w.guidance,
    attemptsLeft: attemptsLeft(group, w.genLimitPerLesson),
    cooldownRemaining: cooldownRemaining(group, w.cooldownSeconds),
    cooldownSeconds: w.cooldownSeconds,
    // Hängengebliebene Läufe gelten als beendet, sonst wartet die Gruppe ewig
    generating: laeuftGerade(group),
    laufSekunden: group.generatingSince
      ? Math.floor((Date.now() - group.generatingSince.getTime()) / 1000)
      : 0,
    dauerSchaetzung,
    gameVersion: playVersion(group.id),
    branding: {
      colorPrimary: w.colorPrimary,
      colorAccent: w.colorAccent,
      hasLogo: Boolean(w.logoPath),
    },
  });
}
