import { describe, it, expect } from 'vitest';
import { deriveFallback } from './fallback';

describe('deriveFallback', () => {
  it('returns a valid VibeSkin with default fields', () => {
    const skin = deriveFallback('romantic garden wedding');
    expect(skin.aiGenerated).toBe(false);
    expect(skin.curve).toBeDefined();
    expect(skin.particle).toBeDefined();
    expect(skin.palette.background).toMatch(/^#/);
    expect(skin.palette.foreground).toMatch(/^#/);
    expect(skin.palette.accent).toMatch(/^#/);
    expect(skin.fonts.heading).toBeTruthy();
    expect(skin.fonts.body).toBeTruthy();
    expect(skin.wavePath).toBeTruthy();
    expect(skin.wavePathInverted).toBeTruthy();
  });

  it('matches garden keyword to petal curve', () => {
    const skin = deriveFallback('garden');
    expect(skin.curve).toBe('petal');
    expect(skin.particle).toBe('petals');
  });

  it('matches celestial keyword to arch curve', () => {
    const skin = deriveFallback('celestial');
    expect(skin.curve).toBe('arch');
    expect(skin.particle).toBe('stars');
  });

  it('matches beach keyword to ribbon curve with bubbles', () => {
    const skin = deriveFallback('beach');
    expect(skin.curve).toBe('ribbon');
    expect(skin.particle).toBe('bubbles');
  });

  it('uses organic curve as default for unrecognized vibe', () => {
    const skin = deriveFallback('xyzzy completely unknown vibe');
    expect(skin.curve).toBe('organic');
  });

  it('produces different palettes for different vibe strings', () => {
    const a = deriveFallback('romantic sunset');
    const b = deriveFallback('winter wonderland');
    // Different vibes should seed different palette picks
    expect(a.palette.background).not.toBe(b.palette.background);
  });

  it('produces deterministic results for the same input', () => {
    const a = deriveFallback('garden party');
    const b = deriveFallback('garden party');
    expect(a).toEqual(b);
  });

  it('generates fallback SVG art', () => {
    const skin = deriveFallback('elegant wedding');
    expect(skin.heroPatternSvg).toContain('<svg');
    expect(skin.sectionBorderSvg).toContain('<svg');
    expect(skin.cornerFlourishSvg).toContain('<svg');
    expect(skin.medallionSvg).toContain('<svg');
    expect(skin.heroBlobSvg).toContain('<svg');
    expect(skin.accentBlobSvg).toContain('<svg');
    expect(skin.sectionBlobPath).toMatch(/^M/);
  });

  it('includes section labels', () => {
    const skin = deriveFallback('any vibe');
    expect(skin.sectionLabels.story).toBeTruthy();
    expect(skin.sectionLabels.events).toBeTruthy();
    expect(skin.sectionLabels.rsvp).toBeTruthy();
  });
});
