import { describe, expect, it } from 'vitest';
import { applyWizardLook, themeVarsFromPalette } from './wizard-look';
import type { StoryManifest } from '@/types';

const m = (extra: Record<string, unknown> = {}) => extra as unknown as StoryManifest;

describe('themeVarsFromPalette', () => {
  it('derives roles by the colors themselves, not array position', () => {
    // olive-gold preset leads with a DARK color — position-trusting
    // code would ship olive paper. Roles must come from luminance.
    const vars = themeVarsFromPalette(['#6d7d3f', '#D4A95D', '#F3E9D4', '#3D4A1F'])!;
    expect(vars).toBeTruthy();
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
    };
    expect(lum(vars['--t-paper'])).toBeGreaterThan(190); // paper reads as paper
    expect(lum(vars['--t-ink'])).toBeLessThan(100);      // ink reads as ink
    expect(vars['--t-accent']).toBeTruthy();
    expect(vars['--t-rsvp-ink']).toBe(vars['--t-paper']);
  });

  it('clamps a saturated-mid "paper" toward white', () => {
    const vars = themeVarsFromPalette(['#8B9C5A', '#3D4A1F'])!; // no light color picked
    const n = parseInt(vars['--t-paper'].slice(1), 16);
    const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
    expect(lum).toBeGreaterThan(190);
  });

  it('rejects junk', () => {
    expect(themeVarsFromPalette([])).toBeNull();
    expect(themeVarsFromPalette(['nope'])).toBeNull();
    expect(themeVarsFromPalette(['#FFFFFF'])).toBeNull();
  });
});

describe('applyWizardLook', () => {
  it('stamps themeVars + themeId from the picked palette', () => {
    const out = applyWizardLook(m(), {
      selectedPaletteColors: ['#F0C9A8', '#8B9C5A', '#CBD29E', '#3D4A1F'],
      occasion: 'wedding',
      layoutFormat: 'magazine',
    }) as unknown as Record<string, unknown>;
    expect(out.themeVars).toBeTruthy();
    expect(out.themeId).toBe('garden');
    expect((out.themeVars as Record<string, string>)['--t-accent']).toBeTruthy();
  });

  it('never clobbers an existing theme (templates / host edits win)', () => {
    const out = applyWizardLook(
      m({ themeVars: { '--t-paper': '#111111' }, themeId: 'santorini-linen', texture: 'linen' }),
      { selectedPaletteColors: ['#F0C9A8', '#8B9C5A', '#CBD29E', '#3D4A1F'], occasion: 'wedding' },
    ) as unknown as Record<string, unknown>;
    expect((out.themeVars as Record<string, string>)['--t-paper']).toBe('#111111');
    expect(out.themeId).toBe('santorini-linen');
    expect(out.texture).toBe('linen');
  });

  it('maps the wizard layout to section variants without overriding explicit picks', () => {
    const out = applyWizardLook(
      m({ layouts: { hero: 'postcard' } }),
      { layoutFormat: 'magazine' },
    ) as unknown as { layouts: Record<string, string> };
    expect(out.layouts.hero).toBe('postcard');   // explicit pick survives
    expect(out.layouts.story).toBe('letter');     // wizard layout fills the rest
    expect(out.layouts.faq).toBe('twocol');
  });

  it('stamps the occasion-recommended texture', () => {
    const out = applyWizardLook(m(), { occasion: 'wedding' }) as unknown as Record<string, unknown>;
    expect(typeof out.texture).toBe('string'); // wedding → linen per registry
  });
});

describe('occasion look defaults', () => {
  it('stamps kit + density + textureIntensity from the registry', () => {
    const out = applyWizardLook(m(), { occasion: 'bachelor-party' }) as unknown as Record<string, unknown>;
    expect(typeof out.kitId).toBe('string');
    expect(typeof out.density).toBe('string');
    expect(typeof out.textureIntensity).toBe('number');
  });
  it('never overrides explicit kit picks', () => {
    const out = applyWizardLook(m({ kitId: 'plate' }), { occasion: 'bachelor-party' }) as unknown as Record<string, unknown>;
    expect(out.kitId).toBe('plate');
  });
});

describe('legacy-contract rescue (hydrate path)', () => {
  it('derives a full --t-* bag from old theme.colors values', () => {
    // Mirrors hydrate-manifest's pick order for pre-fix sites.
    const vars = themeVarsFromPalette(['#F5EFE2', '#5C6B3F', '#E0DDC9', '#0E0D0B']);
    expect(vars).toBeTruthy();
    expect(vars!['--t-accent']).toBeTruthy();
    expect(vars!['--t-paper']).not.toBe(vars!['--t-ink']);
  });
});
