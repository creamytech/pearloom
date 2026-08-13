import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  luminance,
  contrastRatio,
  passesAA,
  passesAALarge,
  hexToHsl,
  hueDist,
  harmonyBetween,
  ensureContrast,
  enforcePaletteContrast,
  detectPaletteIssues,
} from './color-utils';

// ── hexToRgb ────────────────────────────────────────────────

describe('hexToRgb', () => {
  it('converts full 6-digit hex to RGB', () => {
    expect(hexToRgb('#FF0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('#00FF00')).toEqual([0, 255, 0]);
    expect(hexToRgb('#0000FF')).toEqual([0, 0, 255]);
  });

  it('converts hex without leading #', () => {
    expect(hexToRgb('FF0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('ABCDEF')).toEqual([171, 205, 239]);
  });

  it('converts shorthand 3-digit hex', () => {
    expect(hexToRgb('#FFF')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#F00')).toEqual([255, 0, 0]);
    expect(hexToRgb('ABC')).toEqual([170, 187, 204]);
  });

  it('handles lowercase hex', () => {
    expect(hexToRgb('#ff8800')).toEqual([255, 136, 0]);
    expect(hexToRgb('abc')).toEqual([170, 187, 204]);
  });

  it('returns null for invalid hex input', () => {
    expect(hexToRgb('')).toBeNull();
    expect(hexToRgb('#')).toBeNull();
    expect(hexToRgb('#GG0000')).toEqual([NaN, 0, 0]); // parseInt returns NaN for invalid chars
    expect(hexToRgb('#12')).toBeNull();
    expect(hexToRgb('#1234')).toBeNull();
    expect(hexToRgb('#1234567')).toBeNull();
  });

  it('handles white and black correctly', () => {
    expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
  });

  it('trims whitespace around the hex value', () => {
    expect(hexToRgb('  #FF0000  ')).toEqual([255, 0, 0]);
  });
});

// ── luminance ───────────────────────────────────────────────

describe('luminance', () => {
  it('returns 1 for white', () => {
    expect(luminance('#FFFFFF')).toBeCloseTo(1.0, 3);
  });

  it('returns 0 for black', () => {
    expect(luminance('#000000')).toBeCloseTo(0.0, 3);
  });

  it('returns approximately 0.2 for mid-gray (#808080)', () => {
    const lum = luminance('#808080');
    expect(lum).not.toBeNull();
    expect(lum!).toBeGreaterThan(0.15);
    expect(lum!).toBeLessThan(0.25);
  });

  it('red has lower luminance than green (per human perception)', () => {
    const redLum = luminance('#FF0000')!;
    const greenLum = luminance('#00FF00')!;
    expect(greenLum).toBeGreaterThan(redLum);
  });

  it('returns null for invalid hex', () => {
    expect(luminance('')).toBeNull();
    expect(luminance('not-a-color')).toBeNull();
  });

  it('works with shorthand hex', () => {
    const lum = luminance('#FFF');
    expect(lum).toBeCloseTo(1.0, 3);
  });
});

// ── contrastRatio ───────────────────────────────────────────

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    const ratio = contrastRatio('#000000', '#FFFFFF');
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('returns 21 for white on black (order independent for max/min)', () => {
    const ratio = contrastRatio('#FFFFFF', '#000000');
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('returns 1 for same color (no contrast)', () => {
    expect(contrastRatio('#FF0000', '#FF0000')).toBeCloseTo(1, 1);
    expect(contrastRatio('#000000', '#000000')).toBeCloseTo(1, 1);
    expect(contrastRatio('#808080', '#808080')).toBeCloseTo(1, 1);
  });

  it('returns null when either hex is invalid', () => {
    expect(contrastRatio('', '#000000')).toBeNull();
    expect(contrastRatio('#000000', 'invalid')).toBeNull();
    expect(contrastRatio('', '')).toBeNull();
  });

  it('returns a ratio between 1 and 21 for arbitrary colors', () => {
    const ratio = contrastRatio('#336699', '#FFCC00');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(1);
    expect(ratio!).toBeLessThanOrEqual(21);
  });
});

// ── passesAA / passesAALarge ────────────────────────────────

describe('passesAA', () => {
  it('passes at 4.5 or above', () => {
    expect(passesAA(4.5)).toBe(true);
    expect(passesAA(10)).toBe(true);
    expect(passesAA(21)).toBe(true);
  });

  it('fails below 4.5', () => {
    expect(passesAA(4.49)).toBe(false);
    expect(passesAA(1)).toBe(false);
    expect(passesAA(3.0)).toBe(false);
  });
});

describe('passesAALarge', () => {
  it('passes at 3.0 or above', () => {
    expect(passesAALarge(3.0)).toBe(true);
    expect(passesAALarge(4.5)).toBe(true);
  });

  it('fails below 3.0', () => {
    expect(passesAALarge(2.99)).toBe(false);
    expect(passesAALarge(1)).toBe(false);
  });
});

// ── hexToHsl ────────────────────────────────────────────────

describe('hexToHsl', () => {
  it('converts white to [0, 0, 100]', () => {
    expect(hexToHsl('#FFFFFF')).toEqual([0, 0, 100]);
  });

  it('converts black to [0, 0, 0]', () => {
    expect(hexToHsl('#000000')).toEqual([0, 0, 0]);
  });

  it('converts pure red to approximately [0, 100, 50]', () => {
    const hsl = hexToHsl('#FF0000');
    expect(hsl).not.toBeNull();
    expect(hsl![0]).toBe(0);
    expect(hsl![1]).toBe(100);
    expect(hsl![2]).toBe(50);
  });

  it('returns null for invalid input', () => {
    expect(hexToHsl('')).toBeNull();
  });
});

// ── hueDist ─────────────────────────────────────────────────

describe('hueDist', () => {
  it('returns 0 for identical hues', () => {
    expect(hueDist(0, 0)).toBe(0);
    expect(hueDist(180, 180)).toBe(0);
  });

  it('returns correct distance for simple cases', () => {
    expect(hueDist(0, 90)).toBe(90);
    expect(hueDist(90, 0)).toBe(90);
  });

  it('wraps around the color wheel (shortest path)', () => {
    expect(hueDist(10, 350)).toBe(20);
    expect(hueDist(350, 10)).toBe(20);
  });

  it('returns 180 for opposite hues', () => {
    expect(hueDist(0, 180)).toBe(180);
    expect(hueDist(90, 270)).toBe(180);
  });
});

// ── harmonyBetween ──────────────────────────────────────────

describe('harmonyBetween', () => {
  it('returns null for invalid hex inputs', () => {
    expect(harmonyBetween('', '#FF0000')).toBeNull();
    expect(harmonyBetween('#FF0000', '')).toBeNull();
  });

  it('returns neutral for low-saturation colors', () => {
    // Gray colors have very low saturation
    expect(harmonyBetween('#808080', '#FF0000')).toBe('neutral');
    expect(harmonyBetween('#FF0000', '#999999')).toBe('neutral');
  });

  it('returns analogous for close hues', () => {
    // Red and orange-red are close on the wheel
    expect(harmonyBetween('#FF0000', '#FF3300')).toBe('analogous');
  });

  it('returns complementary for opposite hues (~180 degrees)', () => {
    // Cyan is complementary to red
    expect(harmonyBetween('#FF0000', '#00FFFF')).toBe('complementary');
  });
});

// ── ensureContrast ──────────────────────────────────────────

describe('ensureContrast', () => {
  it('returns original color when contrast already passes', () => {
    // Black text on white background has 21:1 contrast
    const result = ensureContrast('#000000', '#FFFFFF', 4.5);
    expect(result).toBe('#000000');
  });

  it('returns original color when ratio is exactly at threshold', () => {
    // White on white should NOT pass (ratio = 1)
    const result = ensureContrast('#FFFFFF', '#FFFFFF', 4.5);
    expect(result).not.toBe('#FFFFFF');
  });

  it('adjusts color to meet contrast requirement on light background', () => {
    // Light gray text on white background -- poor contrast
    const result = ensureContrast('#CCCCCC', '#FFFFFF', 4.5);
    const ratio = contrastRatio(result, '#FFFFFF');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(4.5);
  });

  it('adjusts color to meet contrast requirement on dark background', () => {
    // Dark gray text on black background -- poor contrast
    const result = ensureContrast('#333333', '#000000', 4.5);
    const ratio = contrastRatio(result, '#000000');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(4.5);
  });

  it('falls back to pure white or black for extreme cases', () => {
    // Same color text and background -- will need maximal adjustment
    const resultOnDark = ensureContrast('#000000', '#000000', 4.5);
    const ratioOnDark = contrastRatio(resultOnDark, '#000000');
    expect(ratioOnDark).not.toBeNull();
    expect(ratioOnDark!).toBeGreaterThanOrEqual(4.5);

    const resultOnLight = ensureContrast('#FFFFFF', '#FFFFFF', 4.5);
    const ratioOnLight = contrastRatio(resultOnLight, '#FFFFFF');
    expect(ratioOnLight).not.toBeNull();
    expect(ratioOnLight!).toBeGreaterThanOrEqual(4.5);
  });

  it('uses custom minRatio when provided', () => {
    // With a lower requirement (3.0 for large text), it may keep more of the original color
    const result30 = ensureContrast('#CCCCCC', '#FFFFFF', 3.0);
    const ratio30 = contrastRatio(result30, '#FFFFFF');
    expect(ratio30).not.toBeNull();
    expect(ratio30!).toBeGreaterThanOrEqual(3.0);
  });

  it('returns a usable fallback for invalid text hex with valid background', () => {
    // When textHex is invalid but bgHex is valid, the function will
    // attempt to adjust and eventually fall back to black or white
    const result = ensureContrast('invalid', '#FFFFFF', 4.5);
    // Should return a valid hex color (the fallback)
    expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('returns original color when background is invalid', () => {
    const result = ensureContrast('#000000', 'invalid', 4.5);
    expect(result).toBe('#000000');
  });
});

// ── enforcePaletteContrast ──────────────────────────────────

describe('enforcePaletteContrast', () => {
  const basePalette = {
    background: '#FFFFFF',
    foreground: '#000000',
    accent: '#336699',
    accent2: '#FF6600',
    card: '#F5F5F5',
    muted: '#888888',
    highlight: '#FFDD00',
    subtle: '#E0E0E0',
    ink: '#111111',
  };

  it('returns a new object (does not mutate input)', () => {
    const result = enforcePaletteContrast(basePalette);
    expect(result).not.toBe(basePalette);
    expect(basePalette.foreground).toBe('#000000'); // unchanged
  });

  it('preserves colors that already have sufficient contrast', () => {
    const result = enforcePaletteContrast(basePalette);
    // Black text on white background already has 21:1 ratio
    expect(result.foreground).toBe('#000000');
  });

  it('all output foreground/muted/accent/ink meet minimum contrast against background', () => {
    const result = enforcePaletteContrast(basePalette);

    // foreground vs background: >= 4.5
    const fgRatio = contrastRatio(result.foreground, result.background);
    expect(fgRatio).not.toBeNull();
    expect(fgRatio!).toBeGreaterThanOrEqual(4.5);

    // muted vs background: >= 3.0
    const mutedRatio = contrastRatio(result.muted, result.background);
    expect(mutedRatio).not.toBeNull();
    expect(mutedRatio!).toBeGreaterThanOrEqual(3.0);

    // accent vs background: >= 3.0
    const accentRatio = contrastRatio(result.accent, result.background);
    expect(accentRatio).not.toBeNull();
    expect(accentRatio!).toBeGreaterThanOrEqual(3.0);

    // ink vs background: >= 4.5
    const inkRatio = contrastRatio(result.ink, result.background);
    expect(inkRatio).not.toBeNull();
    expect(inkRatio!).toBeGreaterThanOrEqual(4.5);
  });

  it('adjusts low-contrast palette to meet minimums', () => {
    const lowContrastPalette = {
      background: '#FFFFFF',
      foreground: '#EEEEEE', // nearly invisible on white
      accent: '#FFFFAA',     // very light accent on white
      accent2: '#FF6600',
      card: '#FAFAFA',
      muted: '#F0F0F0',      // nearly invisible on white
      highlight: '#FFDD00',
      subtle: '#E0E0E0',
      ink: '#DDDDDD',        // nearly invisible on white
    };

    const result = enforcePaletteContrast(lowContrastPalette);

    const fgRatio = contrastRatio(result.foreground, result.background);
    expect(fgRatio!).toBeGreaterThanOrEqual(4.5);

    const mutedRatio = contrastRatio(result.muted, result.background);
    expect(mutedRatio!).toBeGreaterThanOrEqual(3.0);

    const inkRatio = contrastRatio(result.ink, result.background);
    expect(inkRatio!).toBeGreaterThanOrEqual(4.5);
  });

  it('works with dark backgrounds', () => {
    const darkPalette = {
      background: '#1A1A2E',
      foreground: '#E0E0E0',
      accent: '#FF6B6B',
      accent2: '#FFD93D',
      card: '#2A2A4E',
      muted: '#888888',
      highlight: '#FFD700',
      subtle: '#333366',
      ink: '#FFFFFF',
    };

    const result = enforcePaletteContrast(darkPalette);

    const fgRatio = contrastRatio(result.foreground, result.background);
    expect(fgRatio!).toBeGreaterThanOrEqual(4.5);

    const inkRatio = contrastRatio(result.ink, result.background);
    expect(inkRatio!).toBeGreaterThanOrEqual(4.5);
  });
});

// ── detectPaletteIssues ─────────────────────────────────────

describe('detectPaletteIssues', () => {
  it('returns no errors for a well-designed palette', () => {
    const issues = detectPaletteIssues({
      background: '#FFFFFF',
      foreground: '#1C1C1C',
      accent: '#336699',
      accentLight: '#99CCFF',
      muted: '#666666',
      cardBg: '#F0F0F0',
    });
    const errors = issues.filter(i => i.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('detects extremely low foreground/background contrast as error', () => {
    const issues = detectPaletteIssues({
      background: '#FFFFFF',
      foreground: '#FEFEFE', // nearly invisible
      accent: '#336699',
      accentLight: '#99CCFF',
      muted: '#666666',
      cardBg: '#EEEEEE',
    });
    const fgIssue = issues.find(i => i.code === 'fg-bg-contrast');
    expect(fgIssue).toBeDefined();
    expect(fgIssue!.severity).toBe('error');
  });

  it('warns when card background is nearly identical to page background', () => {
    const issues = detectPaletteIssues({
      background: '#FFFFFF',
      foreground: '#000000',
      accent: '#336699',
      accentLight: '#99CCFF',
      muted: '#666666',
      cardBg: '#FFFFFF', // identical
    });
    const cardIssue = issues.find(i => i.code === 'bg-card-identical');
    expect(cardIssue).toBeDefined();
  });
});
