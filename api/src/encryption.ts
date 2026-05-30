/**
 * AES-256-GCM symmetric encryption with key versioning.
 *
 * Storage format (string):
 * v1:<iv-hex>:<tag-hex>:<ciphertext-hex>
 *
 * The version prefix lets us rotate keys later: add v2 logic and check the
 * prefix on decrypt. The current key is read from ENCRYPTION_KEY (hex,
 * exactly 64 chars / 32 bytes). In tests / dev a deterministic fallback
 * key is used so the build never crashes -- but encrypted data written with
 * the dev key is NOT compatible with the prod key.
 */
import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const VERSION = "v1";

let warnedAboutFallback = false;

function loadKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (raw && /^[0-9a-fA-F]{64}$/.test(raw.trim())) {
    return Buffer.from(raw.trim(), "hex");
  }
  if (raw && raw.length >= 32) {
    // Allow a 32+ char passphrase too -- derived deterministically.
    return crypto.createHash("sha256").update(raw).digest();
  }
  if (!warnedAboutFallback) {
    // eslint-disable-next-line no-console
    console.warn(
      "[encryption] ENCRYPTION_KEY missing or malformed; using dev fallback."
    +
      "Set ENCRYPTION_KEY to a 64-character hex string in production.",
    );
    warnedAboutFallback = true;
  }
  return crypto
    .createHash("sha256")
    .update(process.env.JWT_SECRET ?? "upcat-dev-encryption-fallback")
    .digest();
}

let keyCache: Buffer | null = null;

function getKey(): Buffer {
  if (!keyCache) keyCache = loadKey();
  return keyCache;
}

/** Encrypt a UTF-8 string. Returns the versioned hex format above. */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

/** Decrypt a string produced by encrypt(). Throws if tampered with. */
export function decrypt(payload: string): string {
  if (!payload) throw new Error("decrypt: empty payload");
  const parts = payload.split(":");
  if (parts.length !== 4) throw new Error("decrypt: malformed payload");
  const [version, ivHex, tagHex, ctHex] = parts;
  if (version !== VERSION) throw new Error(`decrypt: unsupported key version "${version}"`);
  const iv = Buffer.from(ivHex!, "hex");
  const tag = Buffer.from(tagHex!, "hex");
  const ct = Buffer.from(ctHex!, "hex");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

/** Best-effort decrypt that returns null on any failure -- useful for non-critical fields. */
export function tryDecrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    return decrypt(payload);
  } catch {
    return null;
  }
}

/** Mask a secret for safe display ("****abcd"). */
export function maskSecret(secret: string | null | undefined): string {
  if (!secret) return "";
  if (secret.length <= 4) return "*".repeat(secret.length);
  return "*".repeat(Math.max(4, secret.length - 4)) + secret.slice(-4);
}