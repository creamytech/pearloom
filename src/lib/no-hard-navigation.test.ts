// ─────────────────────────────────────────────────────────────
// The soft-navigation fence (COHESION-PLAN N.1).
//
// Inside the product, navigation never reloads the document — the
// one thing that always feels like "jumping from web page to web
// page". Internal moves go through the router (useSoftRouter /
// <Link>); window.location is reserved for EXTERNAL origins
// (Stripe checkout, wallet passes) and the one deliberate
// document re-run (the pre-launch gate cookie). Every allowed
// call site is named below and carries a "hard on purpose"
// comment in the file; anything new fails here first.
// ─────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Files allowed to hard-navigate, each for a named reason. */
const HARD_ON_PURPOSE = [
  'src/app/gate/page.tsx',                                  // httpOnly gate cookie → fresh document
  'src/components/pearloom/editor/EditorThemeShop.tsx',     // Stripe checkout (external origin)
  'src/components/shared/PublishModal.tsx',                 // Stripe checkout (external origin)
  'src/components/guest-experience/WalletPassCard.tsx',     // wallet save URL (external origin)
  'src/components/pearloom/store/CartDrawer.tsx',           // Stripe checkout (external origin)
  'src/components/marketing/design/dash/DashSettings.tsx',  // Stripe checkout (external origin)
  'src/app/upgrade/UpgradeClient.tsx',                      // Stripe checkout (external origin)
];

function grepHardNavs(): string[] {
  try {
    const out = execFileSync(
      'grep',
      ['-rlnE', String.raw`window\.location\.(assign|replace)\(|window\.location\.href *=`,
        '--include=*.ts', '--include=*.tsx', 'src'],
      { encoding: 'utf8', cwd: process.cwd() },
    );
    return out.split('\n').filter(Boolean).filter((f) => !/\.test\.tsx?$/.test(f));
  } catch {
    return []; // grep exits 1 on zero matches
  }
}

describe('the soft-navigation law', () => {
  it('window.location navigation exists only in the named hard-on-purpose files', () => {
    const offenders = grepHardNavs().filter((f) => !HARD_ON_PURPOSE.includes(f));
    expect(offenders).toEqual([]);
  });

  it('every whitelisted file still says why, in place', () => {
    for (const f of HARD_ON_PURPOSE) {
      const body = readFileSync(join(process.cwd(), f), 'utf8');
      expect(body, `${f} lost its "hard on purpose" comment`).toMatch(/hard on purpose/);
    }
  });

  it('the weave cut is mounted at the root', () => {
    const layout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    expect(layout).toMatch(/<SoftNavigation \/>/);
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    expect(css).toMatch(/::view-transition-old\(root\)/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
  });
});
