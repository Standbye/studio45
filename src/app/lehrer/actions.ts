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
import { restoreSnapshot, wipeGroupGame } from "@/lib/games";
import { leereBefunde, stufenName } from "@/lib/lernfall";

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

/** Lernfall freigeben, weiterschalten oder beenden (0 aus · 1 · 2 · 3 Auflösung). */
export async function setLernfallStufeAction(formData: FormData): Promise<void> {
  const stufe = z.coerce.number().int().min(0).max(3).parse(formData.get("stufe"));
  const { user, workshop } = await ownWorkshop(String(formData.get("workshopId")));
  await db.workshop.update({ where: { id: workshop.id }, data: { lernfallStufe: stufe } });
  await audit(user.id, "workshop.lernfall", `${workshop.name} → ${stufenName(stufe)}`);
  revalidatePath(`/lehrer/${workshop.id}`);
  revalidatePath(`/lehrer/${workshop.id}/lernfall`);
}

/** Prüflisten aller Gruppen leeren — für einen neuen Durchgang oder nach dem eigenen Ausprobieren. */
export async function resetLernfallBefundeAction(formData: FormData): Promise<void> {
  const { user, workshop } = await ownWorkshop(String(formData.get("workshopId")));
  await db.group.updateMany({ where: { workshopId: workshop.id }, data: { lernfallBefunde: leereBefunde() } });
  await audit(user.id, "workshop.lernfall-reset", workshop.name);
  revalidatePath(`/lehrer/${workshop.id}/lernfall`);
}

/**
 * Workshop zurücksetzen, z. B. nach dem Ausprobieren: Spiele, Verläufe, Versuche,
 * Director's Cut und Lernfall-Prüflisten aller Gruppen weg, zurück auf Tag 1 im Plenum.
 * Gruppen mit Namen, Codes (QR-Blätter bleiben gültig) und Reglern bleiben, ebenso alle
 * Einstellungen. Der Token-Verbrauch bleibt stehen: Er ist echt angefallen und gehört
 * zum Budget, das der Admin vorgibt.
 */
export async function resetWorkshopAction(formData: FormData): Promise<void> {
  const { user, workshop } = await ownWorkshop(String(formData.get("workshopId")));
  const groups = await db.group.findMany({ where: { workshopId: workshop.id }, select: { id: true, generating: true } });
  if (groups.some((g) => g.generating)) throw new Error("Gerade baut eine Gruppe — bitte warten, bis der Bau fertig ist.");

  const ids = groups.map((g) => g.id);
  await db.$transaction([
    db.promptLog.deleteMany({ where: { groupId: { in: ids } } }),
    db.snapshot.deleteMany({ where: { groupId: { in: ids } } }),
    db.group.updateMany({
      where: { workshopId: workshop.id },
      data: {
        genUsed: 0, genBonus: 0, lastGenAt: null, generating: false, generatingSince: null, locked: false,
        dcSpec: "", dcStatus: "", dcHinweis: "", lernfallBefunde: "",
      },
    }),
    db.workshop.update({ where: { id: workshop.id }, data: { currentDay: 1, phase: "PLENUM", lernfallStufe: 0 } }),
  ]);
  for (const id of ids) wipeGroupGame(id);

  await audit(user.id, "workshop.reset", workshop.name);
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

/**
 * Eigene Regler einer Gruppe setzen. Leeres Feld = wieder die Einstellung des Workshops.
 */
export async function setGroupLevelsAction(formData: FormData): Promise<void> {
  const leerOderZahl = (min: number, max: number) =>
    z.union([z.literal(""), z.coerce.number().int().min(min).max(max)]).transform((v) => (v === "" ? null : v));
  const parsed = z
    .object({ supportLevel: leerOderZahl(1, 5), helpLevel: leerOderZahl(0, 3) })
    .parse({ supportLevel: formData.get("supportLevel") ?? "", helpLevel: formData.get("helpLevel") ?? "" });
  const { user, group } = await ownGroup(String(formData.get("groupId")));
  await db.group.update({ where: { id: group.id }, data: parsed });
  await audit(
    user.id,
    "group.levels",
    `Gruppe ${group.index}: Spielraum ${parsed.supportLevel ?? "wie Workshop"} · Hilfe ${parsed.helpLevel ?? "wie Workshop"}`
  );
  revalidatePath(`/lehrer/${group.workshopId}`);
}

/** Alle Gruppen auf die Einstellung des Workshops zurückstellen. */
export async function resetGroupLevelsAction(formData: FormData): Promise<void> {
  const { user, workshop } = await ownWorkshop(String(formData.get("workshopId")));
  const geaendert = await db.group.updateMany({
    where: { workshopId: workshop.id, OR: [{ supportLevel: { not: null } }, { helpLevel: { not: null } }] },
    data: { supportLevel: null, helpLevel: null },
  });
  await audit(user.id, "workshop.levels-reset", `${workshop.name}: ${geaendert.count} Gruppe(n) zurückgestellt`);
  revalidatePath(`/lehrer/${workshop.id}`);
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
    helpLevel: z.coerce.number().int().min(0).max(3),
    genLimitPerLesson: z.coerce.number().int().min(1).max(20),
    cooldownSeconds: z.coerce.number().int().min(0).max(1800),
    challenge: z.boolean(),
  });
  const parsed = schema.parse({
    learningGoal: formData.get("learningGoal") ?? "",
    ageGroup: formData.get("ageGroup"),
    supportLevel: formData.get("supportLevel"),
    helpLevel: formData.get("helpLevel"),
    genLimitPerLesson: formData.get("genLimitPerLesson"),
    cooldownSeconds: formData.get("cooldownSeconds"),
    challenge: formData.get("challenge") === "1",
  });
  await db.workshop.update({ where: { id: workshop.id }, data: parsed });
  await audit(user.id, "workshop.settings", `${workshop.name} · ${parsed.ageGroup} · Spielraum ${parsed.supportLevel} · Hilfe ${parsed.helpLevel}`);
  revalidatePath(`/lehrer/${workshop.id}`);
}

export async function updateBrandingAction(formData: FormData): Promise<void> {
  const schema = z.object({
    colorPrimary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    colorAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    beamerStil: z.enum(["", "vortrag"]).catch(""),
  });
  const colors = schema.parse({
    colorPrimary: formData.get("colorPrimary"),
    colorAccent: formData.get("colorAccent"),
    beamerStil: formData.get("beamerStil") ?? "",
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
