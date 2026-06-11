// password.ts — manual-account hashing contract.
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, passwordProblem, MIN_PASSWORD_LENGTH } from './password';

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
    expect(verifyPassword('the right one', h.slice(0, -2) + 'ff')).toBe(false);
    expect(verifyPassword('anything', null)).toBe(false);
    expect(verifyPassword('anything', '')).toBe(false);
    expect(verifyPassword('anything', 'sha256$deadbeef')).toBe(false);
    expect(verifyPassword('anything', 's2$onlytwo')).toBe(false);
  });
});

describe('passwordProblem', () => {
  it('gates on length only', () => {
    expect(passwordProblem('short')).toMatch(String(MIN_PASSWORD_LENGTH));
    expect(passwordProblem('a'.repeat(MIN_PASSWORD_LENGTH))).toBeNull();
    expect(passwordProblem('x'.repeat(201))).toMatch(/200/);
  });
});
