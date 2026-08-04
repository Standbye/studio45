import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { DEVICE_COOKIE } from "@/lib/rate-limit";

/**
 * Vergibt jedem Gerät eine anonyme Kennung (kein Personenbezug) — Grundlage
 * für Limits pro Gerät statt pro IP, weil alle iPads einer Schule hinter
 * derselben NAT-IP sitzen.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const existing = request.cookies.get(DEVICE_COOKIE)?.value;
  if (!existing || !/^[a-f0-9]{32}$/.test(existing)) {
    response.cookies.set(DEVICE_COOKIE, crypto.randomBytes(16).toString("hex"), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
