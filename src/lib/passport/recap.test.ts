// ─────────────────────────────────────────────────────────────
// passport/recap — the transfer moment, and its guardrails.
//
// This is the product's growth engine (a guest becomes the next
// host), which makes it exactly the surface most likely to drift
// into something grabby. The tests below defend the three rules
// that keep it decent:
//
//   1. Figures are REAL — zero produces a quieter recap, never a
//      padded one.
//   2. A memorial is NEVER a funnel. The "plan your own"
//      invitation is suppressed on solemn occasions, full stop.
//   3. The recap belongs to the afterglow — nothing looks back
//      before the day has happened.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildRecap, referralHref, hasEventPassed, type RecapCounts } from './recap';

const NONE: RecapCounts = {
  peopleTogether: 0,
  photosSent: 0,
  wordsWritten: 0,
  songsSuggested: 0,
  toastsRecorded: 0,
};

const RICH: RecapCounts = {
  peopleTogether: 84,
  photosSent: 23,
  wordsWritten: 2,
  songsSuggested: 1,
  toastsRecorded: 1,
};

describe('rule 3 — nothing looks back before the day', () => {
  it('does not render before the event', () => {
    const r = buildRecap({ counts: RICH, occasion: 'wedding', isAfter: false });
    expect(r.show).toBe(false);
    expect(r.lines).toEqual([]);
    expect(r.inviteToHost).toBe(false);
  });

  it('renders after it', () => {
    expect(buildRecap({ counts: RICH, occasion: 'wedding', isAfter: true }).show).toBe(true);
  });
});

describe('rule 1 — every figure is real', () => {
  it('lists only the counts that actually happened', () => {
    const r = buildRecap({
      counts: { ...NONE, peopleTogether: 84, photosSent: 23 },
      occasion: 'wedding',
      isAfter: true,
    });
    const labels = r.lines.map((l) => l.label).join(' ');
    expect(r.lines).toHaveLength(2);
    expect(labels).toMatch(/people there/);
    expect(labels).toMatch(/photos you sent/);
    // Nothing invented for the zero counts.
    expect(labels).not.toMatch(/song/);
    expect(labels).not.toMatch(/toast/);
    expect(labels).not.toMatch(/wrote/);
  });

  it('renders the real numbers, not rounded or embellished ones', () => {
    const r = buildRecap({ counts: RICH, occasion: 'wedding', isAfter: true });
    expect(r.lines.map((l) => l.value)).toEqual(['84', '23', '2', '1', '1']);
  });

  it('singularizes correctly', () => {
    const r = buildRecap({
      counts: { ...NONE, peopleTogether: 1, photosSent: 1 },
      occasion: 'wedding',
      isAfter: true,
    });
    expect(r.lines[0].label).toBe('person there');
    expect(r.lines[1].label).toBe('photo you sent');
  });

  it('a guest who contributed nothing gets a quiet recap, not a padded one', () => {
    const r = buildRecap({ counts: NONE, occasion: 'wedding', isAfter: true });
    expect(r.show).toBe(true);
    expect(r.lines).toEqual([]);
    expect(r.note).toBeNull();
  });

  it('a guest who came but sent nothing is told something true', () => {
    const r = buildRecap({
      counts: { ...NONE, peopleTogether: 40 },
      occasion: 'wedding',
      isAfter: true,
    });
    expect(r.lines).toHaveLength(1);
    expect(r.note).toBe('Glad you were there.');
  });
});

