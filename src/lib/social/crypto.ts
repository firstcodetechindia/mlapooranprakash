import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_KEY is not set — required to store social account tokens. Generate one with: openssl rand -base64 32",
    );
  }
  // scrypt derives a fixed 32-byte key from whatever-length secret is
  // configured, rather than requiring the raw env var to be exactly 32
  // bytes itself.
  return scryptSync(secret, "pscc-social-token", 32);
}

/** Encrypts a token for storage in SocialAccount.accessTokenEncrypted. */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((b) => b.toString("base64")).join(".");
}

export function decryptToken(stored: string): string {
  const [ivB64, authTagB64, encryptedB64] = stored.split(".");
  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw new Error("Malformed encrypted token.");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf-8");
}
