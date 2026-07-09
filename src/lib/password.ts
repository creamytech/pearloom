// ─────────────────────────────────────────────────────────────
// Pearloom / lib/password.ts — credential hashing for manual
// (email + password) accounts.
//
// scrypt with a per-user random salt, constant-time comparison.
// Stored format: `s2$<salt hex>$<hash hex>` — versioned so a
// future parameter bump can verify old hashes while writing new
// ones. Replaces the launch-era global-salt SHA-256 (which only
// ever guarded an in-memory map; no stored hashes to migrate).
// ─────────────────────────────────────────────────────────────

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 } as const;

export const MIN_PASSWORD_LENGTH = 8;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEYLEN, SCRYPT_OPTS).toString('hex');
  return `s2$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 's2') return false;
  const [, salt, hashHex] = parts;
  try {
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(password, salt, expected.length, SCRYPT_OPTS);
    return expected.length > 0 && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Basic strength gate — length only, by design. Length beats
 *  composition rules for real-world strength, and arbitrary
 *  symbol requirements just get appended '!'s. */
export function passwordProblem(password: string): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters, a few words you'll remember beat a short scramble.`;
  }
  if (password.length > 200) return 'That password is a novel, keep it under 200 characters.';
  return null;
}
