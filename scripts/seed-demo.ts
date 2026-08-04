// Demo-Daten für lokale Verifikation: Lehrkraft, API-Key (Platzhalter), Workshop mit 3 Gruppen.
// Aufruf: node scripts/seed-demo.mjs [echter-api-key]
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "@node-rs/argon2";
import crypto from "node:crypto";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./data/studio45.db" }),
});

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const code = () => Array.from(crypto.randomBytes(20), (b) => ALPHABET[b % ALPHABET.length]).join("");

async function main() {
  const apiSecret = process.argv[2] ?? "sk-ant-PLATZHALTER-nur-fuer-lokale-oberflaechen-tests";

  const teacher = await db.user.upsert({
    where: { username: "muster" },
    update: {},
    create: {
      username: "muster",
      displayName: "Frau Muster",
      passwordHash: await hash("Demo-Passwort-2026", { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
      role: "TEACHER",
      mustChangePassword: false,
    },
  });

  const key = await db.apiKey.upsert({
    where: { id: "demo-key" },
    update: { secret: apiSecret },
    create: { id: "demo-key", label: "Demo-Key", secret: apiSecret },
  });

  const existing = await db.workshop.findUnique({ where: { slug: "demo-lindenschule" } });
  if (existing) {
    await db.workshop.update({
      where: { id: existing.id },
      data: { apiKeyId: key.id, teacherId: teacher.id, phase: "STUDIO" },
    });
    console.log("Workshop aktualisiert:", existing.slug);
  } else {
    const w = await db.workshop.create({
      data: {
        slug: "demo-lindenschule",
        name: "Lindenschule Gerlachsheim",
        className: "4a",
        teacherId: teacher.id,
        apiKeyId: key.id,
        totalDays: 3,
        currentDay: 1,
        phase: "STUDIO",
        guidance: "IMPULSE",
        learningGoal: "Baue Mathe-Aufgaben der 4. Klasse (kleines Einmaleins) als Hindernisse in das Spiel ein.",
        colorPrimary: "#1d4e89",
        colorAccent: "#c9a24b",
        groups: {
          create: [
            { index: 1, studioName: "NSK", code: code() },
            { index: 2, studioName: "Die Freundschaft", code: code() },
            { index: 3, studioName: "SK Gaming", code: code() },
          ],
        },
      },
      include: { groups: true },
    });
    console.log("Workshop angelegt:", w.slug);
  }

  const groups = await db.group.findMany({
    where: { workshop: { slug: "demo-lindenschule" } },
    orderBy: { index: "asc" },
  });
  console.log("Lehrer-Login: muster / Demo-Passwort-2026");
  for (const g of groups) console.log(`Gruppe ${g.index} (${g.studioName}): /g/${g.code}`);
  await db.$disconnect();

}

main();
