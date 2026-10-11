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

/**
 * Die Fassung vor dem aktuellen Spiel — für „Einen Schritt zurück" in der Kinder-App.
 *
 * Der aktuelle Stand wird über den Dateiinhalt wiedergefunden (früheste gleiche Fassung);
 * davor liegt die nächste Fassung mit anderem Inhalt. Weil jedes Zurückgehen selbst als
 * Fassung festgehalten wird, bleibt der Verlauf gerade: Wer zurückgeht, weiterbaut und
 * wieder zurückgeht, landet nicht in der verworfenen Fassung.
 */
export async function vorherigeFassung(groupId: string): Promise<{ fileName: string } | null> {
  const dir = gameDir(groupId);
  const playFile = path.join(dir, "play.html");
  if (!fs.existsSync(playFile)) return null;
  const snaps = await db.snapshot.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
    select: { fileName: true },
  });
  if (snaps.length < 2) return null;

  const play = fs.readFileSync(playFile);
  const gleich = (fileName: string): boolean | null => {
    const f = path.join(dir, fileName);
    if (!fs.existsSync(f)) return null; // Datei fehlt — überspringen
    return fs.statSync(f).size === play.length && fs.readFileSync(f).equals(play);
  };

  let pos = snaps.findIndex((s) => gleich(s.fileName) === true);
  if (pos < 0) pos = snaps.length; // unbekannter Stand: zurück zur letzten gespeicherten Fassung
  for (let i = pos - 1; i >= 0; i--) {
    if (gleich(snaps[i].fileName) === false) return snaps[i];
  }
  return null;
}

/** Stellt die vorherige Fassung wieder her und hält das als eigene Fassung fest. */
export async function schrittZurueck(groupId: string, day: number): Promise<boolean> {
  const ziel = await vorherigeFassung(groupId);
  if (!ziel) return false;
  const html = fs.readFileSync(path.join(gameDir(groupId), ziel.fileName), "utf8");
  await publishGame(groupId, html, day, "↩︎ Einen Schritt zurück");
  return true;
}

export function wipeGroupGame(groupId: string): void {
  const dir = gameDir(groupId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}
