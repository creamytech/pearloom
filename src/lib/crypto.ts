// ─────────────────────────────────────────────────────────────
// Pearloom / lib/crypto.ts
// AES-256-GCM envelope encryption for R2 image storage.
// Layout: [12-byte IV][16-byte GCM auth tag][ciphertext]
// Key: PEARLOOM_ENCRYPTION_KEY env var — 32 raw bytes, base64-encoded.
// Generate with: openssl rand -base64 32
// ─────────────────────────────────────────────────────────────

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;    // 96-bit IV — recommended for GCM
const TAG_LENGTH = 16;   // 128-bit auth tag

function getKey(): Buffer {
  const raw = process.env.PEARLOOM_ENCRYPTION_KEY;
  if (!raw) throw new Error('PEARLOOM_ENCRYPTION_KEY is not set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('PEARLOOM_ENCRYPTION_KEY must be 32 bytes (base64)');
  return key;
}

/** Encrypt a buffer. Returns [IV ‖ authTag ‖ ciphertext]. */
export function encryptBuffer(plaintext: Buffer): Buffer {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

/** Decrypt a buffer produced by encryptBuffer. Throws on tamper/wrong key. */
export function decryptBuffer(data: Buffer): Buffer {
  const key = getKey();
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/** Returns true if the encryption key env var is configured. */
export function isEncryptionEnabled(): boolean {
  try { getKey(); return true; } catch { return false; }
}
