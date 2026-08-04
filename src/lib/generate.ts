import "server-only";
import { db } from "@/lib/db";
import { buildOrEditGame } from "@/lib/llm";
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

const SCHAETZUNG_OHNE_DATEN = 75; // Sekunden, bis eigene Messwerte vorliegen

/**
 * Nach dieser Zeit gilt eine Generierung als hängengeblieben. Ein Serverneustart
 * mitten im Bau würde sonst `generating` für immer stehen lassen — die Gruppe
 * käme nie wieder zum Zug.
 */
export const LAUF_TIMEOUT_MS = 10 * 60 * 1000;

export function laufHaengt(g: { generating: boolean; generatingSince: Date | null }): boolean {
  if (!g.generating) return false;
  if (!g.generatingSince) return true; // Altbestand ohne Zeitstempel
  return Date.now() - g.generatingSince.getTime() > LAUF_TIMEOUT_MS;
}

/** Läuft gerade wirklich eine Generierung (also nicht nur ein hängender Eintrag)? */
export function laeuftGerade(g: { generating: boolean; generatingSince: Date | null }): boolean {
  return g.generating && !laufHaengt(g);
}

/**
 * Wie lange dauert eine Generierung in diesem Workshop?
 *
 * Statt aus Token-Zahlen zu rechnen (die Ausgabelänge kennt man vorher nicht,
 * und jeder Anbieter ist anders schnell) nehmen wir den Median der letzten
 * echten Läufe — das kalibriert sich von selbst auf Modell, Anbieter und Tageszeit.
 */
export async function schaetzeDauerSekunden(workshopId: string): Promise<number> {
  const letzte = await db.promptLog.findMany({
    where: { group: { workshopId }, ok: true, durationMs: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { durationMs: true },
  });
  if (letzte.length < 3) return SCHAETZUNG_OHNE_DATEN;
  const sortiert = letzte.map((l) => l.durationMs).sort((a, b) => a - b);
  const median = sortiert[Math.floor(sortiert.length / 2)];
  return Math.max(20, Math.round(median / 1000));
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

  // Atomarer Lock gegen Doppel-Generierung derselben Gruppe. Ein hängender
  // Lauf (Serverneustart o. ä.) darf dabei übernommen werden.
  const grenze = new Date(Date.now() - LAUF_TIMEOUT_MS);
  const locked = await db.group.updateMany({
    where: {
      id: groupId,
      OR: [
        { generating: false },
        { generating: true, generatingSince: null },
        { generating: true, generatingSince: { lt: grenze } },
      ],
    },
    data: { generating: true, generatingSince: new Date() },
  });
  if (locked.count === 0) return { ok: false, reason: "Es läuft schon eine Generierung — kurz warten!" };

  const startzeit = Date.now();
  try {
    const currentHtml = readPlayHtml(groupId);
    const params = {
      verbindung: {
        protocol: w.apiKey.protocol,
        secret: w.apiKey.secret,
        baseUrl: w.apiKey.baseUrl,
      },
      model: w.apiKey.modelKid,
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
        durationMs: Date.now() - startzeit,
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
    await db.group.update({ where: { id: groupId }, data: { generating: false, generatingSince: null } });
  }
}
