// The T.5 fence (REVAMP-EXECUTION-PLAN §5 / NEW-USER-REVAMP L38):
// the store carried hardcoded social proof — "4.8 · 1.6k sold",
// "★ Bestseller" — while the sales ledger had never seen a row.
// Fabricated numbers on a money surface are the fastest way to
// lose a host's trust. Real counts may render WHEN REAL (derived
// from theme_pack_purchases); invented ones can never return.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PACKS } from './packs';
import { DECOR_ITEMS } from './decor-items';

describe('no fabricated social proof in the store', () => {
  it('no pack carries an invented rating or sales figure', () => {
    for (const pack of PACKS) {
      const loose = pack as unknown as Record<string, unknown>;
      expect(loose.rating, `${pack.id} rating`).toBeUndefined();
      expect(loose.sales, `${pack.id} sales`).toBeUndefined();
      expect((loose.badges as Record<string, unknown>)?.best, `${pack.id} bestseller badge`).toBeUndefined();
    }
    for (const item of DECOR_ITEMS) {
      const loose = item as unknown as { badges?: Record<string, unknown> };
      expect(loose.badges?.best, `${(item as { id: string }).id} bestseller badge`).toBeUndefined();
    }
  });

  it('no store surface renders "sold" counts or bestseller ribbons', () => {
    const dir = join(process.cwd(), 'src/components/pearloom/store');
    const offenders: string[] = [];
    for (const name of readdirSync(dir)) {
      if (!/\.tsx?$/.test(name)) continue;
      const body = readFileSync(join(dir, name), 'utf8');
      if (/\bsold\b/i.test(body.replace(/undersold/g, '')) || body.includes('Bestseller') || body.includes('badges.best')) {
        offenders.push(name);
      }
    }
    expect(offenders, 'store files re-growing fabricated proof').toEqual([]);
  });
});
