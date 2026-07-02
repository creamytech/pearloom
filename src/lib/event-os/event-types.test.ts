// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/event-types.test.ts
// Light sanity checks on the EVENT_TYPES registry.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  EVENT_TYPES,
  getEventType,
  getEventTypesByCategory,
  getShippingEventTypes,
  getAllOccasionIds,
  getAllowedBlocksFor,
  getHiddenBlocksFor,
  lookDefaultsFor,
} from './event-types';

describe('EVENT_TYPES registry', () => {
  it('has no duplicate ids', () => {
    const ids = EVENT_TYPES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ids are URL-safe (lowercase, hyphen-separated, no spaces)', () => {
    for (const e of EVENT_TYPES) {
      expect(e.id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('every entry has non-empty label, tagline, hostRole', () => {
    for (const e of EVENT_TYPES) {
      expect(e.label.length).toBeGreaterThan(0);
      expect(e.tagline.length).toBeGreaterThan(0);
      expect(e.hostRole.length).toBeGreaterThan(0);
    }
  });

  it('defaultBlocks includes the universal set', () => {
    for (const e of EVENT_TYPES) {
      expect(e.defaultBlocks).toContain('hero');
      expect(e.defaultBlocks).toContain('event');
      expect(e.defaultBlocks).toContain('photos');
      expect(e.defaultBlocks).toContain('footer');
    }
  });

  it('defaultBlocks and hiddenBlocks never overlap', () => {
    for (const e of EVENT_TYPES) {
      const hidden = new Set(e.hiddenBlocks);
      for (const b of e.defaultBlocks) {
        expect(hidden.has(b)).toBe(false);
      }
    }
  });

  it('optionalBlocks and hiddenBlocks never overlap', () => {
    for (const e of EVENT_TYPES) {
      const hidden = new Set(e.hiddenBlocks);
      for (const b of e.optionalBlocks) {
        expect(hidden.has(b)).toBe(false);
      }
    }
  });

  it('defaultBlocks and optionalBlocks never overlap', () => {
    for (const e of EVENT_TYPES) {
      const def = new Set(e.defaultBlocks);
      for (const b of e.optionalBlocks) {
        expect(def.has(b)).toBe(false);
      }
    }
  });

  it('templateIds are non-empty', () => {
    for (const e of EVENT_TYPES) {
      expect(e.templateIds.length).toBeGreaterThan(0);
    }
  });

  it('honor-list occasions can mount weddingParty (court of honor / candle lighters)', () => {
    for (const id of ['quinceanera', 'bar-mitzvah', 'bat-mitzvah'] as const) {
      expect(getAllowedBlocksFor(id)).toContain('weddingParty');
      expect(getHiddenBlocksFor(id)).not.toContain('weddingParty');
    }
  });

  it('each currently-shipping occasion is in the registry', () => {
    const shippingIds = new Set(
      ['wedding', 'anniversary', 'engagement', 'birthday', 'story'],
    );
    for (const id of shippingIds) {
      const entry = getEventType(id);
      expect(entry).not.toBeNull();
      expect(entry?.status).toBe('shipping');
    }
  });
});

describe('EVENT_TYPES helpers', () => {
  it('getEventType returns null for unknown ids', () => {
    expect(getEventType('not-a-real-event')).toBeNull();
  });

  it('getEventTypesByCategory groups correctly', () => {
    const weddingArc = getEventTypesByCategory('wedding-arc');
    expect(weddingArc.length).toBeGreaterThan(0);
    for (const e of weddingArc) {
      expect(e.category).toBe('wedding-arc');
    }
  });

  it('getShippingEventTypes returns at least the 5 current ones', () => {
    expect(getShippingEventTypes().length).toBeGreaterThanOrEqual(5);
  });

  it('getAllOccasionIds covers every entry', () => {
    expect(getAllOccasionIds().length).toBe(EVENT_TYPES.length);
  });

  it('getAllowedBlocksFor returns union of default + optional', () => {
    const wedding = getEventType('wedding');
    const allowed = getAllowedBlocksFor('wedding');
    expect(allowed.length).toBe(
      (wedding!.defaultBlocks.length) + (wedding!.optionalBlocks.length),
    );
  });

  it('getHiddenBlocksFor matches the entry', () => {
    const wedding = getEventType('wedding');
    expect(getHiddenBlocksFor('wedding')).toEqual(wedding!.hiddenBlocks);
  });
});

describe('lookDefaultsFor — per-event Look Engine defaults', () => {
  it('memorial → spacious + 0.6 intensity + index kit', () => {
    expect(lookDefaultsFor('memorial')).toEqual({
      density: 'spacious',
      textureIntensity: 0.6,
      kitId: 'index',
    });
  });

  it('funeral → same somber defaults as memorial', () => {
    expect(lookDefaultsFor('funeral')).toEqual(lookDefaultsFor('memorial'));
  });

  it('bachelor-party → cozy + 1.3 + scrapbook kit', () => {
    expect(lookDefaultsFor('bachelor-party')).toEqual({
      density: 'cozy',
      textureIntensity: 1.3,
      kitId: 'scrapbook',
    });
  });

  it('bachelorette-party → same playful defaults as bachelor', () => {
    expect(lookDefaultsFor('bachelorette-party')).toEqual(lookDefaultsFor('bachelor-party'));
  });

  it('bridal-shower → comfortable + 0.8 + minimal kit (intimate voice)', () => {
    expect(lookDefaultsFor('bridal-shower')).toEqual({
      density: 'comfortable',
      textureIntensity: 0.8,
      kitId: 'minimal',
    });
  });

  it('wedding → spacious + 1.0 + plate kit (ceremonial voice)', () => {
    expect(lookDefaultsFor('wedding')).toEqual({
      density: 'spacious',
      textureIntensity: 1.0,
      kitId: 'plate',
    });
  });

  it('engagement → comfortable + 1.0 + classic kit (celebratory default)', () => {
    expect(lookDefaultsFor('engagement')).toEqual({
      density: 'comfortable',
      textureIntensity: 1.0,
      kitId: 'classic',
    });
  });

  it('anniversary → intimate-voice defaults (comfortable + 0.8 + minimal)', () => {
    expect(lookDefaultsFor('anniversary')).toEqual({
      density: 'comfortable',
      textureIntensity: 0.8,
      kitId: 'minimal',
    });
  });

  it('unknown occasion falls back to celebratory defaults', () => {
    expect(lookDefaultsFor('not-a-real-event')).toEqual({
      density: 'comfortable',
      textureIntensity: 1.0,
      kitId: 'classic',
    });
  });

  it('null / undefined inputs fall back gracefully', () => {
    expect(lookDefaultsFor(null).kitId).toBe('classic');
    expect(lookDefaultsFor(undefined).kitId).toBe('classic');
  });
});
