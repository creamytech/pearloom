// look-recipes — the wizard's three-looks contract.
import { describe, expect, it } from 'vitest';
import { lookRecipesFor } from './look-recipes';
import { lookDefaultsFor } from '@/lib/event-os/event-types';

describe('lookRecipesFor', () => {
  it('always returns three looks with distinct kits', () => {
    for (const occ of ['wedding', 'memorial', 'bachelorette-party', 'reunion', 'baby-shower', undefined]) {
      const recipes = lookRecipesFor(occ);
      expect(recipes).toHaveLength(3);
      expect(new Set(recipes.map((r) => r.kitId)).size).toBe(3);
    }
  });

  it("recipe[0] is Pear's match — identical to the generation defaults", () => {
    const [match] = lookRecipesFor('wedding');
    const defaults = lookDefaultsFor('wedding');
    expect(match.id).toBe('match');
    expect(match.kitId).toBe(defaults.kitId);
    expect(match.density).toBe(defaults.density);
    expect(match.textureIntensity).toBe(defaults.textureIntensity);
  });

  it('solemn occasions never offer scrapbook or ticket', () => {
    for (const occ of ['memorial', 'funeral']) {
      for (const r of lookRecipesFor(occ)) {
        expect(['scrapbook', 'ticket']).not.toContain(r.kitId);
      }
    }
  });
});
