// The suite-card formatter's contract (A.3 — L55/L99): humane dates,
// no dangling joiners, and a real contrast floor for card ink.

import { describe, expect, it } from 'vitest';
import { humaneDateLabel, suiteDateVenueLine, suiteCardInk } from '@/lib/suite-card';
import { contrastRatio } from '@/lib/color-utils';

describe('humaneDateLabel', () => {
  it('formats ISO the way the site hero does — never raw ISO on a designed card', () => {
    expect(humaneDateLabel('2026-08-15')).toBe('Saturday, August 15, 2026');
    expect(humaneDateLabel('2027-06-12')).toBe('Saturday, June 12, 2027');
  });

  it("keeps the host's own words when they didn't type a date", () => {
    expect(humaneDateLabel('Midsummer weekend')).toBe('Midsummer weekend');
    expect(humaneDateLabel('')).toBe('');
    expect(humaneDateLabel(null)).toBe('');
  });
});

describe('suiteDateVenueLine', () => {
  it('joins two real values with the interpunct', () => {
    expect(suiteDateVenueLine('2026-08-15', 'Ashwood Hall')).toBe(
      'Saturday, August 15, 2026 · Ashwood Hall',
    );
  });

  it('never dangles the joiner (the L71 class)', () => {
    expect(suiteDateVenueLine('2026-08-15', '')).toBe('Saturday, August 15, 2026');
    expect(suiteDateVenueLine(null, 'Ashwood Hall')).toBe('Ashwood Hall');
    expect(suiteDateVenueLine(null, null)).toBe('');
    expect(suiteDateVenueLine('2026-08-15', '  ')).not.toContain('·');
  });
});

describe('suiteCardInk — the contrast floor (L55)', () => {
  it('dark ink on light card, light ink on dark card, both AA-large at least', () => {
    for (const bg of ['#F5EFE2', '#FBF7EE', '#6D7D3F', '#0D0B07', '#3D4A1F']) {
      const fam = suiteCardInk(bg);
      const ratio = contrastRatio(fam.ink, bg);
      expect(ratio).not.toBeNull();
      // The measured failure was 2.12:1 for 30px names (needs 3:1)
      // and 1.72:1 for small text. The family must clear AA for
      // normal text on every background it claims to serve.
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the olive card that measured 2.12:1 now floors properly', () => {
    // Pressed Garden's card color from the audit (rgb(109,125,63)).
    const fam = suiteCardInk('#6D7D3F');
    expect(contrastRatio(fam.ink, '#6D7D3F')!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(fam.inkSoft, '#6D7D3F')!).toBeGreaterThanOrEqual(3);
  });
});
