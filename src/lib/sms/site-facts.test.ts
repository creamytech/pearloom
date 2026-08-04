// ─────────────────────────────────────────────────────────────
// sms/site-facts — what a stranger with a phone may be told.
//
// Anyone can dial a number, so these tests are written from the
// attacker's side: a manifest stuffed with money, guests, vendors
// and private notes goes in, and none of it may come out. The
// allowlist is the mechanism; this is the proof.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { smsSiteFacts } from './site-facts';

const FULL = {
  logistics: {
    date: '2027-09-12',
    time: '4:00 PM',
    venue: 'The Old Mill',
    venueAddress: '14 Mill Lane, Hudson NY',
    dresscode: 'Garden formal',
    rsvpDeadline: '2027-08-01',
    notes: 'INTERNAL: mum must not know about the string quartet',
  },
  travelInfo: { parkingInfo: 'Free lot behind the barn.', directions: 'Exit 21, then left.' },
  details: { accessibility: 'Step-free entrance on the north side.' },
  events: [{ name: 'Ceremony', time: '4:00 PM', location: 'The orchard', description: 'no phones, tell Uncle Ray' }],
  faqs: [{ question: 'Can I bring kids?', answer: 'Adults only, sorry!' }],

  // None of this may travel.
  registry: { entries: [{ name: 'Toaster', url: 'https://x' }], cashFundUrl: 'https://venmo.me/emma' },
  registryFunds: { venmo: '@emma-doyle', goalCents: 500000 },
  budget: { total: 48000 },
  vendors: [{ name: 'Bloom & Co', cost: 4200, balance: 1200 }],
  guests: [{ name: 'Aunt Prue', email: 'prue@x.test', phone: '+15551230000' }],
  voiceDNA: { sample: 'Emma writes like this' },
};

describe('a stranger learns only what a guest needs', () => {
  const facts = smsSiteFacts(FULL, 'Emma & James');

  it('carries the logistics a guest actually texts about', () => {
    expect(facts).toContain('2027-09-12');
    expect(facts).toContain('The Old Mill');
    expect(facts).toContain('14 Mill Lane');
    expect(facts).toContain('Garden formal');
    expect(facts).toContain('Free lot behind the barn.');
    expect(facts).toContain('Step-free entrance');
  });

  it('carries the host’s own FAQ answers — written by them, for guests', () => {
    expect(facts).toContain('Can I bring kids?');
    expect(facts).toContain('Adults only');
  });

  it('carries NO money — not a registry, a fund, a budget or a balance', () => {
    expect(facts).not.toMatch(/venmo|toaster|48000|4200|1200|goal/i);
  });

  it('carries NO other guests', () => {
    expect(facts).not.toMatch(/Prue|prue@|\+1555123/);
  });

  it('carries NO vendors', () => {
    expect(facts).not.toMatch(/Bloom & Co/);
  });

  it('carries NO private host notes', () => {
    // logistics.notes and per-event descriptions are where hosts
    // put things they'd never text a stranger.
    expect(facts).not.toMatch(/mum must not know|Uncle Ray/i);
  });

  it('carries no voice profile', () => {
    expect(facts).not.toMatch(/Emma writes like this/);
  });
});

describe('a field added to the manifest tomorrow does not leak', () => {
  it('is excluded by default — the sheet is an allowlist', () => {
    const facts = smsSiteFacts(
      { ...FULL, someFieldAddedNextYear: 'the surprise proposal is at 9pm' },
      'Emma & James',
    );
    expect(facts).not.toMatch(/surprise proposal/i);
  });
});

describe('an empty site escalates instead of pretending', () => {
  it('returns nothing when there is nothing to tell', () => {
    expect(smsSiteFacts({}, 'Emma & James')).toBe('');
    expect(smsSiteFacts(null, 'Emma & James')).toBe('');
  });

  it('returns nothing when only the label is known', () => {
    // A sheet that says "Celebration: Emma & James" and no more
    // would let a model improvise around it.
    expect(smsSiteFacts({ names: ['Emma', 'James'] }, 'Emma & James')).toBe('');
  });

  it('speaks up as soon as one real fact exists', () => {
    expect(smsSiteFacts({ logistics: { time: '4:00 PM' } }, 'Emma & James'))
      .toContain('4:00 PM');
  });
});

describe('robustness', () => {
  it('survives junk shapes without throwing', () => {
    for (const bad of ['a string', 42, [], { events: 'nope', faqs: 5, logistics: null }]) {
      expect(() => smsSiteFacts(bad as never, 'x')).not.toThrow();
    }
  });

  it('skips schedule rows with no name rather than emitting blanks', () => {
    const facts = smsSiteFacts(
      { logistics: { time: '4pm' }, events: [{ time: '5pm' }, { name: 'Dinner', time: '6pm' }] },
      'x',
    );
    expect(facts).toContain('Dinner');
    expect(facts).not.toMatch(/- {2}at 5pm/);
  });
});
