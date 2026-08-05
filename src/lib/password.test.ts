// password.ts — manual-account hashing contract.
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, passwordProblem, MIN_PASSWORD_LENGTH } from './password';

/** Flip the final hex digit — deterministically DIFFERENT for any
 *  hash, unlike appending a fixed suffix that can collide with what
 *  the salt already produced. */
function tamper(hash: string): string {
  return hash.slice(0, -1) + (hash.endsWith('f') ? '0' : 'f');
}

describe('hashPassword / verifyPassword', () => {
  it('round-trips and salts per-user', () => {
    const a = hashPassword('correct horse battery staple');
    const b = hashPassword('correct horse battery staple');
    expect(a).not.toBe(b); // random salt — equal inputs differ
    expect(a.startsWith('s2$')).toBe(true);
    expect(verifyPassword('correct horse battery staple', a)).toBe(true);
    expect(verifyPassword('correct horse battery staple', b)).toBe(true);
  });

  it('rejects wrong passwords, tampered and malformed hashes', () => {
    const h = hashPassword('the right one');
    expect(verifyPassword('the wrong one', h)).toBe(false);
    expect(verifyPassword('the right one', tamper(h))).toBe(false);
    expect(verifyPassword('anything', null)).toBe(false);
    expect(verifyPassword('anything', '')).toBe(false);
    expect(verifyPassword('anything', 'sha256$deadbeef')).toBe(false);
    expect(verifyPassword('anything', 's2$onlytwo')).toBe(false);
  });
});

describe('tampered hashes reject EVERY time, not 255 times in 256', () => {
  // The old tamper was `h.slice(0, -2) + 'ff'`, a NO-OP whenever the
  // hash already ended in "ff" — and hashPassword uses a random
  // salt, so that was ~1 run in 256. The assertion then inverted
  // (the untouched hash verifies) and the suite failed for reasons
  // nobody could reproduce. A flaky security test is worse than no
  // test: it teaches people to re-run until green.

  it('changes the hash for EVERY possible final character', () => {
    // The flakiness lived in the string transform, not in scrypt —
    // so prove it exhaustively here, where it costs nothing, rather
    // than sampling expensive hashes and hoping to hit the 1/256.
    for (const c of '0123456789abcdef') {
      const fake = `s2$salt$${'0'.repeat(20)}${c}`;
      expect(tamper(fake), `final char "${c}"`).not.toBe(fake);
      expect(tamper(fake)).toHaveLength(fake.length);
    }
  });

  it('rejects the tampered hash on real, freshly-salted hashes', () => {
    // scrypt is deliberately slow, so a handful — the exhaustive
    // case above is what actually pins the bug.
    for (let i = 0; i < 5; i += 1) {
      const h = hashPassword('the right one');
      const t = tamper(h);
      expect(t).not.toBe(h);
      expect(verifyPassword('the right one', t), `iteration ${i}`).toBe(false);
    }
  });
});

describe('passwordProblem', () => {
  it('gates on length only', () => {
    expect(passwordProblem('short')).toMatch(String(MIN_PASSWORD_LENGTH));
    expect(passwordProblem('a'.repeat(MIN_PASSWORD_LENGTH))).toBeNull();
    expect(passwordProblem('x'.repeat(201))).toMatch(/200/);
  });
});
