import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { DEVICE_COOKIE, deviceIdFrom, rateLimit } from "@/lib/rate-limit";

/**
 * Zugang für eine Vertretung („Lehrkraft: Login oder Workshop-Code“, Konzept Abschnitt 4).
 *
 * Der Link /v/<code> ist das Zugangsmittel — wie der QR-Code der Gruppen: lang, nicht ratbar,
 * von der Lehrkraft jederzeit neu zu erzeugen oder abzuschalten. Wer ihn hat, steuert nur die
 * Stunde: Tag, Phase, neue Stunde, Gruppen sperren, Versuche nachlegen. Einstellungen,
 * KI-Anweisung, Branding, Zurücksetzen und der KI-Zugang bleiben beim Konto der Lehrkraft.
 */
export async function vertretungsWorkshop(code: string) {
  if (!/^[a-z0-9]{20,}$/.test(code)) return null;
  const w = await db.workshop.findFirst({ where: { vertretungsCode: code, archived: false } });
  if (!w) {
    // Enumeration-Schutz wie bei den Gruppencodes: Fehlversuche pro Gerät begrenzen
    const jar = await cookies();
    rateLimit(`vertretung-miss:${deviceIdFrom(jar.get(DEVICE_COOKIE)?.value)}`, 10, 300);
  }
  return w;
}
