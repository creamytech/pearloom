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
