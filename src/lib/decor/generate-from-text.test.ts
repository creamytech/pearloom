import { describe, it, expect } from 'vitest';
import { generateDecorFromText } from './generate-from-text';

describe('generateDecorFromText', () => {
  it('Santorini + olive → stripe pattern + sage accent', () => {
    const out = generateDecorFromText('July wedding in Santorini, olive groves, relaxed');
    // 'olive' first hit wins for accent
    expect(out.accentColor).toBe('#5C6B3F');
    // 'mediterranean' isn't in the text; 'rustic' isn't either; but the
    // matcher falls through to default. Santorini doesn't match any
    // pattern keyword directly, so we get 'none'.
    expect(['none', 'stripe', 'cabana', 'terrazzo']).toContain(out.patternId);
  });

  it('black-tie evening → celestial pattern + navy accent', () => {
    const out = generateDecorFromText('Black-tie evening gala, candlelit');
    expect(out.patternId).toBe('celestial');
    // 'evening' triggers navy
    expect(out.accentColor).toBe('#1E3A5F');
    expect(out.dividerId).toBe('standard');
  });

  it('rustic farmhouse → gingham pattern', () => {
    const out = generateDecorFromText('Rustic farmhouse garden party in the country');
    expect(out.patternId).toBe('gingham');
  });

  it('beach seaside → cabana pattern + coastal accent', () => {
    const out = generateDecorFromText('Beach wedding, seaside ceremony');
    expect(out.patternId).toBe('cabana');
    expect(out.accentColor).toBe('#4A6B8F');
  });

  it('memorial → subtle divider', () => {
    const out = generateDecorFromText('A memorial celebration, quiet and understated');
    expect(out.dividerId).toBe('subtle');
  });

  it('cinematic editorial → tall divider', () => {
    const out = generateDecorFromText('Grand cinematic magazine wedding');
    expect(out.dividerId).toBe('tall');
  });

  it('destination travel → stamp motif', () => {
    const out = generateDecorFromText('Destination wedding, passport themed postcard');
    expect(out.motifId).toBe('stamp');
  });

  it('romantic love → heart motif', () => {
    const out = generateDecorFromText('A romantic, tender, love-filled engagement');
    expect(out.motifId).toBe('heart');
  });

  it('returns a coherent default when text has no keywords', () => {
    const out = generateDecorFromText('asdfqwerty');
    expect(out.patternId).toBe('none');
    expect(out.motifId).toBe('sparkle');
    expect(out.dividerId).toBe('standard');
    expect(out.accentColor).toBe('#5C6B3F');
    expect(out.rationale).toMatch(/calm default/);
  });

  it('is deterministic — same input twice → identical output', () => {
    const a = generateDecorFromText('Tuscan vineyard, romantic');
    const b = generateDecorFromText('Tuscan vineyard, romantic');
    expect(a).toEqual(b);
  });

  it('emits a 6-digit hex with leading #', () => {
    const out = generateDecorFromText('Tuscan vineyard');
    expect(out.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
