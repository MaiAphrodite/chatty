import crypto from "crypto";
import { env } from "bun";

const ENCRYPTION_KEY = Buffer.from(
  env.ENCRYPTION_KEY ||
    "0000000000000000000000000000000000000000000000000000000000000000",
  "hex"
); // Must be 32 bytes/64 hex chars for AES-256

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended length

export function encryptKey(text: string): string {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag().toString("base64");

    return `${iv.toString("base64")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("Encryption failed:", err);
    return text;
  }
}

export function decryptKey(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(":")) return encryptedText;

  try {
    const [ivStr, authTagStr, encrypted] = encryptedText.split(":");
    const iv = Buffer.from(ivStr, "base64");
    const authTag = Buffer.from(authTagStr, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err);
    return encryptedText; // Fallback for transition periods or raw unencrypted
  }
}
