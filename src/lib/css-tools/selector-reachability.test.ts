// ─────────────────────────────────────────────────────────────
// The reachability rule behind scripts/css-dead-audit.mjs.
//
// That script deletes CSS, which fails SILENTLY and VISUALLY — no
// build error, no failing test, just something subtly wrong on a
// surface nobody looks at until a host does. The one piece of real
// reasoning in it is this predicate, so it lives here where the
// suite runs it.
//
// The rule: a selector can never match when any compound in its
// chain requires a class no element carries. The trap is negation —
// `:not(.dead)` over a class nobody has matches EVERYTHING, so the
// same fact that kills a descendant selector makes a negated one
// broader. Anything with a functional pseudo-class is left alone.
//
// Kept in sync by construction: the script imports nothing from
// here, so this file restates the predicate. If you change one,
// change both — the tests below are the specification.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

/** Mirror of `selectorCanNeverMatch` in scripts/css-dead-audit.mjs. */
export function selectorCanNeverMatch(selector: string, dead: ReadonlySet<string>): boolean {
  if (/:(not|is|where|has|matches|any)\s*\(/i.test(selector)) return false;
  const compounds = selector.split(/\s*[\s>+~]\s*/).filter(Boolean);
  for (const compound of compounds) {
    const found = [...compound.matchAll(/\.(pl8?-[a-zA-Z0-9_-]+)/g)].map((m) => m[1]);
    if (found.length > 0 && found.every((c) => dead.has(c))) return true;
  }
  return false;
}

const DEAD = new Set(['pl8-gallery-grid', 'pl8-hotel-card', 'pl8-dash']);
const unreachable = (s: string) => selectorCanNeverMatch(s, DEAD);

describe('a selector whose target nobody renders is unreachable', () => {
  it('catches the bare class', () => {
    expect(unreachable('.pl8-gallery-grid')).toBe(true);
  });

  it('catches a dead target under a LIVE scope — the whole point', () => {
    // .pl8-guest is the live site root; the rule still can't match.
    expect(unreachable('.pl8-guest .pl8-gallery-grid')).toBe(true);
    expect(unreachable('.pl8-guest[data-pl-kit="ticket"] .pl8-hotel-card')).toBe(true);
  });

  it('catches a dead compound ANYWHERE in the chain, not just the end', () => {
    expect(unreachable('.pl8-gallery-grid > div')).toBe(true);
    expect(unreachable('.pl8-dash main > section')).toBe(true);
  });

  it('follows every combinator', () => {
    for (const c of ['>', '+', '~', ' ']) {
      expect(unreachable(`.pl8-guest ${c} .pl8-gallery-grid`.replace('  ', ' ')), c).toBe(true);
    }
  });

  it('sees through pseudo-elements and states on the dead compound', () => {
    expect(unreachable('.pl8-hotel-card:hover')).toBe(true);
    expect(unreachable('.pl8-hotel-card:nth-child(even)')).toBe(true);
    expect(unreachable('.pl8-hotel-card::before')).toBe(true);
  });
});

describe('it leaves reachable selectors alone', () => {
  it('keeps a live class', () => {
    expect(unreachable('.pl8-guest')).toBe(false);
    expect(unreachable('.pl8-guest .pl8-passport-card')).toBe(false);
  });

  it('keeps a selector with no pl-class at all', () => {
    expect(unreachable('main > section')).toBe(false);
    expect(unreachable('hr.divider')).toBe(false);
  });

  it('keeps a COMPOUND where one class is alive — the element can exist', () => {
    // .pl8-live.pl8-dash needs both, and .pl8-live is real, so the
    // rule is only unreachable if nothing ever sets both. That's a
    // stronger claim than this tool makes, so it keeps it.
    expect(unreachable('.pl8-live.pl8-dash')).toBe(false);
  });

  it('keeps a live target under a dead ancestor’s sibling in the same chain', () => {
    expect(unreachable('.pl8-guest .pl8-map-card')).toBe(false);
  });
});

describe('negation and selector lists are NEVER touched', () => {
  it('refuses :not() — a negation over a dead class matches everything', () => {
    // Deleting this would be the inverse of the intended change.
    expect(unreachable('section button:not(.pl8-gallery-grid)')).toBe(false);
    expect(unreachable('.pl8-guest :not(.pl8-hotel-card)')).toBe(false);
  });

  it('refuses :is() / :where() / :has() — a dead member doesn’t kill the list', () => {
    expect(unreachable(':is(.pl8-gallery-grid, .pl8-map-card)')).toBe(false);
    expect(unreachable(':where(.pl8-dash) .thing')).toBe(false);
    expect(unreachable('.pl8-guest:has(.pl8-hotel-card)')).toBe(false);
  });

  it('refuses even when the dead class is also outside the negation', () => {
    // Conservative on purpose: mixed reasoning is where this would
    // go wrong quietly.
    expect(unreachable('.pl8-gallery-grid:not(.x)')).toBe(false);
  });
});

describe('class-name boundaries', () => {
  it('does not treat a longer class as its dead prefix', () => {
    // pl8-dash is dead; pl8-dashshell is the live app wrapper.
    expect(unreachable('.pl8-dashshell')).toBe(false);
    expect(unreachable('.pl8-dashshell aside')).toBe(false);
  });
});
