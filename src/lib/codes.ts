import crypto from "node:crypto";

/**
 * Gruppencodes: lang und nicht ratbar (kein g1–g5-Schema).
 * 20 Zeichen Base32 ≈ 100 Bit Entropie, URL- und QR-freundlich.
 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // ohne i/l/o/0/1 (Verwechslungsgefahr)

export function generateGroupCode(): string {
  const bytes = crypto.randomBytes(20);
  let out = "";
  for (let i = 0; i < 20; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomBytes(2).toString("hex");
  return base ? `${base}-${suffix}` : suffix;
}
