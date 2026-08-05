import { db } from "@/lib/db";
import { readPlayHtml } from "@/lib/games";
import { farbschema } from "@/lib/kontrast";

export const dynamic = "force-dynamic";

/**
 * Liefert das aktuelle Spiel der Gruppe als eigenständige HTML-Seite.
 * Generierter Code ist untrusted: strikte CSP (keinerlei externe Requests),
 * zusätzlich läuft die Seite im Eltern-Dokument in einem sandbox-iframe
 * ohne allow-same-origin.
 */
export async function GET(_req: Request, ctx: RouteContext<"/g/[code]/play">) {
  const { code } = await ctx.params;
  const group = await db.group.findUnique({
    where: { code },
    include: { workshop: { select: { archived: true, colorPrimary: true, colorAccent: true } } },
  });
  if (!group || group.workshop.archived) {
    return new Response("Nicht gefunden", { status: 404 });
  }

  const platzhalterFarben = farbschema(group.workshop.colorPrimary, group.workshop.colorAccent);
  const html =
    readPlayHtml(group.id) ??
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;min-height:100svh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:${platzhalterFarben.primary};color:${platzhalterFarben.aufPrimary};text-align:center}div{padding:2rem}h1{font-size:2rem}</style></head><body><div><h1>🎮 Hier entsteht euer Spiel!</h1><p>Sagt der KI unten, was ihr bauen wollt — dann erscheint es hier.</p></div></body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
    },
  });
}
