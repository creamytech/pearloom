import { describe, expect, it } from 'vitest';
import { isFullCrop, FULL_CROP, FILTER_PRESETS } from './photo-filters';

describe('isFullCrop', () => {
  it('treats null / undefined as full', () => {
    expect(isFullCrop(null)).toBe(true);
    expect(isFullCrop(undefined)).toBe(true);
    expect(isFullCrop(FULL_CROP)).toBe(true);
  });
  it('treats a near-full rect as full (tolerance)', () => {
    expect(isFullCrop({ x: 0, y: 0, w: 1, h: 1 })).toBe(true);
    expect(isFullCrop({ x: 0.00005, y: 0, w: 0.99995, h: 1 })).toBe(true);
  });
  it('treats a real crop as not full', () => {
    expect(isFullCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })).toBe(false);
    expect(isFullCrop({ x: 0, y: 0, w: 1, h: 0.5 })).toBe(false);
  });
});

describe('FILTER_PRESETS', () => {
  it('leads with Original (empty filter) and has unique ids', () => {
    expect(FILTER_PRESETS[0]).toMatchObject({ id: 'none', filter: '' });
    expect(new Set(FILTER_PRESETS.map((p) => p.id)).size).toBe(FILTER_PRESETS.length);
  });
});
