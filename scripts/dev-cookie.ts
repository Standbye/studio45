// Dev-Helfer: gibt ein Session-Cookie für einen Benutzer aus (lokale Tests mit curl).
// Aufruf: npx tsx scripts/dev-cookie.ts <username>
import "dotenv/config";
import fs from "node:fs";
import { SignJWT } from "jose";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

async function main() {
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./data/studio45.db" }) });
  const user = await db.user.findUnique({ where: { username: process.argv[2] ?? "muster" } });
  if (!user) throw new Error("Benutzer nicht gefunden");
  const ausEnv = process.env.SESSION_SECRET;
  const secret = ausEnv && ausEnv.length >= 32 ? ausEnv : fs.readFileSync("data/session-secret", "utf8").trim();
  const token = await new SignJWT({ sub: user.id }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("2h").sign(new TextEncoder().encode(secret));
  console.log(`s45_session=${token}`);
  await db.$disconnect();
}
main();
