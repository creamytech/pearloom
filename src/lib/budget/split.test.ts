import { describe, it, expect } from 'vitest';
import {
  computeShares,
  computeBalances,
  settleUp,
  settleExpenses,
  type SplitInput,
  type ExpenseWithShares,
} from './split';

const sum = (r: Record<string, number>) => Object.values(r).reduce((s, v) => s + v, 0);

describe('computeShares', () => {
  it('splits evenly with no remainder', () => {
    const r = computeShares({ amountCents: 3000, payerId: 'a', mode: 'even', participantIds: ['a', 'b', 'c'] });
    expect(r).toEqual({ a: 1000, b: 1000, c: 1000 });
    expect(sum(r)).toBe(3000);
  });

  it('lands the rounding remainder on the payer', () => {
    const r = computeShares({ amountCents: 1000, payerId: 'a', mode: 'even', participantIds: ['a', 'b', 'c'] });
    // 1000/3 = 333 each (999), the extra cent goes to payer a
    expect(r).toEqual({ a: 334, b: 333, c: 333 });
    expect(sum(r)).toBe(1000);
  });

  it('exclude mode splits only among the included', () => {
    const r = computeShares({
      amountCents: 3000, payerId: 'a', mode: 'exclude',
      participantIds: ['a', 'b', 'c', 'd'], excluded: ['d'],
    });
    expect(r).toEqual({ a: 1000, b: 1000, c: 1000 });
    expect(r.d).toBeUndefined();
    expect(sum(r)).toBe(3000);
  });

  it('shares mode weights the split (payer double)', () => {
    const r = computeShares({
      amountCents: 10000, payerId: 'a', mode: 'shares',
      participantIds: ['a', 'b', 'c'], weights: { a: 2, b: 1, c: 1 },
    });
    expect(r).toEqual({ a: 5000, b: 2500, c: 2500 });
    expect(sum(r)).toBe(10000);
  });

  it('shares mode reconciles weighted rounding onto the payer', () => {
    const r = computeShares({
      amountCents: 1000, payerId: 'a', mode: 'shares',
      participantIds: ['a', 'b', 'c'], weights: { a: 1, b: 1, c: 1 },
    });
    expect(sum(r)).toBe(1000);
    expect(r.a).toBe(334); // remainder cent on payer
  });

  it('custom mode uses explicit cents and reconciles a shortfall onto the payer', () => {
    const exact = computeShares({
      amountCents: 5000, payerId: 'a', mode: 'custom',
      participantIds: ['a', 'b', 'c'], customShares: { a: 1000, b: 2000, c: 2000 },
    });
    expect(exact).toEqual({ a: 1000, b: 2000, c: 2000 });

    // payer not among the custom shares → a doesn't share; the 1000
    // shortfall reconciles onto the first sharer (b).
    const short = computeShares({
      amountCents: 5000, payerId: 'a', mode: 'custom',
      participantIds: ['a', 'b', 'c'], customShares: { b: 2000, c: 2000 },
    });
    expect(sum(short)).toBe(5000);
    expect(short.a).toBeUndefined();
    expect(short.b).toBe(3000);
  });

  it('bears the whole cost on the payer when there are no sharers', () => {
    const r = computeShares({
      amountCents: 4200, payerId: 'a', mode: 'exclude',
      participantIds: ['a', 'b'], excluded: ['a', 'b'],
    });
    expect(r).toEqual({ a: 4200 });
  });

  it('handles a zero-amount expense', () => {
    const r = computeShares({ amountCents: 0, payerId: 'a', mode: 'even', participantIds: ['a', 'b'] });
    expect(sum(r)).toBe(0);
  });
});

describe('computeBalances', () => {
  it('nets paid minus owed and sums to zero', () => {
    const expenses: ExpenseWithShares[] = [
      { payerId: 'a', amountCents: 3000, shares: { a: 1000, b: 1000, c: 1000 } },
      { payerId: 'b', amountCents: 3000, shares: { a: 1000, b: 1000, c: 1000 } },
    ];
    const net = computeBalances(expenses);
    expect(net).toEqual({ a: 1000, b: 1000, c: -2000 });
    expect(sum(net)).toBe(0);
  });
});

describe('settleUp', () => {
  it('minimizes transfers and is deterministic', () => {
    const t = settleUp({ a: 1000, b: 1000, c: -2000 });
    // c owes 2000 total → two transfers (to a, to b), sorted by id
    expect(t).toEqual([
      { fromId: 'c', toId: 'a', amountCents: 1000 },
      { fromId: 'c', toId: 'b', amountCents: 1000 },
    ]);
  });

  it('returns nothing when everyone is square', () => {
    expect(settleUp({ a: 0, b: 0 })).toEqual([]);
  });

  it('every debtor pays exactly their debt and every creditor is made whole', () => {
    const net = { a: 5000, b: -1200, c: -3800, d: 0 };
    const transfers = settleUp(net);
    // reconstruct net movement from transfers
    const moved: Record<string, number> = {};
    for (const t of transfers) {
      moved[t.fromId] = (moved[t.fromId] ?? 0) - t.amountCents;
      moved[t.toId] = (moved[t.toId] ?? 0) + t.amountCents;
    }
    expect(moved.a).toBe(5000);
    expect(moved.b).toBe(-1200);
    expect(moved.c).toBe(-3800);
    expect(moved.d ?? 0).toBe(0);
  });
});

describe('settleExpenses (end to end)', () => {
  it('a bachelor-trip weekend settles exactly', () => {
    // Ana books the villa; Ben buys dinner; everyone shares evenly.
    const people = ['ana', 'ben', 'cy', 'dee'];
    const villa = computeShares({ amountCents: 80000, payerId: 'ana', mode: 'even', participantIds: people });
    const dinner = computeShares({ amountCents: 24000, payerId: 'ben', mode: 'even', participantIds: people });
    const expenses: ExpenseWithShares[] = [
      { payerId: 'ana', amountCents: 80000, shares: villa },
      { payerId: 'ben', amountCents: 24000, shares: dinner },
    ];
    const net = computeBalances(expenses);
    expect(sum(net)).toBe(0);
    const transfers = settleExpenses(expenses);
    // total moved equals total owed by debtors
    const totalMoved = transfers.reduce((s, t) => s + t.amountCents, 0);
    const totalOwed = Object.values(net).filter((v) => v < 0).reduce((s, v) => s - v, 0);
    expect(totalMoved).toBe(totalOwed);
    // ana (paid the most) is a net creditor, never a debtor
    expect(transfers.every((t) => t.fromId !== 'ana')).toBe(true);
  });
});
