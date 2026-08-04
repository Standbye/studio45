import "server-only";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { DATA_DIR } from "@/lib/env";

function gameDir(groupId: string): string {
  // groupId ist ein cuid (alphanumerisch) — trotzdem defensiv säubern
  const safe = groupId.replace(/[^a-zA-Z0-9_-]/g, "");
  const dir = path.join(DATA_DIR, "games", safe);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readPlayHtml(groupId: string): string | null {
  const file = path.join(gameDir(groupId), "play.html");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

export function playVersion(groupId: string): number {
  const file = path.join(gameDir(groupId), "play.html");
  return fs.existsSync(file) ? Math.floor(fs.statSync(file).mtimeMs) : 0;
}

/** Veröffentlicht neues Spiel-HTML und legt einen Snapshot an. */
export async function publishGame(
  groupId: string,
  html: string,
  day: number,
  label: string
): Promise<void> {
  const dir = gameDir(groupId);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `tag${day}-${stamp}.html`;
  fs.writeFileSync(path.join(dir, fileName), html, "utf8");
  fs.writeFileSync(path.join(dir, "play.html"), html, "utf8");
  await db.snapshot.create({ data: { groupId, day, label, fileName } });
}

export async function restoreSnapshot(snapshotId: string, groupId: string): Promise<boolean> {
  const snap = await db.snapshot.findFirst({ where: { id: snapshotId, groupId } });
  if (!snap) return false;
  const file = path.join(gameDir(groupId), snap.fileName);
  if (!fs.existsSync(file)) return false;
  fs.copyFileSync(file, path.join(gameDir(groupId), "play.html"));
  return true;
}

export function wipeGroupGame(groupId: string): void {
  const dir = gameDir(groupId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}
