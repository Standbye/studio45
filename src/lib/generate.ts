import "server-only";
import { db } from "@/lib/db";
import { buildOrEditGame } from "@/lib/anthropic";
import { verifyGameHtml } from "@/lib/verify";
import { publishGame, readPlayHtml } from "@/lib/games";

export type GenerateOutcome =
  | { ok: true; attemptsLeft: number }
  | { ok: false; reason: string; attemptsLeft?: number };

export function attemptsLeft(g: { genUsed: number; genBonus: number }, limit: number): number {
  return Math.max(0, limit + g.genBonus - g.genUsed);
}

export function cooldownRemaining(
  g: { lastGenAt: Date | null },
  cooldownSeconds: number
): number {
  if (!g.lastGenAt) return 0;
  const elapsed = (Date.now() - g.lastGenAt.getTime()) / 1000;
  return Math.max(0, Math.ceil(cooldownSeconds - elapsed));
}

/**
 * Führt eine Kinder-Generierung aus — alle Limits werden HIER serverseitig
 * durchgesetzt (die Frontend-Pause ist nur UX):
 * - Phase muss STUDIO sein, Gruppe nicht gesperrt
 * - Kontingent pro Schulstunde (Fehlschläge zählen nicht)
 * - Cooldown zwischen Generierungen
 * - Token-Budget des Workshops als harte Obergrenze
 */
export async function runGeneration(groupId: string, prompt: string): Promise<GenerateOutcome> {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: { workshop: { include: { apiKey: true } } },
  });
  if (!group) return { ok: false, reason: "Gruppe nicht gefunden." };
  const w = group.workshop;

  if (w.phase !== "STUDIO") return { ok: false, reason: "Gerade ist Plenum — die Lehrkraft schaltet das Studio frei." };
  if (group.locked) return { ok: false, reason: "Eure Gruppe ist gerade gesperrt. Fragt eure Lehrkraft." };
  if (!w.apiKey) return { ok: false, reason: "Kein API-Key hinterlegt — bitte an die Lehrkraft wenden." };
  if (w.tokensUsed >= w.tokenBudget) return { ok: false, reason: "Das Budget für diesen Workshop ist aufgebraucht." };

  const left = attemptsLeft(group, w.genLimitPerLesson);
  if (left <= 0) {
    return { ok: false, reason: "Alle Versuche für diese Stunde sind verbraucht. Besprecht euren nächsten Schritt — die Lehrkraft kann nachladen.", attemptsLeft: 0 };
  }
  const wait = cooldownRemaining(group, w.cooldownSeconds);
  if (wait > 0) {
    return { ok: false, reason: `Kurze Denkpause — in ${wait} Sekunden geht es weiter.`, attemptsLeft: left };
  }

  // Atomarer Lock gegen Doppel-Generierung derselben Gruppe
  const locked = await db.group.updateMany({
    where: { id: groupId, generating: false },
    data: { generating: true },
  });
  if (locked.count === 0) return { ok: false, reason: "Es läuft schon eine Generierung — kurz warten!" };

  try {
    const currentHtml = readPlayHtml(groupId);
    const params = {
      apiKey: w.apiKey.secret,
      baseUrl: w.apiBaseUrl || undefined,
      model: w.modelKid,
      day: w.currentDay,
      totalDays: w.totalDays,
      studioName: group.studioName || `Gruppe ${group.index}`,
      learningGoal: w.learningGoal,
    };

    let result = await buildOrEditGame({ ...params, currentHtml, userPrompt: prompt });
    let tokensIn = result.tokensIn;
    let tokensOut = result.tokensOut;
    let verify = result.html ? await verifyGameHtml(result.html) : { ok: false, detail: result.error ?? "keine Antwort" };

    // Ein automatischer Reparatur-Versuch, wenn das Spiel beim Laden crasht
    if (result.html && !verify.ok) {
      const repair = await buildOrEditGame({
        ...params,
        currentHtml: result.html,
        userPrompt: `Das Spiel hat einen technischen Fehler und startet nicht: "${verify.detail}". Repariere NUR diesen Fehler, ändere sonst nichts am Spiel.`,
      });
      tokensIn += repair.tokensIn;
      tokensOut += repair.tokensOut;
      if (repair.html) {
        const v2 = await verifyGameHtml(repair.html);
        if (v2.ok) {
          result = repair;
          verify = v2;
        }
      }
    }

    const success = Boolean(result.html) && verify.ok;

    await db.workshop.update({
      where: { id: w.id },
      data: { tokensUsed: { increment: tokensIn + tokensOut } },
    });
    await db.promptLog.create({
      data: {
        groupId,
        day: w.currentDay,
        source: "child",
        prompt,
        ok: success,
        error: success ? "" : verify.detail.slice(0, 400),
        tokensIn,
        tokensOut,
      },
    });

    if (!success) {
      // Fehlschlag zählt NICHT gegen das Kontingent
      return { ok: false, reason: "Die KI hat es diesmal nicht geschafft — euer Versuch ist nicht verbraucht. Probiert es nochmal, vielleicht mit anderen Worten.", attemptsLeft: left };
    }

    await publishGame(groupId, result.html as string, w.currentDay, prompt.slice(0, 60));
    await db.group.update({
      where: { id: groupId },
      data: { genUsed: { increment: 1 }, lastGenAt: new Date() },
    });
    return { ok: true, attemptsLeft: left - 1 };
  } finally {
    await db.group.update({ where: { id: groupId }, data: { generating: false } });
  }
}
