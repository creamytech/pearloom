// ─────────────────────────────────────────────────────────────
// The free-design fence (EDITOR-CALM-PLAN E.1, owner decision
// 2026-08-13).
//
// DESIGN IS FREE. ALL OF IT. Every theme pack, kit, texture,
// wallpaper, motif, and motion finish belongs to every account —
// money buys capacity (sites/guests/photos/Pear), never the look.
// This fence keeps the paywall from creeping back:
//   1. no pack, decor item, or wallpaper carries a price;
//   2. every entitlement read grants the whole catalog;
//   3. the deleted commerce surfaces stay deleted;
//   4. no editor/store/studio surface renders unlock language.
// ─────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PACKS, FREE_PACK_IDS } from './theme-store/packs';
import { planGrantedPackIds } from './theme-store/entitlements';
import { DECOR_ITEMS } from './theme-store/decor-items';
import { WALLPAPERS } from './site-look/wallpapers';

describe('nothing in the design catalog carries a price', () => {
  it('all packs are free-tier with priceCents 0', () => {
    expect(PACKS.length).toBeGreaterThan(70);
    for (const p of PACKS) {
      expect(p.priceCents, `${p.id}`).toBe(0);
      expect(p.tier, `${p.id}`).toBe('free');
    }
    expect(FREE_PACK_IDS.length).toBe(PACKS.length);
  });

  it('all decor items are free', () => {
    for (const d of DECOR_ITEMS) {
      expect(d.price, d.id).toBe(0);
      expect(d.tier, d.id).toBe('free');
    }
  });

  it('wallpapers carry no price metadata at all', () => {
    for (const w of WALLPAPERS) {
      expect('price' in (w as object), w.id).toBe(false);
    }
  });

  it('every plan (and no plan) is granted the whole catalog', () => {
    for (const plan of ['free', 'pro', 'premium', null, undefined, 'anything']) {
      expect(planGrantedPackIds(plan).length).toBe(PACKS.length);
    }
  });
});

describe('the commerce surfaces stay deleted', () => {
  it.each([
    'src/app/api/store/checkout',
    'src/app/api/store/apply-free',
    'src/app/store/success',
    'src/components/pearloom/store/CartDrawer.tsx',
    'src/components/pearloom/store/CartProvider.tsx',
  ])('%s does not exist', (p) => {
    expect(existsSync(join(process.cwd(), p))).toBe(false);
  });
});

describe('no design surface renders unlock language', () => {
  function grepDirs(pattern: string, dirs: string[]): string[] {
    try {
      const out = execFileSync(
        'grep',
        ['-rn', '--include=*.tsx', '--include=*.ts', '-E', pattern, ...dirs],
        { encoding: 'utf8', cwd: process.cwd() },
      );
      return out.split('\n').filter(Boolean).filter((l) => !/\.test\.tsx?:/.test(l));
    } catch {
      return []; // grep exits 1 on zero matches
    }
  }

  it('no "Unlock"/"Add to cart"/"Get free" CTA in editor, store, or studio surfaces', () => {
    const hits = grepDirs(String.raw`>\s*Unlock\b|Add to cart|Get free|Unlock ·`, [
      'src/components/pearloom/editor',
      'src/components/pearloom/store',
      'src/components/pearloom/studio',
      'src/components/pearloom/redesign',
      'src/components/shared',
    ]);
    expect(hits).toEqual([]);
  });

  it('no pack-gate 402 survives in the sites API', () => {
    const hits = grepDirs(String.raw`packGate`, ['src/app/api/sites']);
    expect(hits).toEqual([]);
  });
});
