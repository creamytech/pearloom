import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, RATE_LIMITS } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    // Reset rate limit state by using unique keys per test
  });

  it('allows requests within the rate limit', () => {
    const key = `test-${Date.now()}-allow`;
    const result = checkRateLimit(key, RATE_LIMITS.rsvp);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.rsvp.max - 1);
  });

  it('blocks requests exceeding the rate limit', () => {
    const key = `test-${Date.now()}-block`;
    const config = { max: 3, windowMs: 60_000 };

    // Use up the limit
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit(key, config);
      expect(r.allowed).toBe(true);
    }

    // Next request should be blocked
    const blocked = checkRateLimit(key, config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('tracks different keys independently', () => {
    const keyA = `test-${Date.now()}-a`;
    const keyB = `test-${Date.now()}-b`;
    const config = { max: 1, windowMs: 60_000 };

    expect(checkRateLimit(keyA, config).allowed).toBe(true);
    expect(checkRateLimit(keyB, config).allowed).toBe(true);

    // Both should be blocked now (independently)
    expect(checkRateLimit(keyA, config).allowed).toBe(false);
    expect(checkRateLimit(keyB, config).allowed).toBe(false);
  });
});

describe('RATE_LIMITS', () => {
  it('has required rate limit configurations', () => {
    expect(RATE_LIMITS.aiGenerate).toBeDefined();
    expect(RATE_LIMITS.aiGenerate.max).toBeGreaterThan(0);
    expect(RATE_LIMITS.aiBlocks).toBeDefined();
    expect(RATE_LIMITS.rsvp).toBeDefined();
    expect(RATE_LIMITS.guestbook).toBeDefined();
  });
});
