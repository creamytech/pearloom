// ─────────────────────────────────────────────────────────────
// Pearloom / lib/print-engine/pricing.test.ts
//
// Pins the founder-approved retail prices (2026-06-09) and the
// legacy-credit math. If a refactor changes any of these numbers,
// this test is the tripwire — pricing changes must be deliberate.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  RETAIL_PRINT_PRICES,
  LEGACY_PRINT_CREDIT_CENTS,
  retailPrintUnitCents,
  retailPrintPriceCents,
  creditRemainingFromUsed,
} from './pricing';

describe('retail print prices (founder-approved 2026-06-09)', () => {
  it('pins the per-card cents table', () => {
    expect(RETAIL_PRINT_PRICES.postcard['4x6']).toBe(179);
    expect(RETAIL_PRINT_PRICES.postcard['6x9']).toBe(279);
    expect(RETAIL_PRINT_PRICES.postcard['6x11']).toBe(329);
    expect(RETAIL_PRINT_PRICES.letter).toBe(299);
    expect(LEGACY_PRINT_CREDIT_CENTS).toBe(5000);
  });

  it('letters price as letters regardless of size', () => {
    expect(retailPrintUnitCents('letter')).toBe(299);
    expect(retailPrintUnitCents('letter', '6x11')).toBe(299);
  });

  it('non-letter products ride the postcard rail by size', () => {
    expect(retailPrintUnitCents('postcard', '4x6')).toBe(179);
    expect(retailPrintUnitCents('postcard', '6x9')).toBe(279);
    expect(retailPrintUnitCents('thankyou', '4x6')).toBe(179);
    expect(retailPrintUnitCents('book', '6x11')).toBe(329);
  });

  it('totals multiply per-card by count', () => {
    expect(retailPrintPriceCents('postcard', '4x6', 50)).toBe(8950);
    expect(retailPrintPriceCents('letter', '4x6', 10)).toBe(2990);
    expect(retailPrintPriceCents('postcard', '6x11', 3)).toBe(987);
  });

  it('garbage counts collapse to zero, never negative money', () => {
    expect(retailPrintPriceCents('postcard', '4x6', 0)).toBe(0);
    expect(retailPrintPriceCents('postcard', '4x6', -5)).toBe(0);
    expect(retailPrintPriceCents('postcard', '4x6', NaN)).toBe(0);
    expect(retailPrintPriceCents('postcard', '4x6', 2.9)).toBe(358); // floors fractional counts
  });
});

describe('legacy credit math', () => {
  it('full credit when nothing is used', () => {
    expect(creditRemainingFromUsed(0)).toBe(5000);
  });

  it('partial usage subtracts', () => {
    expect(creditRemainingFromUsed(1790)).toBe(3210);
  });

  it('over-usage floors at zero (never negative credit)', () => {
    expect(creditRemainingFromUsed(5000)).toBe(0);
    expect(creditRemainingFromUsed(99999)).toBe(0);
  });

  it('garbage input is treated as zero used', () => {
    expect(creditRemainingFromUsed(NaN)).toBe(5000);
    expect(creditRemainingFromUsed(-100)).toBe(5000);
  });
});
