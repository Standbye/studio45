"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { createSession, destroySession, currentUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { DEVICE_COOKIE, deviceIdFrom, rateLimit } from "@/lib/rate-limit";

const LOCKOUT_AFTER = 8;
const LOCKOUT_MINUTES = 5;

const credentialsSchema = z.object({
  username: z.string().trim().min(2).max(60),
  password: z.string().min(8).max(200),
});

export async function setupAction(formData: FormData): Promise<void> {
  const adminCount = await db.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) redirect("/login");

  const parsed = credentialsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/setup?fehler=eingabe");
  if (formData.get("password") !== formData.get("password2")) redirect("/setup?fehler=wiederholung");

  const user = await db.user.create({
    data: {
      username: parsed.data.username,
      displayName: String(formData.get("displayName") || parsed.data.username).slice(0, 80),
      passwordHash: await hashPassword(parsed.data.password),
      role: "ADMIN",
    },
  });
  await audit(user.id, "setup.admin-created", user.username);
  await createSession(user.id);
  redirect("/admin");
}

export async function loginAction(formData: FormData): Promise<void> {
  // Bremse gegen Bruteforce zusätzlich zur Konto-Sperre
  const jar = await cookies();
  const device = deviceIdFrom(jar.get(DEVICE_COOKIE)?.value);
  if (!rateLimit(`login:${device}`, 20, 300).allowed) redirect("/login?fehler=zuviele");

  const parsed = credentialsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/login?fehler=eingabe");

  const user = await db.user.findUnique({ where: { username: parsed.data.username } });
  if (!user) {
    // Timing-Angleich: auch bei unbekanntem Benutzer einen Hash prüfen
    await verifyPassword("$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", parsed.data.password);
    redirect("/login?fehler=zugangsdaten");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    redirect("/login?fehler=gesperrt");
  }

  const ok = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!ok) {
    const failed = user.failedLogins + 1;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLogins: failed,
        lockedUntil:
          failed >= LOCKOUT_AFTER ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
      },
    });
    await audit(user.id, "login.failed", `Versuch ${failed}`);
    redirect(failed >= LOCKOUT_AFTER ? "/login?fehler=gesperrt" : "/login?fehler=zugangsdaten");
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null },
  });
  await audit(user.id, "login.ok");
  await createSession(user.id);

  if (user.mustChangePassword) redirect("/passwort");
  redirect(user.role === "ADMIN" ? "/admin" : "/lehrer");
}

export async function changePasswordAction(formData: FormData): Promise<void> {
  const session = await currentUser();
  if (!session) redirect("/login");

  const schema = z.object({
    current: z.string().min(1).max(200),
    next: z.string().min(10).max(200),
  });
  const parsed = schema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
  });
  if (!parsed.success) redirect("/passwort?fehler=eingabe");
  if (formData.get("next") !== formData.get("next2")) redirect("/passwort?fehler=wiederholung");

  const user = await db.user.findUniqueOrThrow({ where: { id: session.id } });
  if (!(await verifyPassword(user.passwordHash, parsed.data.current))) {
    redirect("/passwort?fehler=aktuell");
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.next), mustChangePassword: false },
  });
  await audit(user.id, "password.changed");
  await createSession(user.id); // Session erneuern
  redirect(user.role === "ADMIN" ? "/admin" : "/lehrer");
}

export async function logoutAction(): Promise<void> {
  const session = await currentUser();
  if (session) await audit(session.id, "logout");
  await destroySession();
  redirect("/login");
}
