import { describe, it, expect } from 'vitest';
import {
  relativeLuminance,
  contrastRatio,
  rateContrast,
  reportContrast,
  suggestTweak,
  formatRatio,
  ratingLabel,
} from './wcag-contrast';

describe('relativeLuminance', () => {
  it('returns 1 for white', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 3);
  });
  it('returns 0 for black', () => {
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 3);
  });
  it('green is brighter than red per the WCAG weighting', () => {
    expect(relativeLuminance([0, 255, 0])).toBeGreaterThan(
      relativeLuminance([255, 0, 0]),
    );
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black/white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });
  it('is order-independent', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toEqual(
      contrastRatio('#FFFFFF', '#000000'),
    );
  });
  it('returns null when either hex is unparseable', () => {
    expect(contrastRatio('', '#fff')).toBeNull();
    expect(contrastRatio('#fff', 'not-a-hex')).toBeNull();
  });
});

describe('rateContrast', () => {
  it('buckets ratios correctly', () => {
    expect(rateContrast(21)).toBe('aaa');
    expect(rateContrast(7)).toBe('aaa');
    expect(rateContrast(6.99)).toBe('aa');
    expect(rateContrast(4.5)).toBe('aa');
    expect(rateContrast(4.49)).toBe('aa-large');
    expect(rateContrast(3)).toBe('aa-large');
    expect(rateContrast(2.99)).toBe('fail');
    expect(rateContrast(1)).toBe('fail');
  });
});

describe('reportContrast', () => {
  it('flags an AAA pair as passing', () => {
    const r = reportContrast('#FFFFFF', '#000000');
    expect(r.rating).toBe('aaa');
    expect(r.passesAA).toBe(true);
  });
  it('flags a failing pair as failing', () => {
    const r = reportContrast('#FBF7EE', '#DDD2BC');
    expect(r.rating).toBe('fail');
    expect(r.passesAA).toBe(false);
  });
  it('flags AA-large (≥3) as not passing body-text AA', () => {
    // Engineered to land in 3.0–4.5 range
    const r = reportContrast('#FFFFFF', '#777777');
    expect(r.rating).toBe('aa-large');
    expect(r.passesAA).toBe(false);
  });
});

describe('suggestTweak', () => {
  it('returns null when the pair already passes AA', () => {
    expect(suggestTweak('#FFFFFF', '#000000')).toBeNull();
  });

  it('darkens the foreground on a light background that fails', () => {
    const t = suggestTweak('#F5EFE2', '#A8A095');
    expect(t).not.toBeNull();
    expect(t!.target).toBe('foreground');
    expect(t!.label).toMatch(/darker/);
    expect(t!.ratio).toBeGreaterThan(
      contrastRatio('#F5EFE2', '#A8A095')!,
    );
  });

  it('lightens the foreground on a dark background that fails', () => {
    const t = suggestTweak('#1A1A2E', '#3A3A55');
    expect(t).not.toBeNull();
    expect(t!.target).toBe('foreground');
    expect(t!.label).toMatch(/lighter/);
    expect(t!.ratio).toBeGreaterThan(
      contrastRatio('#1A1A2E', '#3A3A55')!,
    );
  });

  it('nudges the background when the foreground is already at the floor', () => {
    // Pure black ink on a slightly-too-dark paper — can't get
    // darker, so the suggestion should lift the paper instead.
    const t = suggestTweak('#3A3A3A', '#000000');
    expect(t).not.toBeNull();
    expect(t!.target).toBe('background');
    expect(t!.label).toMatch(/paper/);
  });
});

describe('formatRatio', () => {
  it('shows one decimal under 10', () => {
    expect(formatRatio(4.567)).toBe('4.6:1');
    expect(formatRatio(3)).toBe('3.0:1');
  });
  it('rounds to whole at 10+', () => {
    expect(formatRatio(12.7)).toBe('13:1');
    expect(formatRatio(21)).toBe('21:1');
  });
});

describe('ratingLabel', () => {
  it('maps each rating to its display label', () => {
    expect(ratingLabel('aaa')).toBe('AAA');
    expect(ratingLabel('aa')).toBe('AA');
    expect(ratingLabel('aa-large')).toBe('AA large');
    expect(ratingLabel('fail')).toBe('FAIL');
  });
});

// ── Brand token contrast guardrails (Pillar 16 a11y fix) ──────────
// Pins the actual --pl-* hex values so a future palette edit can't
// silently reintroduce the gold-on-cream text failure the audit flagged.
describe('brand gold-text contrast tokens', () => {
  // Light surfaces
  const CREAM = '#FDFAF0'; //       --pl-cream
  const CREAM_DEEP = '#F7F0E0'; //  --pl-cream-deep (alternating sections)
  const CREAM_CARD = '#FBF7EE'; //  --pl-cream-card
  const GOLD = '#C19A4B'; //        --pl-gold (decorative only)
  const GOLD_TEXT = '#836829'; //   --pl-gold-text (NEW — for text)
  const OLIVE = '#5C6B3F'; //       --pl-olive (focus outlines)
  // Dark surfaces
  const MIDNIGHT = '#0D0B07'; //    --pl-dark-bg
  const GOLD_DARK = '#D4B373'; //   --pl-gold / --pl-gold-text (dark)

  it('documents that decorative --pl-gold fails as text on cream (the defect)', () => {
    const r = contrastRatio(GOLD, CREAM)!;
    expect(r).toBeLessThan(3); // ~2.52:1 — decorative hairline use only
  });

  it('--pl-gold-text passes body-text AA (>=4.5) on every cream surface', () => {
    for (const bg of [CREAM, CREAM_DEEP, CREAM_CARD]) {
      const r = contrastRatio(GOLD_TEXT, bg)!;
      expect(r).toBeGreaterThanOrEqual(4.5);
      expect(rateContrast(r)).toMatch(/^aa/); // 'aa' or 'aaa'
    }
  });

  it('--pl-olive clears the 3:1 non-text minimum for focus outlines on cream', () => {
    expect(contrastRatio(OLIVE, CREAM)!).toBeGreaterThanOrEqual(3);
  });

  it('dark-mode gold text already passes AA on midnight (no darkening needed)', () => {
    expect(contrastRatio(GOLD_DARK, MIDNIGHT)!).toBeGreaterThanOrEqual(4.5);
  });
});