describe('rule 2 — a memorial is never a funnel', () => {
  it('SUPPRESSES the host-your-own invitation on solemn occasions', () => {
    for (const occasion of ['memorial', 'funeral']) {
      const r = buildRecap({ counts: RICH, occasion, isAfter: true });
      expect(r.show, occasion).toBe(true);
      expect(r.inviteToHost, `${occasion} must never invite the guest to host`).toBe(false);
    }
  });

  it('still shows the invitation on celebratory occasions', () => {
    for (const occasion of ['wedding', 'birthday', 'reunion', 'baby-shower']) {
      expect(buildRecap({ counts: RICH, occasion, isAfter: true }).inviteToHost, occasion).toBe(true);
    }
  });

  it('speaks in the solemn register', () => {
    const r = buildRecap({ counts: RICH, occasion: 'memorial', firstName: 'Ana', isAfter: true });
    expect(r.eyebrow).toBe('In remembrance');
    expect(r.headline).toBe('Thank you for being there, Ana.');
    expect(r.lines[0].label).toMatch(/gathered/);
    // No celebratory language anywhere in the solemn copy.
    const allCopy = `${r.eyebrow} ${r.headline} ${r.note ?? ''} ${r.lines.map((l) => l.label).join(' ')}`;
    expect(allCopy).not.toMatch(/celebrat|party|congrat/i);
  });

  it('says something true to a mourner who left nothing behind', () => {
    const r = buildRecap({ counts: NONE, occasion: 'memorial', isAfter: true });
    expect(r.note).toBe('Your being there mattered.');
    expect(r.inviteToHost).toBe(false);
  });
});

describe('address and register', () => {
  it('uses the guest’s name when known, and reads fine without it', () => {
    expect(buildRecap({ counts: RICH, occasion: 'wedding', firstName: 'Sam', isAfter: true }).headline)
      .toBe('You were part of it, Sam.');
    expect(buildRecap({ counts: RICH, occasion: 'wedding', isAfter: true }).headline)
      .toBe('You were part of it.');
    // Whitespace-only names must not produce "You were part of it, ."
    expect(buildRecap({ counts: RICH, occasion: 'wedding', firstName: '   ', isAfter: true }).headline)
      .toBe('You were part of it.');
  });

  it('handles an unknown occasion without breaking', () => {
    const r = buildRecap({ counts: RICH, occasion: 'not-real', isAfter: true });
    expect(r.show).toBe(true);
    expect(r.inviteToHost).toBe(true); // not solemn → invitation stands
  });
});

describe('referralHref — attribution without identity', () => {
  it('carries the referring site so guest→host conversion is measurable', () => {
    expect(referralHref('emma-and-james')).toBe('/wizard/new?ref=emma-and-james');
  });

  it('carries NO guest identity — the link may be pasted into a group chat', () => {
    const href = referralHref('emma-and-james');
    expect(href).not.toMatch(/token|guest|email|@/i);
  });

  it('encodes and degrades safely', () => {
    expect(referralHref('a b&c')).toBe('/wizard/new?ref=a%20b%26c');
    expect(referralHref(null)).toBe('/wizard/new');
    expect(referralHref('')).toBe('/wizard/new');
    expect(referralHref('   ')).toBe('/wizard/new');
  });
});

describe('hasEventPassed — the recap belongs to the day after', () => {
  const noonOn = (iso: string) => new Date(`${iso}T12:00:00`).getTime();

  it('is false during the event day itself — people are still dancing', () => {
    expect(hasEventPassed('2027-09-12', noonOn('2027-09-12'))).toBe(false);
  });

  it('is true the next day', () => {
    expect(hasEventPassed('2027-09-12', noonOn('2027-09-13'))).toBe(true);
  });

  it('is false before the event', () => {
    expect(hasEventPassed('2027-09-12', noonOn('2027-09-01'))).toBe(false);
  });

  it('degrades safely on missing or malformed dates', () => {
    expect(hasEventPassed(null)).toBe(false);
    expect(hasEventPassed(undefined)).toBe(false);
    expect(hasEventPassed('')).toBe(false);
    expect(hasEventPassed('someday')).toBe(false);
    expect(hasEventPassed('12/09/2027')).toBe(false);
  });

  it('accepts an ISO datetime, reading only the calendar day', () => {
    expect(hasEventPassed('2027-09-12T18:00:00Z', noonOn('2027-09-13'))).toBe(true);
  });
});
