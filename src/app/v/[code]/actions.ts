"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { vertretungsWorkshop } from "@/lib/vertretung";

/**
 * Stundensteuerung für die Vertretung. Jede Aktion prüft den Code erneut — eine Seite,
 * die noch offen ist, verliert ihre Rechte, sobald die Lehrkraft den Link abschaltet.
 */
async function zugang(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const w = await vertretungsWorkshop(code);
  // Abgeschaltet oder ersetzt: zurück auf die Seite, die dann erklärt, dass der Link nicht mehr gilt
  if (!w) redirect(`/v/${encodeURIComponent(code)}`);
  return { code, w };
}

function neuLaden(code: string, workshopId: string) {
  revalidatePath(`/v/${code}`);
  revalidatePath(`/lehrer/${workshopId}`);
}

export async function vertretungTagAction(formData: FormData): Promise<void> {
  const { code, w } = await zugang(formData);
  const day = z.coerce.number().int().min(1).max(10).parse(formData.get("day"));
  await db.workshop.update({ where: { id: w.id }, data: { currentDay: Math.min(day, w.totalDays) } });
  await audit(null, "vertretung.day", `${w.name} → Tag ${day}`);
  neuLaden(code, w.id);
}

export async function vertretungPhaseAction(formData: FormData): Promise<void> {
  const { code, w } = await zugang(formData);
  const phase = z.enum(["PLENUM", "STUDIO", "PAUSE"]).parse(formData.get("phase"));
  await db.workshop.update({ where: { id: w.id }, data: { phase } });
  await audit(null, "vertretung.phase", `${w.name} → ${phase}`);
  neuLaden(code, w.id);
}

export async function vertretungNeueStundeAction(formData: FormData): Promise<void> {
  const { code, w } = await zugang(formData);
  await db.group.updateMany({ where: { workshopId: w.id }, data: { genUsed: 0, genBonus: 0 } });
  await audit(null, "vertretung.new-lesson", w.name);
  neuLaden(code, w.id);
}

async function eigeneGruppe(formData: FormData, workshopId: string) {
  const groupId = String(formData.get("groupId") ?? "");
  const g = await db.group.findFirst({ where: { id: groupId, workshopId } });
  if (!g) throw new Error("Diese Gruppe gehört nicht zu diesem Workshop.");
  return g;
}

export async function vertretungSperreAction(formData: FormData): Promise<void> {
  const { code, w } = await zugang(formData);
  const g = await eigeneGruppe(formData, w.id);
  await db.group.update({ where: { id: g.id }, data: { locked: !g.locked } });
  await audit(null, g.locked ? "vertretung.unlocked" : "vertretung.locked", `${w.name} · Gruppe ${g.index}`);
  neuLaden(code, w.id);
}

export async function vertretungBonusAction(formData: FormData): Promise<void> {
  const { code, w } = await zugang(formData);
  const g = await eigeneGruppe(formData, w.id);
  await db.group.update({ where: { id: g.id }, data: { genBonus: { increment: 1 } } });
  await audit(null, "vertretung.bonus", `${w.name} · Gruppe ${g.index} +1`);
  neuLaden(code, w.id);
}
