"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { hashPassword, generateStartPassword } from "@/lib/passwords";
import { generateGroupCode, generateSlug } from "@/lib/codes";
import { audit } from "@/lib/audit";
import { testeVerbindung } from "@/lib/llm";

export type ActionState = {
  ok: boolean;
  error?: string;
  hinweis?: string;
  startPassword?: string;
  username?: string;
};

const verbindungSchema = z.object({
  label: z.string().trim().min(1).max(60),
  secret: z.string().trim().min(8).max(500),
  protocol: z.enum(["anthropic", "openai"]),
  baseUrl: z.union([z.literal(""), z.string().trim().url().max(300)]),
  modelKid: z.string().trim().min(1).max(120),
  modelDirector: z.string().trim().min(1).max(120),
});

function verbindungAusForm(formData: FormData) {
  return verbindungSchema.safeParse({
    label: formData.get("label"),
    secret: formData.get("secret"),
    protocol: formData.get("protocol"),
    baseUrl: (formData.get("baseUrl") ?? "") as string,
    modelKid: formData.get("modelKid"),
    modelDirector: formData.get("modelDirector"),
  });
}

export async function createApiKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireUser("ADMIN");
  const parsed = verbindungAusForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Bitte alle Felder prüfen (URL muss vollständig sein)." };
  }
  await db.apiKey.create({ data: parsed.data });
  await audit(admin.id, "verbindung.created", `${parsed.data.label} (${parsed.data.protocol})`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateApiKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const vorhanden = await db.apiKey.findUnique({ where: { id } });
  if (!vorhanden) return { ok: false, error: "Verbindung nicht gefunden." };

  // Leeres Schlüsselfeld = Schlüssel unverändert lassen
  const geheimnis = String(formData.get("secret") ?? "").trim();
  const daten = new FormData();
  for (const [k, v] of formData.entries()) daten.set(k, v);
  if (!geheimnis) daten.set("secret", vorhanden.secret);

  const parsed = verbindungAusForm(daten);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Bitte alle Felder prüfen." };
  }
  await db.apiKey.update({ where: { id }, data: parsed.data });
  await audit(admin.id, "verbindung.updated", parsed.data.label);
  revalidatePath("/admin");
  return { ok: true };
}

/** Prüft eine gespeicherte Verbindung mit einem winzigen Testaufruf. */
export async function testApiKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const v = await db.apiKey.findUnique({ where: { id } });
  if (!v) return { ok: false, error: "Verbindung nicht gefunden." };

  const ergebnis = await testeVerbindung(
    { protocol: v.protocol, secret: v.secret, baseUrl: v.baseUrl },
    v.modelKid
  );
  await audit(admin.id, "verbindung.tested", `${v.label}: ${ergebnis.ok ? "ok" : "Fehler"}`);
  return ergebnis.ok
    ? { ok: true, hinweis: ergebnis.detail }
    : { ok: false, error: ergebnis.detail };
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
