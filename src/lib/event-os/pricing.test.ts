import { describe, it, expect } from 'vitest';
import { pearloomFeeCents, applicationFeeFor } from './pricing';

describe('pearloomFeeCents', () => {
  it('returns null for missing totals', () => {
    expect(pearloomFeeCents(null)).toBeNull();
    expect(pearloomFeeCents(undefined)).toBeNull();
    expect(pearloomFeeCents(0)).toBeNull();
  });

  it('returns null for non-finite values', () => {
    expect(pearloomFeeCents(NaN)).toBeNull();
    expect(pearloomFeeCents(Infinity)).toBeNull();
  });

  it('returns 8% rounded', () => {
    expect(pearloomFeeCents(10_000)).toBe(800);   // $100 → $8
    expect(pearloomFeeCents(500_000)).toBe(40_000); // $5,000 → $400
  });

  it('rounds the half-cent correctly', () => {
    // 1,000,050 * 0.08 = 80,004 (exactly)
    expect(pearloomFeeCents(1_000_050)).toBe(80_004);
  });
});

describe('applicationFeeFor', () => {
  it('returns 0 when deposit is below one cent', () => {
    expect(applicationFeeFor(0, 500)).toBe(0);
    expect(applicationFeeFor(-5, 500)).toBe(0);
  });

  it('uses the provided fee when set and within bounds', () => {
    expect(applicationFeeFor(10_000, 800)).toBe(800);
  });

  it('caps the fee at (deposit - 1) when the configured fee exceeds deposit', () => {
    // An inquiry with a big total but a small deposit shouldn\'t wipe out the vendor
    expect(applicationFeeFor(100, 800)).toBe(99);
  });

  it('falls back to 8% of deposit when fee is null', () => {
    expect(applicationFeeFor(10_000, null)).toBe(800);
  });

  it('never returns a negative number', () => {
    expect(applicationFeeFor(1, 50)).toBe(0);
  });
});
