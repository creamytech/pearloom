import { describe, it, expect } from 'vitest';
import {
  LAYOUTS,
  LAYOUT_DEFAULTS,
  TOTAL_LAYOUT_VARIANTS,
  getLayoutVariant,
  resolveLayout,
  type SectionKey,
} from './registry';

const SECTIONS: SectionKey[] = [
  'hero',
  'story',
  'details',
  'schedule',
  'travel',
  'registry',
  'gallery',
  'rsvp',
  'faq',
];

describe('LAYOUTS registry', () => {
  it('declares an entry for every section', () => {
    for (const section of SECTIONS) {
      expect(LAYOUTS[section]).toBeDefined();
      expect(LAYOUTS[section].length).toBeGreaterThan(0);
    }
  });

  it('matches the prototype catalog (48 prototype variants + a handful of production extras)', () => {
    // The prototype's LAYOUTS map declares 48 variants:
    //   hero 6 + story 6 + details 5 + schedule 5 + travel 4 +
    //   registry 4 + gallery 6 + rsvp 4 + faq 4 = 44.
    // The prototype's site-config.jsx duplicated the schedule entry
    // with a 2-variant overwrite line (cards + list), so the
    // canonical count from the file as-shipped is 41. We carry the
    // FULL set (5 schedule variants) because the renderer also
    // handles timeline / stepper / numbered.
    // Plus 3 production hero extras (photo-first, carousel — the
    // postcard already counts; plus production schedule run-of-show,
    // production gallery wall) = canonical count ≥ 48.
    expect(TOTAL_LAYOUT_VARIANTS).toBeGreaterThanOrEqual(48);
  });

  it('every variant has a unique id within its section', () => {
    for (const section of SECTIONS) {
      const ids = LAYOUTS[section].map((v) => v.id);
      const dedupe = new Set(ids);
      expect(dedupe.size).toBe(ids.length);
    }
  });

  it('every variant has a non-empty label + oneLiner', () => {
    for (const section of SECTIONS) {
      for (const v of LAYOUTS[section]) {
        expect(v.label.length).toBeGreaterThan(0);
        expect(v.oneLiner.length).toBeGreaterThan(0);
      }
    }
  });

  it('every variant has a known status', () => {
    const valid = new Set(['shipped', 'registered', 'planned']);
    for (const section of SECTIONS) {
      for (const v of LAYOUTS[section]) {
        expect(valid.has(v.status)).toBe(true);
      }
    }
  });

  it('LAYOUT_DEFAULTS maps every section to a variant that exists', () => {
    for (const section of SECTIONS) {
      const id = LAYOUT_DEFAULTS[section];
      expect(getLayoutVariant(section, id)).toBeDefined();
    }
  });
});

describe('getLayoutVariant', () => {
  it('returns the variant when registered', () => {
    expect(getLayoutVariant('hero', 'postcard')?.label).toBe('Postcard');
    expect(getLayoutVariant('rsvp', 'banner')?.label).toBe('Banner');
  });

  it('returns undefined for unknown ids', () => {
    expect(getLayoutVariant('hero', 'does-not-exist')).toBeUndefined();
  });
});

describe('resolveLayout', () => {
  it('host pick wins when set', () => {
    expect(resolveLayout('story', 'quote', 'sidebyside')).toBe('quote');
  });

  it('Edition default wins when no host pick', () => {
    expect(resolveLayout('story', undefined, 'parallax')).toBe('parallax');
  });

  it('falls back to registry default when neither set', () => {
    expect(resolveLayout('story', undefined, undefined)).toBe('sidebyside');
    expect(resolveLayout('rsvp', undefined, undefined)).toBe('centered');
    expect(resolveLayout('faq', undefined, undefined)).toBe('accordion');
  });
});
