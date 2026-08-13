import { describe, it, expect } from 'vitest';
import {
  rollupBudget,
  toManifestProjection,
  vendorToBudgetLine,
  type BudgetLine,
} from './lines';

function line(partial: Partial<BudgetLine>): BudgetLine {
  return {
    id: partial.id ?? 'l1',
    siteId: partial.siteId ?? 'site-1',
    category: partial.category ?? 'Venue',
    kind: partial.kind ?? 'expense',
    ...partial,
  };
}

describe('rollupBudget', () => {
  it('sums planned/committed/paid across expense lines only', () => {
    const r = rollupBudget([
      line({ category: 'Venue', plannedCents: 500000, committedCents: 480000, paidCents: 240000 }),
      line({ category: 'Catering', plannedCents: 300000, committedCents: 300000, paidCents: 0 }),
    ]);
    expect(r.plannedCents).toBe(800000);
    expect(r.committedCents).toBe(780000);
    expect(r.paidCents).toBe(240000);
    expect(r.incomeCents).toBe(0);
  });

  it('tracks income separately, never netted against expenses', () => {
    const r = rollupBudget([
      line({ category: 'Venue', kind: 'expense', plannedCents: 100000, committedCents: 100000, paidCents: 100000 }),
      line({ category: 'Gifts', kind: 'income', paidCents: 25000 }),
    ]);
    expect(r.paidCents).toBe(100000); // expense paid unaffected by income
    expect(r.incomeCents).toBe(25000);
  });

  it('income falls back to committed then planned when unpaid', () => {
    expect(rollupBudget([line({ kind: 'income', committedCents: 4000 })]).incomeCents).toBe(4000);
    expect(rollupBudget([line({ kind: 'income', plannedCents: 3000 })]).incomeCents).toBe(3000);
  });

  it('flags over-budget when committed exceeds planned', () => {
    expect(rollupBudget([line({ plannedCents: 100, committedCents: 150 })]).overBudget).toBe(true);
    expect(rollupBudget([line({ plannedCents: 200, committedCents: 150 })]).overBudget).toBe(false);
  });

  it('remainingCents = committed − paid, never negative', () => {
    expect(rollupBudget([line({ committedCents: 500, paidCents: 200 })]).remainingCents).toBe(300);
    // over-paid (refund pending) never goes below zero
    expect(rollupBudget([line({ committedCents: 200, paidCents: 500 })]).remainingCents).toBe(0);
  });

  it('groups by category and tolerates null cents', () => {
    const r = rollupBudget([
      line({ category: 'Venue', plannedCents: 1000, committedCents: null, paidCents: null }),
      line({ category: 'Venue', plannedCents: 500, committedCents: 500, paidCents: 250 }),
      line({ category: '', plannedCents: 100 }), // empty → 'Other'
    ]);
    expect(r.byCategory.Venue).toEqual({ plannedCents: 1500, committedCents: 500, paidCents: 250 });
    expect(r.byCategory.Other.plannedCents).toBe(100);
    expect(r.plannedCents).toBe(1600);
  });
});

describe('toManifestProjection', () => {
  it('projects expense lines to dollars: used=paid, cap=committed||planned', () => {
    const proj = toManifestProjection([
      line({ label: 'Villa', category: 'Lodging', committedCents: 480000, paidCents: 240000, sortIndex: 1 }),
      line({ label: null, category: 'Catering', plannedCents: 300000, committedCents: null, sortIndex: 0 }),
    ]);
    // sorted by sortIndex → Catering (0) first
    expect(proj[0]).toEqual({ cat: 'Catering', used: 0, cap: 3000 });
    expect(proj[1]).toEqual({ cat: 'Villa', used: 2400, cap: 4800 });
  });

  it('omits income lines from the cockpit projection', () => {
    const proj = toManifestProjection([
      line({ category: 'Venue', kind: 'expense', committedCents: 1000 }),
      line({ category: 'Gifts', kind: 'income', paidCents: 5000 }),
    ]);
    expect(proj).toHaveLength(1);
    expect(proj[0].cat).toBe('Venue');
  });
});

describe('vendorToBudgetLine', () => {
  it('links to the vendor and computes paid from deposit/balance flags', () => {
    const l = vendorToBudgetLine({
      id: 'v-1',
      name: 'Rosewood Catering',
      category: 'Catering',
      costCents: 500000,
      depositCents: 100000,
      depositPaid: true,
      balancePaid: false,
    });
    expect(l.sourceKind).toBe('vendor');
    expect(l.sourceId).toBe('v-1');
    expect(l.committedCents).toBe(500000);
    expect(l.paidCents).toBe(100000); // deposit paid, balance not
    expect(l.label).toBe('Rosewood Catering');
    expect(l.category).toBe('Catering');
  });

  it('counts the full cost paid once both deposit and balance are paid', () => {
    const l = vendorToBudgetLine({
      id: 'v-2', name: 'DJ', costCents: 200000, depositCents: 50000, depositPaid: true, balancePaid: true,
    });
    expect(l.paidCents).toBe(200000); // 50000 deposit + 150000 balance
  });

  it('falls back to a Vendors category and null money when unset', () => {
    const l = vendorToBudgetLine({ id: 'v-3', name: 'TBD Florist' });
    expect(l.category).toBe('Vendors');
    expect(l.committedCents).toBeNull();
    expect(l.paidCents).toBeNull();
  });
});
