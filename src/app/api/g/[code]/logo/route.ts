import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { DATA_DIR } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/g/[code]/logo">) {
  const { code } = await ctx.params;
  const group = await db.group.findUnique({
    where: { code },
    include: { workshop: { select: { logoPath: true } } },
  });
  const logoPath = group?.workshop.logoPath;
  if (!logoPath) return new Response("Kein Logo", { status: 404 });

  // logoPath ist ein relativer Pfad unterhalb von DATA_DIR (vom Upload gesetzt)
  const file = path.resolve(DATA_DIR, logoPath);
  if (!file.startsWith(DATA_DIR) || !fs.existsSync(file)) {
    return new Response("Kein Logo", { status: 404 });
  }
  const buf = fs.readFileSync(file);
  return new Response(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
