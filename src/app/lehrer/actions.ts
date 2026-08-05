"use server";

import { revalidatePath } from "next/cache";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { dataPath } from "@/lib/env";
import { restoreSnapshot } from "@/lib/games";

/** Mandanten-Isolation: Workshop nur, wenn er der angemeldeten Lehrkraft gehört. */
async function ownWorkshop(workshopId: string) {
  const user = await requireUser("TEACHER");
  const workshop = await db.workshop.findFirst({
    where: { id: workshopId, teacherId: user.id },
  });
  if (!workshop) throw new Error("FORBIDDEN");
  return { user, workshop };
}

async function ownGroup(groupId: string) {
  const user = await requireUser("TEACHER");
  const group = await db.group.findFirst({
    where: { id: groupId, workshop: { teacherId: user.id } },
    include: { workshop: true },
  });
  if (!group) throw new Error("FORBIDDEN");
  return { user, group };
}

export async function setDayAction(formData: FormData): Promise<void> {
  const day = z.coerce.number().int().min(1).max(10).parse(formData.get("day"));
  const { user, workshop } = await ownWorkshop(String(formData.get("workshopId")));
  await db.workshop.update({
    where: { id: workshop.id },
    data: { currentDay: Math.min(day, workshop.totalDays) },
  });
  await audit(user.id, "workshop.day", `${workshop.name} → Tag ${day}`);
  revalidatePath(`/lehrer/${workshop.id}`);
}

export async function setPhaseAction(formData: FormData): Promise<void> {
  const phase = z.enum(["PLENUM", "STUDIO", "PAUSE"]).parse(formData.get("phase"));
  const { user, workshop } = await ownWorkshop(String(formData.get("workshopId")));
  await db.workshop.update({ where: { id: workshop.id }, data: { phase } });
  await audit(user.id, "workshop.phase", `${workshop.name} → ${phase}`);
  revalidatePath(`/lehrer/${workshop.id}`);
}

/** Neue Schulstunde: setzt die Generierungs-Kontingente aller Gruppen zurück. */
export async function newLessonAction(formData: FormData): Promise<void> {
  const { user, workshop } = await ownWorkshop(String(formData.get("workshopId")));
  await db.group.updateMany({
    where: { workshopId: workshop.id },
    data: { genUsed: 0, genBonus: 0 },
  });
  await audit(user.id, "workshop.new-lesson", workshop.name);
  revalidatePath(`/lehrer/${workshop.id}`);
}

/** Live nachladen: +N Versuche für eine Gruppe. */
export async function addBonusAction(formData: FormData): Promise<void> {
  const { user, group } = await ownGroup(String(formData.get("groupId")));
  await db.group.update({ where: { id: group.id }, data: { genBonus: { increment: 1 } } });
  await audit(user.id, "group.bonus", `Gruppe ${group.index} +1`);
  revalidatePath(`/lehrer/${group.workshopId}`);
}

export async function toggleLockAction(formData: FormData): Promise<void> {
  const { user, group } = await ownGroup(String(formData.get("groupId")));
  await db.group.update({ where: { id: group.id }, data: { locked: !group.locked } });
  await audit(user.id, group.locked ? "group.unlocked" : "group.locked", `Gruppe ${group.index}`);
  revalidatePath(`/lehrer/${group.workshopId}`);
}

export async function renameStudioAction(formData: FormData): Promise<void> {
  const name = z.string().trim().max(40).parse(formData.get("studioName"));
  const { user, group } = await ownGroup(String(formData.get("groupId")));
  await db.group.update({ where: { id: group.id }, data: { studioName: name } });
  await audit(user.id, "group.renamed", `Gruppe ${group.index} → „${name}"`);
  revalidatePath(`/lehrer/${group.workshopId}`);
}

export async function updateSettingsAction(formData: FormData): Promise<void> {
  const { user, workshop } = await ownWorkshop(String(formData.get("workshopId")));

  // Der Reiter „KI-Anweisung" schickt nur die didaktische Zone
  if (formData.get("nurPrompt") === "1") {
    const eigene = z.string().max(20000).parse(formData.get("promptDidactic") ?? "");
    await db.workshop.update({
      where: { id: workshop.id },
      data: { promptDidactic: eigene.trim() },
    });
    await audit(
      user.id,
      "workshop.prompt",
      eigene.trim() ? `${workshop.name}: eigene Fassung` : `${workshop.name}: auf Standard zurückgesetzt`
    );
    revalidatePath(`/lehrer/${workshop.id}`);
    return;
  }

  // KI-Zugang (Protokoll, URL, Modelle) gehört zur Verbindung und wird vom
  // Admin gepflegt — die Lehrkraft stellt hier Didaktik und Limits ein.
  const schema = z.object({
    learningGoal: z.string().trim().max(4000),
    ageGroup: z.enum(["GRUNDSCHULE", "MITTELSTUFE", "OBERSTUFE"]),
    supportLevel: z.coerce.number().int().min(1).max(5),
    genLimitPerLesson: z.coerce.number().int().min(1).max(20),
    cooldownSeconds: z.coerce.number().int().min(0).max(1800),
  });
  const parsed = schema.parse({
    learningGoal: formData.get("learningGoal") ?? "",
    ageGroup: formData.get("ageGroup"),
    supportLevel: formData.get("supportLevel"),
    genLimitPerLesson: formData.get("genLimitPerLesson"),
    cooldownSeconds: formData.get("cooldownSeconds"),
  });
  await db.workshop.update({ where: { id: workshop.id }, data: parsed });
  await audit(user.id, "workshop.settings", `${workshop.name} · ${parsed.ageGroup} · Stufe ${parsed.supportLevel}`);
  revalidatePath(`/lehrer/${workshop.id}`);
}

export async function updateBrandingAction(formData: FormData): Promise<void> {
  const schema = z.object({
    colorPrimary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    colorAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  });
  const colors = schema.parse({
    colorPrimary: formData.get("colorPrimary"),
    colorAccent: formData.get("colorAccent"),
  });
  const { user, workshop } = await ownWorkshop(String(formData.get("workshopId")));

  let logoPath = workshop.logoPath;
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    if (file.size > 4 * 1024 * 1024) throw new Error("Logo zu groß (max. 4 MB)");
    // Nur Rasterformate; serverseitiges Re-Encoding nach WebP entfernt
    // eingebettete Payloads. SVG ist bewusst verboten (kann Skripte enthalten).
    const buf = Buffer.from(await file.arrayBuffer());
    const rel = path.join("logos", `${workshop.id}.webp`);
    const abs = dataPath(rel);
    await sharp(buf, { limitInputPixels: 30_000_000 })
      .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 })
      .toFile(abs);
    logoPath = rel;
  }
  if (formData.get("removeLogo") === "1" && workshop.logoPath) {
    const abs = path.resolve(dataPath(workshop.logoPath));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
    logoPath = "";
  }

  await db.workshop.update({
    where: { id: workshop.id },
    data: { ...colors, logoPath },
  });
  await audit(user.id, "workshop.branding", workshop.name);
  revalidatePath(`/lehrer/${workshop.id}`);
}

export async function restoreSnapshotAction(formData: FormData): Promise<void> {
  const snapshotId = String(formData.get("snapshotId"));
  const { user, group } = await ownGroup(String(formData.get("groupId")));
  const ok = await restoreSnapshot(snapshotId, group.id);
  if (ok) await audit(user.id, "group.snapshot-restored", `Gruppe ${group.index}`);
  revalidatePath(`/lehrer/${group.workshopId}/gruppe/${group.id}`);
}
