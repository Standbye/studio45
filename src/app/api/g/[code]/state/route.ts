import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attemptsLeft, cooldownRemaining, laeuftGerade, schaetzeDauerSekunden } from "@/lib/generate";
import { playVersion } from "@/lib/games";
import { dayMotto, dayTitle } from "@/lib/prompts";
import { alterProfil, supportProfil } from "@/lib/audience";
import { farbschema } from "@/lib/kontrast";
import { energieVergleich, euroKosten, euroText, wattstunden } from "@/lib/verbrauch";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/g/[code]/state">) {
  const { code } = await ctx.params;
  const group = await db.group.findUnique({
    where: { code },
    include: { workshop: { include: { apiKey: { select: { eurPerMTokensIn: true, eurPerMTokensOut: true, whPerMTokens: true } } } } },
  });
  if (!group || group.workshop.archived) {
    return NextResponse.json({ error: "unbekannt" }, { status: 404 });
  }
  const w = group.workshop;
  const dauerSchaetzung = await schaetzeDauerSekunden(w.id);

  // Token-Transparenz: Summe der Gruppe + letzter Bau; Euro nur, wenn der
  // Admin Preise hinterlegt hat. Energiewerte sind bewusst grobe Schätzungen.
  const [summe, letzter] = await Promise.all([
    db.promptLog.aggregate({ where: { groupId: group.id }, _sum: { tokensIn: true, tokensOut: true } }),
    db.promptLog.findFirst({ where: { groupId: group.id }, orderBy: { createdAt: "desc" }, select: { tokensIn: true, tokensOut: true } }),
  ]);
  const gesamtIn = summe._sum.tokensIn ?? 0;
  const gesamtOut = summe._sum.tokensOut ?? 0;
  const gesamt = gesamtIn + gesamtOut;
  const gesamtEuro = euroKosten(gesamtIn, gesamtOut, w.apiKey);
  const letzterEuro = letzter ? euroKosten(letzter.tokensIn, letzter.tokensOut, w.apiKey) : null;

  // Sparsamkeits-Challenge: Rang unter den Gruppen mit Verbrauch, aufsteigend
  let challenge: { platz: number; von: number; fuehrtTokens: number } | null = null;
  if (w.challenge) {
    const proGruppe = await db.promptLog.groupBy({
      by: ["groupId"],
      where: { group: { workshopId: w.id } },
      _sum: { tokensIn: true, tokensOut: true },
    });
    const rangliste = proGruppe
      .map((r) => ({ groupId: r.groupId, tokens: (r._sum.tokensIn ?? 0) + (r._sum.tokensOut ?? 0) }))
      .filter((r) => r.tokens > 0)
      .sort((a, b) => a.tokens - b.tokens);
    const platz = rangliste.findIndex((r) => r.groupId === group.id);
    if (platz >= 0) {
      challenge = { platz: platz + 1, von: rangliste.length, fuehrtTokens: rangliste[0].tokens };
    }
  }
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
    ageGroup: w.ageGroup,
    supportLevel: w.supportLevel,
    optik: alterProfil(w.ageGroup).optik,
    texte: alterProfil(w.ageGroup).texte,
    chips: alterProfil(w.ageGroup).chips[Math.min(w.currentDay, 5)] ?? alterProfil(w.ageGroup).chips[1],
    hilfen: {
      chips: supportProfil(w.supportLevel).chips,
      teamCheck: supportProfil(w.supportLevel).teamCheck,
      coachAbZeichen: supportProfil(w.supportLevel).coachAbZeichen,
    },
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
    verbrauch: {
      gesamtTokens: gesamt,
      letzterTokens: letzter ? letzter.tokensIn + letzter.tokensOut : 0,
      gesamtEuro: gesamtEuro !== null ? euroText(gesamtEuro) : null,
      letzterEuro: letzterEuro !== null ? euroText(letzterEuro) : null,
      energie: energieVergleich(wattstunden(gesamt, w.apiKey)),
    },
    challenge,
    branding: {
      // Textfarben werden aus den Marken-Farben berechnet — sonst wird bei
      // hellen Tönen (z. B. Weiß) weiße Schrift unsichtbar.
      ...farbschema(w.colorPrimary, w.colorAccent),
      hasLogo: Boolean(w.logoPath),
    },
  });
}
