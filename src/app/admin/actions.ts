"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { hashPassword, generateStartPassword } from "@/lib/passwords";
import { generateGroupCode, generateSlug } from "@/lib/codes";
import { audit } from "@/lib/audit";

export type ActionState = {
  ok: boolean;
  error?: string;
  startPassword?: string;
  username?: string;
};

const IDLE: ActionState = { ok: false };

export async function createApiKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireUser("ADMIN");
  const schema = z.object({
    label: z.string().trim().min(1).max(60),
    secret: z.string().trim().min(20).max(300),
  });
  const parsed = schema.safeParse({ label: formData.get("label"), secret: formData.get("secret") });
  if (!parsed.success) return { ok: false, error: "Bitte Bezeichnung und einen gültigen Key angeben." };
  await db.apiKey.create({ data: parsed.data });
  await audit(admin.id, "apikey.created", parsed.data.label);
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteApiKeyAction(formData: FormData): Promise<void> {
  const admin = await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const key = await db.apiKey.findUnique({ where: { id }, include: { workshops: true } });
  if (!key) return;
  await db.apiKey.delete({ where: { id } });
  await audit(admin.id, "apikey.deleted", key.label);
  revalidatePath("/admin");
}

export async function createTeacherAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireUser("ADMIN");
  const schema = z.object({
    displayName: z.string().trim().min(2).max(80),
    username: z.string().trim().min(2).max(60).regex(/^[a-zA-Z0-9._-]+$/, "nur Buchstaben/Zahlen/._-"),
  });
  const parsed = schema.safeParse({
    displayName: formData.get("displayName"),
    username: formData.get("username"),
  });
  if (!parsed.success) return { ok: false, error: "Name min. 2 Zeichen, Benutzername nur Buchstaben/Zahlen/._-" };
  const exists = await db.user.findUnique({ where: { username: parsed.data.username } });
  if (exists) return { ok: false, error: "Benutzername ist schon vergeben." };

  const startPassword = generateStartPassword();
  await db.user.create({
    data: {
      ...parsed.data,
      passwordHash: await hashPassword(startPassword),
      role: "TEACHER",
      mustChangePassword: true,
    },
  });
  await audit(admin.id, "teacher.created", parsed.data.username);
  revalidatePath("/admin");
  return { ok: true, startPassword, username: parsed.data.username };
}

export async function resetTeacherPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const teacher = await db.user.findFirst({ where: { id, role: "TEACHER" } });
  if (!teacher) return { ok: false, error: "Lehrkraft nicht gefunden." };
  const startPassword = generateStartPassword();
  await db.user.update({
    where: { id },
    data: {
      passwordHash: await hashPassword(startPassword),
      mustChangePassword: true,
      failedLogins: 0,
      lockedUntil: null,
    },
  });
  await audit(admin.id, "teacher.password-reset", teacher.username);
  revalidatePath("/admin");
  return { ok: true, startPassword, username: teacher.username };
}

export async function deleteTeacherAction(formData: FormData): Promise<void> {
  const admin = await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const teacher = await db.user.findFirst({ where: { id, role: "TEACHER" } });
  if (!teacher) return;
  await db.user.delete({ where: { id } });
  await audit(admin.id, "teacher.deleted", teacher.username);
  revalidatePath("/admin");
}

export async function createWorkshopAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireUser("ADMIN");
  const schema = z.object({
    name: z.string().trim().min(2).max(80),
    className: z.string().trim().max(40),
    teacherId: z.string().min(1, "Lehrkraft wählen"),
    apiKeyId: z.string().min(1, "API-Key wählen"),
    groupCount: z.coerce.number().int().min(1).max(10),
    totalDays: z.coerce.number().int().min(1).max(10),
    tokenBudget: z.coerce.number().int().min(10000).max(100_000_000),
  });
  const parsed = schema.safeParse({
    name: formData.get("name"),
    className: formData.get("className"),
    teacherId: formData.get("teacherId"),
    apiKeyId: formData.get("apiKeyId"),
    groupCount: formData.get("groupCount"),
    totalDays: formData.get("totalDays"),
    tokenBudget: formData.get("tokenBudget"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Eingaben prüfen." };
  }
  const { groupCount, ...data } = parsed.data;

  const workshop = await db.workshop.create({
    data: {
      ...data,
      slug: generateSlug(data.name),
      groups: {
        create: Array.from({ length: groupCount }, (_, i) => ({
          index: i + 1,
          code: generateGroupCode(),
        })),
      },
    },
  });
  await audit(admin.id, "workshop.created", `${workshop.name} (${groupCount} Gruppen)`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function archiveWorkshopAction(formData: FormData): Promise<void> {
  const admin = await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const w = await db.workshop.findUnique({ where: { id } });
  if (!w) return;
  await db.workshop.update({ where: { id }, data: { archived: !w.archived } });
  await audit(admin.id, w.archived ? "workshop.unarchived" : "workshop.archived", w.name);
  revalidatePath("/admin");
}
