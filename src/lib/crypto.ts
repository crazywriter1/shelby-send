/**
 * Client-safe AES-GCM encryption/decryption for password-protected files.
 * Same key derivation and params used in API (server) and download page (client).
 */

const ALG = "AES-GCM";
const SALT_LEN = 16;
const IV_LEN = 12;
const KEY_LEN = 256;
const KDF_ITERATIONS = 250_000;

function getKeyMaterial(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
}

function deriveKey(salt: Uint8Array, keyMaterial: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: KDF_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALG, length: KEY_LEN },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypt bytes with password. Returns base64(salt + iv + ciphertext). */
export async function encryptBytes(password: string, data: Uint8Array): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const keyMaterial = await getKeyMaterial(password);
  const key = await deriveKey(salt, keyMaterial);

  const cipher = await crypto.subtle.encrypt(
    { name: ALG, iv: iv as BufferSource },
    key,
    data as BufferSource
  );

  const out = new Uint8Array(salt.length + iv.length + cipher.byteLength);
  out.set(salt, 0);
  out.set(iv, salt.length);
  out.set(new Uint8Array(cipher), salt.length + iv.length);

  return btoa(String.fromCharCode(...out));
}

/** Decrypt base64(salt + iv + ciphertext) with password. */
export async function decryptBytes(password: string, encoded: string): Promise<Uint8Array> {
  const raw = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  return decryptFromBytes(password, raw);
}

/** Encrypt to raw bytes (salt + iv + ciphertext) for storage. */
export async function encryptToBytes(password: string, data: Uint8Array): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const keyMaterial = await getKeyMaterial(password);
  const key = await deriveKey(salt, keyMaterial);

  const cipher = await crypto.subtle.encrypt(
    { name: ALG, iv: iv as BufferSource },
    key,
    data as BufferSource
  );

  const out = new Uint8Array(salt.length + iv.length + cipher.byteLength);
  out.set(salt, 0);
  out.set(iv, salt.length);
  out.set(new Uint8Array(cipher), salt.length + iv.length);
  return out;
}

/** Decrypt from raw bytes (salt + iv + ciphertext). */
export async function decryptFromBytes(password: string, raw: Uint8Array): Promise<Uint8Array> {
  const salt = raw.slice(0, SALT_LEN);
  const iv = raw.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const ciphertext = raw.slice(SALT_LEN + IV_LEN);

  const keyMaterial = await getKeyMaterial(password);
  const key = await deriveKey(salt, keyMaterial);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALG, iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  return new Uint8Array(decrypted);
}

/** Wrong password / corrupted ciphertext usually surfaces as OperationError from AES-GCM. */
export function isLikelyWrongPasswordError(err: unknown): boolean {
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    return err.name === "OperationError";
  }
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    return (
      m.includes("operationerror") ||
      m.includes("unable to decrypt") ||
      m.includes("decryption failed")
    );
  }
  return false;
}
