// ─────────────────────────────────────────────────────────────
// Site Editions — resolver + registry tests.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { EDITIONS, EDITIONS_BY_ID, DEFAULT_EDITION_ID } from './editions';
import { resolveEdition, recommendEdition, editionById } from './resolve';
import type { EditionId } from './types';
import { LAYOUTS, type SectionKey } from '@/lib/site-layouts/registry';

/** Every section that takes a layout variant. The layoutDefaults
 *  map must cover all of these on every Edition so there are no
 *  silent gaps where the picker falls through to the prototype
 *  default. Mirrors the SectionKey union exactly. */
const ALL_SECTIONS: SectionKey[] = [
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

describe('Site Editions', () => {
  describe('EDITIONS registry', () => {
    it('ships exactly 6 editions', () => {
      // 5 originals (almanac, cinema, postcard-box, linen-folder, quiet)
      // + coastal added in a later port. Updating this count is the
      // signal we've intentionally added an Edition vs accidentally
      // dropped one.
      expect(EDITIONS).toHaveLength(6);
    });

    it('every edition id is unique', () => {
      const ids = EDITIONS.map((ed) => ed.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every edition has a non-empty label, tagline, description', () => {
      for (const ed of EDITIONS) {
        expect(ed.label.length).toBeGreaterThan(2);
        expect(ed.tagline.length).toBeGreaterThan(8);
        expect(ed.description.length).toBeGreaterThan(40);
      }
    });

    it('every edition declares a hero variant id', () => {
      for (const ed of EDITIONS) {
        expect(ed.heroVariantId).toBeTruthy();
      }
    });

    it('every edition has a non-empty block order', () => {
      for (const ed of EDITIONS) {
        expect(ed.blockOrder.length).toBeGreaterThan(0);
      }
    });

    it('EDITIONS_BY_ID maps every edition by id', () => {
      for (const ed of EDITIONS) {
        expect(EDITIONS_BY_ID[ed.id]).toBe(ed);
      }
    });

    it('DEFAULT_EDITION_ID maps to a real edition', () => {
      expect(EDITIONS_BY_ID[DEFAULT_EDITION_ID]).toBeTruthy();
    });

    /* layoutDefaults is the read-time fallback the renderer reads
       when the host hasn't set an explicit per-section variant.
       Every Edition must cover all 9 sections so the picker never
       silently falls through to the prototype default — that would
       defeat the whole point of an Edition being "one click = a
       finished editorial object". */
    it('every edition declares a layoutDefaults entry for all 9 sections', () => {
      for (const ed of EDITIONS) {
        expect(ed.layoutDefaults, `${ed.id} is missing layoutDefaults`).toBeTruthy();
        for (const section of ALL_SECTIONS) {
          const value = ed.layoutDefaults?.[section];
          expect(
            value,
            `${ed.id} is missing layoutDefaults.${section}`,
          ).toBeTruthy();
          expect(
            typeof value,
            `${ed.id}.layoutDefaults.${section} should be a string`,
          ).toBe('string');
        }
      }
    });

    /* Every variant id an Edition prescribes must be a real variant
       registered for that section — typos would silently fall back
       to the section default and the Edition's personality would
       disappear. */
    it('every layoutDefaults variant id is registered in LAYOUTS', () => {
      for (const ed of EDITIONS) {
        for (const section of ALL_SECTIONS) {
          const variantId = ed.layoutDefaults?.[section];
          if (!variantId) continue;
          const exists = LAYOUTS[section].some((v) => v.id === variantId);
          expect(
            exists,
            `${ed.id}.layoutDefaults.${section} = "${variantId}" is not registered in LAYOUTS.${section}`,
          ).toBe(true);
        }
      }
    });

    /* SiteLayoutPicker badges the matching tile "★ Recommended"
       based on recommendedLayout, so every Edition needs a value.
       Locks in the mapping defined in src/lib/site-editions/editions.ts. */
    it('every edition declares a recommendedLayout matching the prototype', () => {
      const expected: Record<string, 'stacked' | 'boxed' | 'split'> = {
        almanac: 'boxed',          // bound book → card on a mat
        cinema: 'stacked',         // letterboxed photo → full scroll
        'postcard-box': 'stacked', // tilted polaroids → scatter down
        'linen-folder': 'split',   // hotel-stationery → sidebar lockup
        quiet: 'stacked',          // whitespace + restraint → no frame
        coastal: 'boxed',          // deckled postcard → card on a mat
      };
      for (const ed of EDITIONS) {
        expect(ed.recommendedLayout).toBe(expected[ed.id]);
      }
    });
  });

  describe('recommendEdition()', () => {
    it('returns quiet for memorial occasions', () => {
      expect(recommendEdition('memorial', 'solemn')).toBe('quiet');
      expect(recommendEdition('funeral', 'solemn')).toBe('quiet');
    });

    it('returns postcard-box for bachelor/ette + reunion', () => {
      expect(recommendEdition('bachelor-party', 'playful')).toBe('postcard-box');
      expect(recommendEdition('reunion', 'playful')).toBe('postcard-box');
    });

    it('returns linen-folder for formal cultural events', () => {
      expect(recommendEdition('rehearsal-dinner', 'ceremonial')).toBe('linen-folder');
      expect(recommendEdition('bar-mitzvah', 'ceremonial')).toBe('linen-folder');
    });

    it('returns almanac for wedding (and anniversary)', () => {
      expect(recommendEdition('wedding', 'celebratory')).toBe('almanac');
      expect(recommendEdition('anniversary', 'celebratory')).toBe('almanac');
    });

    it('falls back to voice when occasion has no Edition match', () => {
      // 'story' isn't in any recommendedFor list — should pick by voice
      expect(recommendEdition('story', 'solemn')).toBe('quiet');
      expect(recommendEdition('story', 'ceremonial')).toBe('linen-folder');
      expect(recommendEdition('story', 'playful')).toBe('postcard-box');
      expect(recommendEdition('story', 'intimate')).toBe('quiet');
    });

    it('falls back to DEFAULT_EDITION_ID when nothing matches', () => {
      expect(recommendEdition(undefined, undefined)).toBe(DEFAULT_EDITION_ID);
      expect(recommendEdition('story', 'celebratory')).toBe(DEFAULT_EDITION_ID);
    });
  });

  describe('resolveEdition()', () => {
    it('honors explicit edition over recommendation', () => {
      const ed = resolveEdition({ edition: 'cinema', occasion: 'memorial', voice: 'solemn' });
      expect(ed.id).toBe('cinema');
    });

    it('ignores unknown edition ids and falls back to recommendation', () => {
      const ed = resolveEdition({
        edition: 'unknown-edition' as EditionId,
        occasion: 'memorial',
        voice: 'solemn',
      });
      expect(ed.id).toBe('quiet');
    });

    it('uses recommendation when edition is unset', () => {
      const ed = resolveEdition({ occasion: 'wedding', voice: 'celebratory' });
      expect(ed.id).toBe('almanac');
    });

    it('never returns null/undefined — always a real EditionDefinition', () => {
      const ed = resolveEdition({});
      expect(ed).toBeTruthy();
      expect(ed.id).toBeTruthy();
    });
  });

  describe('editionById()', () => {
    it('returns the matching edition', () => {
      expect(editionById('quiet').id).toBe('quiet');
      expect(editionById('cinema').id).toBe('cinema');
    });

    it('falls back to DEFAULT_EDITION_ID on null/undefined/unknown', () => {
      expect(editionById(null).id).toBe(DEFAULT_EDITION_ID);
      expect(editionById(undefined).id).toBe(DEFAULT_EDITION_ID);
      expect(editionById('not-an-edition' as EditionId).id).toBe(DEFAULT_EDITION_ID);
    });
  });
});
