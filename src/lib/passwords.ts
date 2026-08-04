import "server-only";
import { hash, verify } from "@node-rs/argon2";

const PARAMS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export async function hashPassword(password: string): Promise<string> {
  return hash(password, PARAMS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Aussprechbares Startpasswort für Lehrer-Accounts (Übergabe auf Papier). */
export function generateStartPassword(): string {
  const words = ["Linde", "Ahorn", "Birke", "Eiche", "Kastanie", "Weide", "Buche", "Tanne"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${num}`;
}
