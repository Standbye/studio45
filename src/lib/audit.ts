import "server-only";
import { db } from "@/lib/db";

export async function audit(userId: string | null, action: string, detail = ""): Promise<void> {
  try {
    await db.auditLog.create({ data: { userId, action, detail } });
  } catch {
    // Audit darf nie die eigentliche Aktion blockieren
  }
}
