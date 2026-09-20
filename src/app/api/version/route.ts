import { NextResponse } from "next/server";
import { buildInfo } from "@/lib/version";

export const dynamic = "force-dynamic";

/** Öffentlich und unkritisch: welcher Stand läuft — für deploy.sh und neugierige Menschen. */
export function GET() {
  return NextResponse.json(
    { name: "Studio45", ...buildInfo() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
