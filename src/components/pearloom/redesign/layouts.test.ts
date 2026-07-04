import { describe, it, expect } from 'vitest';
import { DEFAULT_VARIANT, LAYOUTS, readVariant, recommendedVariantFor } from './layouts';

describe('LAYOUTS registry', () => {
  it("every section's default variant id exists in its registry", () => {
    for (const [section, def] of Object.entries(DEFAULT_VARIANT)) {
      const variants = LAYOUTS[section as keyof typeof LAYOUTS];
      expect(variants, section).toBeTruthy();
      expect(variants!.map((v) => v.id), section).toContain(def);
    }
  });

  it("the map registry no longer offers 'static' (cut 2026-07-02 — it was a live iframe with clicks off)", () => {
    expect(LAYOUTS.map!.map((v) => v.id)).not.toContain('static');
  });

  it("manifests still carrying layouts.map='static' keep resolving (renderer falls through to embed)", () => {
    /* readVariant returns the stored pick verbatim; MapBlock has no
       'static' branch any more, so this id lands on the default
       embed path. The contract pinned here is just "no crash + a
       string comes back". */
    expect(readVariant({ layouts: { map: 'static' } }, 'map')).toBe('static');
    expect(readVariant({}, 'map')).toBe('embed');
  });
});

describe('recommendedVariantFor — occasion-sharpened layout defaults', () => {
  it('signature variants (unchanged) still resolve', () => {
    expect(recommendedVariantFor('hero', 'memorial')).toBe('crest');
    expect(recommendedVariantFor('gallery', 'wedding')).toBe('frames');
    expect(recommendedVariantFor('menu', 'rehearsal-dinner')).toBe('bill-of-fare');
    expect(recommendedVariantFor('dressCode', 'quinceanera')).toBe('wardrobe');
    expect(recommendedVariantFor('obituary', 'funeral')).toBe('card');
    expect(recommendedVariantFor('nameVote', 'gender-reveal')).toBe('tiles');
  });

  it('story reads as a letter for the couple register, a timeline for a life remembered', () => {
    expect(recommendedVariantFor('story', 'anniversary')).toBe('letter');
    expect(recommendedVariantFor('story', 'vow-renewal')).toBe('letter');
    expect(recommendedVariantFor('story', 'memorial')).toBe('timeline');
    expect(recommendedVariantFor('story', 'retirement')).toBe('timeline');
    expect(recommendedVariantFor('story', 'graduation')).toBe('timeline');
    // Wedding keeps the plain default (no recommendation).
    expect(recommendedVariantFor('story', 'wedding')).toBeUndefined();
  });

  it('schedule reads as a timeline for reunions + solemn orders of the day', () => {
    expect(recommendedVariantFor('schedule', 'reunion')).toBe('timeline');
    expect(recommendedVariantFor('schedule', 'memorial')).toBe('timeline');
    expect(recommendedVariantFor('schedule', 'funeral')).toBe('timeline');
    expect(recommendedVariantFor('schedule', 'wedding')).toBeUndefined();
  });

  it('itinerary reads as the thread for the trip occasions', () => {
    expect(recommendedVariantFor('itinerary', 'bachelor-party')).toBe('flow');
    expect(recommendedVariantFor('itinerary', 'bachelorette-party')).toBe('flow');
    expect(recommendedVariantFor('itinerary', 'reunion')).toBeUndefined();
  });

  it('travel leads with the map where guests are scattered', () => {
    expect(recommendedVariantFor('travel', 'reunion')).toBe('map');
    expect(recommendedVariantFor('travel', 'welcome-party')).toBe('map');
    expect(recommendedVariantFor('travel', 'wedding')).toBeUndefined();
  });

  it('every recommended variant id exists in its section registry', () => {
    const occasions = [
      'wedding', 'memorial', 'funeral', 'anniversary', 'vow-renewal',
      'retirement', 'graduation', 'milestone-birthday', 'reunion',
      'welcome-party', 'bachelor-party', 'bachelorette-party',
      'gender-reveal', 'quinceanera', 'rehearsal-dinner',
    ] as const;
    for (const section of Object.keys(LAYOUTS) as Array<keyof typeof LAYOUTS>) {
      const ids = (LAYOUTS[section] ?? []).map((v) => v.id);
      for (const occ of occasions) {
        const rec = recommendedVariantFor(section as never, occ);
        if (rec) expect(ids, `${section}/${occ}`).toContain(rec);
      }
    }
  });

  it('returns undefined without an occasion', () => {
    expect(recommendedVariantFor('story', undefined)).toBeUndefined();
  });
});
