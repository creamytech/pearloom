// ─────────────────────────────────────────────────────────────
// Plan → pack grants, after the 2026-08-04 packaging restructure.
//
// The contract these tests defend:
//   1. DESIGN IS NOT THE PAYWALL — every non-signature pack is
//      granted to a FREE account. If this breaks, the acquisition
//      loop breaks with it (docs/REVIEW-SYNTHESIS.md §1.3).
//   2. NO EXISTING CUSTOMER LOSES ANYTHING — rows still storing the
//      retired 'atelier' / 'legacy' names must resolve to the same
//      grants as 'pass' / 'keepsake'. The DB was never migrated, so
//      this is the compatibility seam.
//   3. The signature shelf stays above the free tier — the Pass's
//      visible reason to exist.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { planGrantedPackIds } from './entitlements';
import { PACKS } from './packs';

const SIGNATURE_IDS = PACKS.filter((p) => p.tier === 'signature').map((p) => p.id);
const OPEN_IDS = PACKS.filter((p) => p.tier !== 'signature').map((p) => p.id);

describe('planGrantedPackIds — design is not the paywall', () => {
  it('grants every non-signature pack to a free account', () => {
    const granted = new Set(planGrantedPackIds('free'));
    for (const id of OPEN_IDS) {
      expect(granted.has(id), `free account must own "${id}"`).toBe(true);
    }
    // Sanity: that's a real catalog, not an empty set.
    expect(OPEN_IDS.length).toBeGreaterThan(20);
  });

  it('withholds the signature shelf from free accounts', () => {
    const granted = new Set(planGrantedPackIds('free'));
    for (const id of SIGNATURE_IDS) {
      expect(granted.has(id), `signature pack "${id}" must not be free`).toBe(false);
    }
    expect(SIGNATURE_IDS.length).toBeGreaterThan(0);
  });

  it('grants the whole catalog from the Pass upward', () => {
    for (const plan of ['pro', 'pass', 'premium', 'keepsake']) {
      const granted = new Set(planGrantedPackIds(plan));
      for (const p of PACKS) {
        expect(granted.has(p.id), `${plan} must own "${p.id}"`).toBe(true);
      }
    }
  });
});

describe('planGrantedPackIds — retired plan names keep their entitlements', () => {
  it('atelier grants exactly what pass grants (no migration ran)', () => {
    expect([...planGrantedPackIds('atelier')].sort())
      .toEqual([...planGrantedPackIds('pass')].sort());
  });

  it('legacy grants exactly what keepsake grants', () => {
    expect([...planGrantedPackIds('legacy')].sort())
      .toEqual([...planGrantedPackIds('keepsake')].sort());
  });

  it('journal grants exactly what page grants', () => {
    expect([...planGrantedPackIds('journal')].sort())
      .toEqual([...planGrantedPackIds('page')].sort());
  });

  it('an unknown or absent plan is treated as free, never as paid', () => {
    for (const plan of [null, undefined, '', 'vip', 'enterprise']) {
      const granted = new Set(planGrantedPackIds(plan));
      for (const id of SIGNATURE_IDS) {
        expect(granted.has(id), `"${String(plan)}" must not unlock signature`).toBe(false);
      }
      // …but they still get the open shelf — an unrecognized plan
      // string must not make the product look broken.
      expect(granted.has(OPEN_IDS[0])).toBe(true);
    }
  });
});
