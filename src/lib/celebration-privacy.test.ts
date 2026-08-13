// ─────────────────────────────────────────────────────────────
// celebration-privacy — the shedding guard.
//
// The failure this module exists to prevent: a container-wide
// roster carrying the bachelorette guest list to the
// mother-of-the-bride, or a private rehearsal RSVP surfacing on a
// ceremony passport. These tests pin the two properties that make
// that impossible:
//
//   1. SAFE BY DEFAULT — a sensitive event is private without the
//      host ever knowing the setting exists.
//   2. UNRECOGNIZED INPUT NEVER OPENS — a typo, a stray value, or
//      a missing field falls back to the default; it can never
//      silently mark a private event shared.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  rosterScopeFor,
  defaultRosterScopeFor,
  isSensitiveOccasion,
  participatesInSharedRoster,
  partitionByScope,
  privateScopeReason,
  SENSITIVE_OCCASIONS,
} from './celebration-privacy';

describe('defaults — safe without the host knowing the setting exists', () => {
  it('bachelor and bachelorette parties are private by default', () => {
    expect(defaultRosterScopeFor('bachelor-party')).toBe('private');
    expect(defaultRosterScopeFor('bachelorette-party')).toBe('private');
    // …and with no celebration block at all.
    expect(rosterScopeFor({ occasion: 'bachelorette-party' })).toBe('private');
  });

  it('ordinary events share by default', () => {
    for (const occasion of ['wedding', 'rehearsal-dinner', 'brunch', 'welcome-party', 'baby-shower']) {
      expect(defaultRosterScopeFor(occasion), occasion).toBe('shared');
    }
  });

  it('SENSITIVE_OCCASIONS is non-empty and recognized case-insensitively', () => {
    expect(SENSITIVE_OCCASIONS.size).toBeGreaterThan(0);
    expect(isSensitiveOccasion('Bachelor-Party')).toBe(true);
    expect(isSensitiveOccasion('wedding')).toBe(false);
    expect(isSensitiveOccasion(null)).toBe(false);
    expect(isSensitiveOccasion(undefined)).toBe(false);
  });
});

describe('explicit host choice wins', () => {
  it('a host can open a sensitive event into the shared roster', () => {
    expect(
      rosterScopeFor({
        occasion: 'bachelorette-party',
        celebration: { id: 'c1', rosterScope: 'shared' },
      }),
    ).toBe('shared');
  });

  it('a host can close an ordinary event', () => {
    expect(
      rosterScopeFor({
        occasion: 'rehearsal-dinner',
        celebration: { id: 'c1', rosterScope: 'private' },
      }),
    ).toBe('private');
  });

  it('the legacy linkVisible:false opt-out implies a private roster', () => {
    // The host already said "don't advertise this event" — that
    // intent extends to not pooling its guests.
    expect(
      rosterScopeFor({ occasion: 'wedding', celebration: { id: 'c1', linkVisible: false } }),
    ).toBe('private');
    // linkVisible:true is not an override — it only governs the strip.
    expect(
      rosterScopeFor({ occasion: 'bachelor-party', celebration: { id: 'c1', linkVisible: true } }),
    ).toBe('private');
  });
});

describe('unrecognized input never opens a private event', () => {
  it('a bad rosterScope value falls back to the occasion default', () => {
    for (const bad of ['Shared', 'SHARED', 'public', 'yes', 'true', '', ' ', 'privatee']) {
      expect(
        rosterScopeFor({
          occasion: 'bachelor-party',
          celebration: { id: 'c1', rosterScope: bad },
        }),
        `rosterScope=${JSON.stringify(bad)} must not open a sensitive event`,
      ).toBe('private');
    }
  });

  it('null/undefined inputs resolve without throwing', () => {
    expect(rosterScopeFor(null)).toBe('shared');
    expect(rosterScopeFor(undefined)).toBe('shared');
    expect(rosterScopeFor({})).toBe('shared');
    expect(rosterScopeFor({ occasion: null, celebration: null })).toBe('shared');
  });

  it('an unknown occasion shares (it is not sensitive) but a bad scope still cannot open a known-sensitive one', () => {
    expect(rosterScopeFor({ occasion: 'made-up-occasion' })).toBe('shared');
    expect(
      rosterScopeFor({ occasion: 'bachelorette-party', celebration: { rosterScope: 'nonsense' } }),
    ).toBe('private');
  });
});

describe('partitionByScope — what the roster union may read', () => {
  it('splits a real weekend arc correctly', () => {
    const arc = [
      { subdomain: 'emma-james', occasion: 'wedding' },
      { subdomain: 'emma-shower', occasion: 'bridal-shower' },
      { subdomain: 'emma-bach', occasion: 'bachelorette-party' },
      { subdomain: 'the-rehearsal', occasion: 'rehearsal-dinner' },
      { subdomain: 'quiet-one', occasion: 'brunch', celebration: { rosterScope: 'private' as const } },
    ];
    const { shared, private: priv } = partitionByScope(arc);
    expect(shared.map((e) => e.subdomain)).toEqual(['emma-james', 'emma-shower', 'the-rehearsal']);
    expect(priv.map((e) => e.subdomain)).toEqual(['emma-bach', 'quiet-one']);
  });

  it('participatesInSharedRoster agrees with the partition', () => {
    const events = [
      { occasion: 'wedding' },
      { occasion: 'bachelor-party' },
    ];
    const { shared, private: priv } = partitionByScope(events);
    expect(shared.every(participatesInSharedRoster)).toBe(true);
    expect(priv.some(participatesInSharedRoster)).toBe(false);
  });

  it('an empty arc partitions cleanly', () => {
    expect(partitionByScope([])).toEqual({ shared: [], private: [] });
  });
});

describe('host-facing reason', () => {
  it('names the default for sensitive occasions and the choice otherwise', () => {
    expect(privateScopeReason('bachelor-party')).toMatch(/default/i);
    expect(privateScopeReason('brunch')).toMatch(/you set/i);
  });

  it('stays plain — no jargon a first-time host would have to decode', () => {
    for (const occasion of ['bachelor-party', 'brunch']) {
      const reason = privateScopeReason(occasion);
      expect(reason).not.toMatch(/scope|roster|manifest|container|satellite/i);
      expect(reason.length).toBeLessThan(120);
    }
  });
});
