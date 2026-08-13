// ─────────────────────────────────────────────────────────────
// The no-physical-promises fence (ATELIER-PLAN §1/§5).
//
// Pearloom Print — the paid Lob + Stripe print-and-mail service —
// was retired 2026-07-08 (owner decision: no physical anything).
// "Pearloom presses the artwork; your printer presses the paper."
// This test scans the product source for copy that would promise
// physical fulfillment again. If a phrase here has a legitimate
// new home, that's a product decision, not a wording tweak —
// don't just rename it past the fence.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..');

/** Phrases that imply Pearloom prints/mails/ships physical goods. */
const FORBIDDEN = [
  'mailed for you',
  'Mail it for you',
  'Pearloom Print',
  'print credit',
  'Order in print',
  'mail via shop',
  'stamped, and mailed',
  'printed and mailed',
  'lob.com/v1',
];

/** Deleted modules that must stay deleted (imports would resurrect
 *  the pipeline). */
const FORBIDDEN_IMPORTS = [
  'print-engine',
  '/api/print/checkout',
  'StudioMailFlow',
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) {
      out.push(p);
    }
  }
  return out;
}

describe('no physical fulfillment promises (Pearloom Print stays retired)', () => {
  const files = walk(SRC);

  it('scans a real tree', () => {
    expect(files.length).toBeGreaterThan(300);
  });

  it('no source file carries a physical-fulfillment phrase or import', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const body = readFileSync(f, 'utf8');
      for (const phrase of [...FORBIDDEN, ...FORBIDDEN_IMPORTS]) {
        if (body.includes(phrase)) offenders.push(`${f} → "${phrase}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
