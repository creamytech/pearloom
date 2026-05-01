import { describe, it, expect } from 'vitest';
import { WAVE_PATHS, CORNER_STYLES, extractSvgFromField, isValidSvg, buildFallbackArt } from './svg-library';

describe('WAVE_PATHS', () => {
  it('has entries for all 8 curve types', () => {
    const curves = ['organic', 'arch', 'geometric', 'wave', 'petal', 'cascade', 'ribbon', 'mountain'] as const;
    for (const curve of curves) {
      expect(WAVE_PATHS[curve]).toBeDefined();
      expect(WAVE_PATHS[curve].d).toMatch(/^M/);
      expect(WAVE_PATHS[curve].di).toMatch(/^M/);
    }
  });
});

describe('CORNER_STYLES', () => {
  it('has entries for all 8 curve types', () => {
    const curves = ['organic', 'arch', 'geometric', 'wave', 'petal', 'cascade', 'ribbon', 'mountain'] as const;
    for (const curve of curves) {
      expect(CORNER_STYLES[curve]).toBeDefined();
    }
  });
});

describe('extractSvgFromField', () => {
  it('extracts SVG from a string containing SVG markup', () => {
    const input = 'some text <svg viewBox="0 0 100 100"><circle r="5"/></svg> trailing';
    expect(extractSvgFromField(input)).toBe('<svg viewBox="0 0 100 100"><circle r="5"/></svg>');
  });

  it('returns null for empty or non-SVG strings', () => {
    expect(extractSvgFromField('')).toBeNull();
    expect(extractSvgFromField('no svg here')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(extractSvgFromField(null as unknown as string)).toBeNull();
    expect(extractSvgFromField(undefined as unknown as string)).toBeNull();
  });
});

describe('isValidSvg', () => {
  it('returns true for valid SVG strings', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="50"/></svg>';
    expect(isValidSvg(svg)).toBe(true);
  });

  it('returns false for short strings', () => {
    expect(isValidSvg('<svg></svg>')).toBe(false);
  });

  it('returns false for strings without svg tags', () => {
    expect(isValidSvg('this is just a regular long string that is over 80 characters but has no svg tags anywhere in it')).toBe(false);
  });
});

describe('buildFallbackArt', () => {
  it('generates all required SVG art pieces', () => {
    const art = buildFallbackArt('#5C6B3F', 'organic');
    expect(art.heroPatternSvg).toContain('<svg');
    expect(art.sectionBorderSvg).toContain('<svg');
    expect(art.cornerFlourishSvg).toContain('<svg');
    expect(art.medallionSvg).toContain('<svg');
    expect(art.heroBlobSvg).toContain('<svg');
    expect(art.accentBlobSvg).toContain('<svg');
    expect(art.sectionBlobPath).toMatch(/^M/);
  });

  it('uses the provided accent color in SVG output', () => {
    const art = buildFallbackArt('#FF6B6B', 'wave');
    expect(art.heroPatternSvg).toContain('#FF6B6B');
    expect(art.heroBlobSvg).toContain('#FF6B6B');
  });

  it('falls back to default color when accent is empty', () => {
    const art = buildFallbackArt('', 'organic');
    expect(art.heroPatternSvg).toContain('#5C6B3F');
  });

  it('generates different patterns for different curve types', () => {
    const organic = buildFallbackArt('#000', 'organic');
    const geometric = buildFallbackArt('#000', 'geometric');
    expect(organic.heroPatternSvg).not.toBe(geometric.heroPatternSvg);
    expect(organic.sectionBlobPath).not.toBe(geometric.sectionBlobPath);
  });
});
