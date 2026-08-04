import "server-only";

/**
 * Einfacher In-Memory-Ratenbegrenzer (Sliding Window).
 * Reicht für eine Ein-Container-Instanz; bewusst kein Redis.
 */
type Entry = { hits: number[]; };
const buckets = new Map<string, Entry>();

export type LimitResult = { allowed: boolean; retryAfter: number };

export function rateLimit(key: string, max: number, windowSeconds: number): LimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const entry = buckets.get(key) ?? { hits: [] };
  entry.hits = entry.hits.filter((t) => now - t < windowMs);

  if (entry.hits.length >= max) {
    const oldest = entry.hits[0];
    buckets.set(key, entry);
    return { allowed: false, retryAfter: Math.ceil((windowMs - (now - oldest)) / 1000) };
  }
  entry.hits.push(now);
  buckets.set(key, entry);

  // gelegentlich aufräumen, damit die Map nicht wächst
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.hits.every((t) => now - t > windowMs)) buckets.delete(k);
    }
  }
  return { allowed: true, retryAfter: 0 };
}

/**
 * Geräte-Kennung aus einem Cookie — NICHT die IP:
 * im Schul-WLAN teilen sich alle iPads eine öffentliche IP (NAT).
 */
export const DEVICE_COOKIE = "s45_device";

export function deviceIdFrom(cookieValue: string | undefined): string {
  return cookieValue && /^[a-f0-9]{32}$/.test(cookieValue) ? cookieValue : "unbekannt";
}
