import { describe, it, expect } from 'vitest';
import { budgetCategoriesFor } from './budget-categories';

describe('budgetCategoriesFor', () => {
  it('gives trip categories to the group-split occasions', () => {
    for (const occ of ['bachelor-party', 'bachelorette-party', 'reunion']) {
      const cats = budgetCategoriesFor(occ);
      expect(cats).toContain('Lodging');
      expect(cats).toContain('Activities');
      expect(cats).not.toContain('Officiant');
    }
  });

  it('gives wedding categories to wedding + vow-renewal', () => {
    for (const occ of ['wedding', 'vow-renewal']) {
      const cats = budgetCategoriesFor(occ);
      expect(cats).toContain('Venue');
      expect(cats).toContain('Attire');
      expect(cats).toContain('Flowers');
    }
  });

  it('gives memorial categories to commemoration occasions', () => {
    const cats = budgetCategoriesFor('memorial');
    expect(cats).toContain('Program & printing');
    expect(cats).not.toContain('Cake');
  });

  it('gives ceremony categories to cultural occasions', () => {
    const cats = budgetCategoriesFor('quinceanera');
    expect(cats).toContain('Officiant');
  });

  it('gives party categories to milestone/family occasions', () => {
    const cats = budgetCategoriesFor('first-birthday');
    expect(cats).toContain('Cake');
    expect(cats).toContain('Entertainment');
  });

  it('falls back to a generic set for unknown / null occasions', () => {
    for (const occ of [null, undefined, 'not-a-real-occasion']) {
      const cats = budgetCategoriesFor(occ as string | null);
      expect(cats.length).toBeGreaterThan(0);
      expect(cats).toContain('Other');
    }
  });

  it('returns a fresh array each call (callers may mutate)', () => {
    const a = budgetCategoriesFor('wedding');
    a.push('Mutated');
    const b = budgetCategoriesFor('wedding');
    expect(b).not.toContain('Mutated');
  });
});
