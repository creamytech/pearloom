// ─────────────────────────────────────────────────────────────
// The panel-registry fence (EDITOR-CALM-PLAN E.5).
//
// CLAUDE-DESIGN §7 IS the panel registry: it lists every dispatch
// case renderSectionEditor handles, and carries a machine-readable
// marker (<!-- panel-registry-count: NN -->). This fence pins the
// two together so the doc cannot drift from the code — adding or
// removing a panel means updating §7 in the same change-set.
// ─────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const railSrc = readFileSync(
  join(process.cwd(), 'src/components/pearloom/redesign/PropertyRail.tsx'),
  'utf8',
);
const doc = readFileSync(join(process.cwd(), 'CLAUDE-DESIGN.md'), 'utf8');

function dispatchCases(): string[] {
  const start = railSrc.indexOf('function renderSectionEditor');
  expect(start, 'renderSectionEditor exists').toBeGreaterThan(-1);
  const body = railSrc.slice(start);
  const end = body.indexOf('\n}');
  return [...body.slice(0, end).matchAll(/case '([A-Za-z]+)':/g)].map((m) => m[1]);
}

describe('CLAUDE-DESIGN §7 is the panel registry', () => {
  it('the doc marker equals the dispatch case count', () => {
    const m = doc.match(/<!-- panel-registry-count: (\d+) -->/);
    expect(m, 'the §7 marker exists').toBeTruthy();
    expect(dispatchCases()).toHaveLength(Number(m![1]));
  });

  it('every dispatch case is named in the doc', () => {
    for (const c of dispatchCases()) {
      expect(doc.includes(c), `§7 names '${c}'`).toBe(true);
    }
  });

  it('the deleted duplicate homes stay deleted (one-home law)', () => {
    for (const gone of ['NavPanel', 'FooterPanel', 'GuestbookPanel']) {
      expect(
        railSrc.includes(`import { ${gone} }`),
        `${gone} import stays gone`,
      ).toBe(false);
    }
  });
});
