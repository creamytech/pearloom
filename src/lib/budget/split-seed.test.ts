// ─────────────────────────────────────────────────────────────
// Pearloom / lib/budget/split-seed.test.ts
//
// seedFromBachelorCosts is the pure, fill-only mapping from the legacy
// Weekend-planner cost list (manifest.bachelor.costs[]) into a seedable
// split. Pins: distinct payers → participants; free-form dollar strings
// → integer cents; unnamed payers stay null; costs with no amount are
// dropped (never fabricated); odd input degrades to an empty seed.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { seedFromBachelorCosts } from './split-seed';

describe('seedFromBachelorCosts', () => {
  it('maps a flat cost list to expenses + distinct payer participants', () => {
    const seed = seedFromBachelorCosts({
      bachelor: {
        costs: [
          { id: 'c1', label: 'House rental', amount: '480', paidBy: 'Ana' },
          { id: 'c2', label: 'Sunday brunch + tip', amount: '$52', paidBy: 'Bo' },
          { id: 'c3', label: 'Boat', amount: '200', paidBy: 'Ana' },
        ],
      },
    });

    expect(seed.expenses).toHaveLength(3);
    expect(seed.expenses[0]).toEqual({
      description: 'House rental',
      amountCents: 48000,
      payerDisplayName: 'Ana',
      mode: 'even',
    });
    expect(seed.expenses[1].amountCents).toBe(5200);

    // Payers deduped, in first-seen order.
    expect(seed.participants).toEqual([{ displayName: 'Ana' }, { displayName: 'Bo' }]);
  });

  it('parses cents in dollar strings ($68.57 → 6857) and handles numeric amounts', () => {
    const seed = seedFromBachelorCosts({
      bachelor: { costs: [
        { label: 'Dinner', amount: '$68.57', paidBy: 'Cy' },
        { label: 'Cab', amount: 24, paidBy: 'Cy' },
      ] },
    });
    expect(seed.expenses[0].amountCents).toBe(6857);
    expect(seed.expenses[1].amountCents).toBe(2400);
  });

  it('drops costs with no parseable amount — never fabricates one', () => {
    const seed = seedFromBachelorCosts({
      bachelor: { costs: [
        { label: 'TBD', paidBy: 'Ana' },
        { label: 'Empty', amount: '', paidBy: 'Ana' },
        { label: 'Junk', amount: 'free', paidBy: 'Ana' },
        { label: 'Zero', amount: '0', paidBy: 'Ana' },
        { label: 'Real', amount: '30', paidBy: 'Ana' },
      ] },
    });
    expect(seed.expenses).toHaveLength(1);
    expect(seed.expenses[0].description).toBe('Real');
    expect(seed.participants).toEqual([{ displayName: 'Ana' }]);
  });

  it('keeps an amount with an unnamed payer as a null-payer expense (no participant invented)', () => {
    const seed = seedFromBachelorCosts({
      bachelor: { costs: [{ label: 'Shared van', amount: '90' }] },
    });
    expect(seed.expenses).toHaveLength(1);
    expect(seed.expenses[0].payerDisplayName).toBeNull();
    expect(seed.participants).toEqual([]);
  });

  it('falls back to a generic description when the label is missing', () => {
    const seed = seedFromBachelorCosts({ bachelor: { costs: [{ amount: '12', paidBy: 'Bo' }] } });
    expect(seed.expenses[0].description).toBe('Shared cost');
  });

  it('returns an empty seed for absent/odd input', () => {
    expect(seedFromBachelorCosts(undefined)).toEqual({ participants: [], expenses: [] });
    expect(seedFromBachelorCosts(null)).toEqual({ participants: [], expenses: [] });
    expect(seedFromBachelorCosts({})).toEqual({ participants: [], expenses: [] });
    expect(seedFromBachelorCosts({ bachelor: {} })).toEqual({ participants: [], expenses: [] });
    expect(seedFromBachelorCosts({ bachelor: { costs: 'nope' } })).toEqual({ participants: [], expenses: [] });
  });
});
