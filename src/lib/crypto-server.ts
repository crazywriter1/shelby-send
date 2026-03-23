/**
 * Server-side encryption (Node). Same format as client decrypt in crypto.ts.
 * PBKDF2-SHA256 250k, AES-256-GCM, output: base64(salt|iv|ciphertext+tag).
 */

import { randomBytes, createCipheriv, pbkdf2Sync } from "node:crypto";

const ALG = "aes-256-gcm";
const SALT_LEN = 16;
const IV_LEN = 12;
const KEY_LEN = 32;
const KDF_ITERATIONS = 250_000;

function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, KDF_ITERATIONS, KEY_LEN, "sha256");
}

/** Encrypt bytes; return base64(salt + iv + ciphertext + authTag). */
export function encryptBytesServer(password: string, data: Buffer): string {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(password, salt);

  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const out = Buffer.concat([salt, iv, encrypted, authTag]);
  return out.toString("base64");
}
