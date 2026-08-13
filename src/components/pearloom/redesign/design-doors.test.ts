// ─────────────────────────────────────────────────────────────
// The door-count pin (EDITOR-CALM-PLAN E.5).
//
// The Design tab is a deck of NINE doors on every viewport — the
// calm editor's core shape. This fence keeps the scroll wall from
// growing back:
//   1. DESIGN_DOORS lists exactly 9 doors;
//   2. the DesignDoorId union matches the deck 1:1 (no orphan door
//      bodies, no deck cards without a body);
//   3. the retired surfaces stay retired — no standalone 'motion'
//      door (Cards & motion is ONE kitId dial), no JumpChips, no
//      full-scroll mode in ThemePickerBody.
// Changing the door set is a product decision: update the plan doc
// and CLAUDE-DESIGN §7 in the same change-set, then this pin.
// ─────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const deckSrc = readFileSync(
  join(process.cwd(), 'src/components/pearloom/redesign/DesignDoorDeck.tsx'),
  'utf8',
);
const bodySrc = readFileSync(
  join(process.cwd(), 'src/components/pearloom/redesign/ThemePickerBody.tsx'),
  'utf8',
);

function deckDoorIds(): string[] {
  const block = deckSrc.slice(
    deckSrc.indexOf('const DESIGN_DOORS'),
    deckSrc.indexOf('];', deckSrc.indexOf('const DESIGN_DOORS')),
  );
  return [...block.matchAll(/\{ id: '([a-z]+)'/g)].map((m) => m[1]);
}

function doorUnionIds(): string[] {
  const start = bodySrc.indexOf('export type DesignDoorId');
  const block = bodySrc.slice(start, bodySrc.indexOf(';', start));
  return [...block.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
}

describe('the Design tab stays a nine-door deck', () => {
  it('DESIGN_DOORS lists exactly 9 doors', () => {
    expect(deckDoorIds()).toHaveLength(9);
  });

  it('the DesignDoorId union and the deck agree 1:1', () => {
    expect([...deckDoorIds()].sort()).toEqual([...doorUnionIds()].sort());
  });

  it('every deck door has a body arm in ThemePickerBody', () => {
    for (const id of deckDoorIds()) {
      expect(bodySrc.includes(`door === '${id}'`), `door body for '${id}'`).toBe(true);
    }
  });

  it('the retired surfaces stay retired', () => {
    // Cards & motion are ONE dial — no standalone motion door.
    expect(doorUnionIds()).not.toContain('motion');
    // The desktop scroll ladder and its table of contents are gone.
    expect(bodySrc.includes('JumpChips')).toBe(false);
    expect(bodySrc.includes("motion: 'inline'")).toBe(false);
    expect(deckSrc.includes('isMobileViewport')).toBe(false);
  });
});
