// Veröffentlicht eine HTML-Datei als Spiel einer Gruppe (Test-/Reparaturwerkzeug).
// Aufruf: npx tsx scripts/publish-file.ts <gruppen-code> <datei.html>
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

async function main() {
  const [code, file] = process.argv.slice(2);
  if (!code || !file) throw new Error("Aufruf: publish-file.ts <gruppen-code> <datei.html>");

  const db = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./data/studio45.db" }),
  });
  const group = await db.group.findUnique({ where: { code }, include: { workshop: true } });
  if (!group) throw new Error("Gruppe nicht gefunden");

  const html = fs.readFileSync(file, "utf8");
  const dir = path.resolve(process.env.DATA_DIR ?? "./data", "games", group.id);
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `tag${group.workshop.currentDay}-${stamp}.html`;
  fs.writeFileSync(path.join(dir, fileName), html, "utf8");
  fs.writeFileSync(path.join(dir, "play.html"), html, "utf8");
  await db.snapshot.create({
    data: { groupId: group.id, day: group.workshop.currentDay, label: "Testveröffentlichung", fileName },
  });
  console.log(`veröffentlicht: Gruppe ${group.index} → ${dir}/play.html`);
  await db.$disconnect();
}

main();
