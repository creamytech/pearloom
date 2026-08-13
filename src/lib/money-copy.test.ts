// The M.8 fence: a till's failure text always speaks host language —
// what happened, nothing was charged, what to do next — and never
// leaks the server's infrastructure-speak (L83).

import { describe, expect, it } from 'vitest';
import { humanizeCheckoutError, isPaymentsUnconfigured } from '@/lib/money-copy';

describe('humanizeCheckoutError', () => {
  const CASES: Array<[number | null, string | null]> = [
    [503, 'Payments are not configured.'],
    [503, null],
    [500, 'Stripe not configured'],
    [401, 'Sign in to upgrade.'],
    [429, 'Too many checkout attempts. Try again later.'],
    [500, 'Internal error'],
    [null, null],
  ];

  it.each(CASES)('never renders infrastructure-speak (status %s)', (status, serverError) => {
    const line = humanizeCheckoutError(status, serverError);
    expect(line).not.toMatch(/configured|stripe|internal|500|503/i);
  });

  it('the keyless state says nothing was charged and offers a door', () => {
    const line = humanizeCheckoutError(503, 'Payments are not configured.');
    expect(line).toMatch(/nothing was charged/i);
    expect(line).toContain('hello@pearloom.com');
  });

  it('classifies the keyless deploy from status or message', () => {
    expect(isPaymentsUnconfigured(503, null)).toBe(true);
    expect(isPaymentsUnconfigured(500, 'Stripe not configured')).toBe(true);
    expect(isPaymentsUnconfigured(500, 'Internal error')).toBe(false);
    expect(isPaymentsUnconfigured(null, null)).toBe(false);
  });

  it('every branch reassures and points forward', () => {
    for (const [status, serverError] of CASES) {
      const line = humanizeCheckoutError(status, serverError);
      // Every sentence carries a next step ("try again", "sign in",
      // or the inbox) — no dead ends on a money surface.
      expect(line).toMatch(/try again|sign in|write to/i);
    }
  });
});
