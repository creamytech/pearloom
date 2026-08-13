// ─────────────────────────────────────────────────────────────
// Number routing — a dedicated number NARROWS, it never widens.
//
// The tempting bug is to treat "they texted Emma & James's number"
// as evidence they belong to Emma & James. It isn't. A phone number
// is guessable in a way a passport token is not, so if a dedicated
// number ever answered for a guest who isn't on that list, buying
// one would turn it into a probe against the guest list.
//
// The second trap is falling THROUGH: guest texts Emma & James's
// number, isn't on it, but is on Ana & Luis's — answering about Ana
// & Luis would be both confusing and a disclosure they didn't ask
// for.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { resolveWithNumber, normalizeNumberKey, sameNumber, notOnThisListReply } from './number-routing';
import type { ConciergeMatch } from './concierge';

function match(over: Partial<ConciergeMatch> & { siteId: string }): ConciergeMatch {
  return {
    siteSlug: over.siteId,
    siteLabel: over.siteId,
    guestId: `g-${over.siteId}`,
    guestName: 'Aunt Prue',
    published: true,
    ...over,
  };
}

const EMMA = match({ siteId: 'emma', siteLabel: 'Emma & James' });
const ANA = match({ siteId: 'ana', siteLabel: 'Ana & Luis' });

describe('the shared number behaves exactly as before', () => {
  it('resolves a single match', () => {
    expect(resolveWithNumber([EMMA], null).kind).toBe('one');
  });

  it('still asks when the guest is on two lists', () => {
    expect(resolveWithNumber([EMMA, ANA], null).kind).toBe('many');
  });

  it('knows nothing about a stranger', () => {
    expect(resolveWithNumber([], null).kind).toBe('none');
  });
});

describe('a dedicated number answers outright', () => {
  it('picks its own celebration with no disambiguation', () => {
    const r = resolveWithNumber([EMMA, ANA], 'emma');
    expect(r.kind).toBe('one');
    if (r.kind === 'one') expect(r.match.siteId).toBe('emma');
  });

  it('collapses a guest listed twice on that roster', () => {
    const r = resolveWithNumber(
      [match({ siteId: 'emma', guestId: 'g1' }), match({ siteId: 'emma', guestId: 'g2' })],
      'emma',
    );
    expect(r.kind).toBe('one');
  });

  it('still refuses a draft — the published rule is not bypassed', () => {
    expect(resolveWithNumber([match({ siteId: 'emma', published: false })], 'emma').kind).toBe('none');
  });
});

describe('it NARROWS, never widens', () => {
  it('tells a non-guest nothing, even on the celebration’s own number', () => {
    // The number is more guessable than a passport token. If this
    // ever answered, buying one would make it a probe.
    expect(resolveWithNumber([], 'emma').kind).toBe('none');
  });

  it('does NOT fall through to a celebration they are on', () => {
    // Texted Emma & James's number; only on Ana & Luis's list.
    // Answering about Ana & Luis would be a disclosure nobody asked
    // for, on top of being confusing.
    const r = resolveWithNumber([ANA], 'emma');
    expect(r.kind).toBe('none');
  });

  it('never returns a celebration other than the one dialled', () => {
    const r = resolveWithNumber([EMMA, ANA], 'ana');
    expect(r.kind).toBe('one');
    if (r.kind === 'one') expect(r.match.siteId).toBe('ana');
  });
});

describe('the reply to a wrong number gives nothing away', () => {
  const reply = notOnThisListReply();

  it('names no celebration and no host', () => {
    expect(reply).not.toMatch(/Emma|James|Ana|Luis/);
  });

  it('does not confirm the number belongs to a celebration at all', () => {
    expect(reply).not.toMatch(/this celebration|not invited|not on (the|this) list/i);
  });
});

describe('number comparison', () => {
  it('ignores formatting', () => {
    expect(sameNumber('+1 (555) 123-0000', '+15551230000')).toBe(true);
    expect(normalizeNumberKey('+1 (555) 123-0000')).toBe('15551230000');
  });

  it('is false for different numbers', () => {
    expect(sameNumber('+15551230000', '+15559990000')).toBe(false);
  });

  it('never matches on emptiness', () => {
    // Two unset numbers must not be "the same number", or every
    // celebration without one would answer for every other.
    expect(sameNumber('', '')).toBe(false);
    expect(sameNumber(null, undefined)).toBe(false);
    expect(sameNumber('abc', 'def')).toBe(false);
  });
});
