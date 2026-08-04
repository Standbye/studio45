import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { sessionSecret } from "@/lib/env";
import type { Role } from "@/generated/prisma/enums";

const COOKIE = "s45_session";
const MAX_AGE_S = 60 * 60 * 10; // 10h — ein Schultag

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
};

/**
 * `Secure` nur setzen, wenn die Anfrage wirklich über HTTPS kam.
 *
 * Sonst passiert etwas Tückisches: Browser verwerfen ein Secure-Cookie auf einer
 * HTTP-Verbindung kommentarlos — der Login "gelingt", die nächste Seite wirft
 * einen aber zurück auf /login. Wer ohne TLS testet, hätte keine Chance, das zu
 * verstehen. Hinter einem Reverse-Proxy zählt X-Forwarded-Proto.
 */
async function istHttps(): Promise<boolean> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) return proto === "https";
  return (h.get("origin") ?? h.get("referer") ?? "").startsWith("https://");
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(sessionSecret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await istHttps(),
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Aktueller Benutzer aus dem Session-Cookie; null wenn nicht angemeldet. */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
  } catch {
    return null;
  }
});

/** Für API-Routen und Server-Actions: wirft, wenn nicht berechtigt. */
export async function requireUser(role?: Role): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (role && user.role !== role) throw new Error("FORBIDDEN");
  return user;
}

/**
 * Für Seiten: leitet zum Login um, statt einen 500er zu erzeugen.
 * Nötig für Seiten außerhalb der geschützten Layouts (z. B. Druckansichten).
 */
export async function requireUserPage(role?: Role): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/passwort");
  if (role && user.role !== role) redirect(user.role === "ADMIN" ? "/admin" : "/lehrer");
  return user;
}
