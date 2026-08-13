#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// scripts/route-link-audit.mjs — CLI for the static link audit.
//
// The logic lives in src/lib/dev/route-links.mjs so this and the
// regression test (src/lib/dev/route-links.test.ts) run the same
// code. See that file for why this exists and how it differs from
// scripts/link-audit.mjs (the Playwright crawler).
//
//   node scripts/route-link-audit.mjs
// ─────────────────────────────────────────────────────────────

import { findDeadLinks } from '../src/lib/dev/route-links.mjs';

const { routes, links, dead } = findDeadLinks();
console.log(`${routes.length} routes · ${links.length} internal links checked`);

if (dead.length === 0) {
  console.log('\nEvery internal link resolves to a route. ✓');
} else {
  console.log(`\n${dead.length} link(s) resolve to NOTHING:\n`);
  const byTarget = new Map();
  for (const b of dead) {
    if (!byTarget.has(b.pathname)) byTarget.set(b.pathname, []);
    byTarget.get(b.pathname).push(b);
  }
  for (const [target, hits] of [...byTarget].sort()) {
    console.log(`  ${target}`);
    for (const h of hits) console.log(`      ${h.file}:${h.line}  ${h.source}`);
  }
  process.exitCode = 1;
}
