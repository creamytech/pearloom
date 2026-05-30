// ─────────────────────────────────────────────────────────────
// Site Editions — resolver + registry tests.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { EDITIONS, EDITIONS_BY_ID, DEFAULT_EDITION_ID } from './editions';
import { resolveEdition, recommendEdition, editionById } from './resolve';
import type { EditionId } from './types';

describe('Site Editions', () => {
  describe('EDITIONS registry', () => {
    it('ships exactly 5 editions', () => {
      expect(EDITIONS).toHaveLength(5);
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
