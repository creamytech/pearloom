import { describe, expect, it } from 'vitest';
import { resolveSiteNames, usableNamesPair } from './site-names';

describe('usableNamesPair', () => {
  it('accepts a real pair', () => {
    expect(usableNamesPair(['Shauna', 'Scott'])).toEqual(['Shauna', 'Scott']);
  });

  it('accepts a solo-honoree pair (one empty side)', () => {
    expect(usableNamesPair(['Linda', ''])).toEqual(['Linda', '']);
    expect(usableNamesPair(['', 'Marcus'])).toEqual(['', 'Marcus']);
  });

  it('trims whitespace', () => {
    expect(usableNamesPair(['  Shauna ', ' Scott '])).toEqual(['Shauna', 'Scott']);
  });

  it('rejects the wiped-to-empty pair', () => {
    expect(usableNamesPair(['', ''])).toBeNull();
    expect(usableNamesPair(['  ', ' '])).toBeNull();
  });

  it('rejects missing / malformed values', () => {
    expect(usableNamesPair(undefined)).toBeNull();
    expect(usableNamesPair(null)).toBeNull();
    expect(usableNamesPair('Shauna & Scott')).toBeNull();
    expect(usableNamesPair(['Shauna'])).toBeNull();
    expect(usableNamesPair([1, 2])).toBeNull();
  });
});

describe('resolveSiteNames', () => {
  it('prefers config names when they carry a name', () => {
    expect(resolveSiteNames(['Jack', 'Hannah'], ['Old', 'Pair'])).toEqual(['Jack', 'Hannah']);
  });

  it('heals a wiped config pair from the manifest', () => {
    // The Studio-autosave wipe: config carries ['',''], the
    // manifest still knows who the celebration is for.
    expect(resolveSiteNames(['', ''], ['Shaun', 'Scott'])).toEqual(['Shaun', 'Scott']);
    expect(resolveSiteNames(undefined, ['Shaun', 'Scott'])).toEqual(['Shaun', 'Scott']);
  });

  it('returns the empty pair when neither source has names', () => {
    expect(resolveSiteNames(['', ''], undefined)).toEqual(['', '']);
    expect(resolveSiteNames(null, null)).toEqual(['', '']);
  });
});
