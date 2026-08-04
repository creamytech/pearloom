// ─────────────────────────────────────────────────────────────
// proxy — the doorway contract.
//
// Pearloom's growth loop depends on a stranger reaching a real
// preview of their own event before being asked for an account
// (docs/REVIEW-SYNTHESIS.md §1.5, agreed by all three external
// reviews). That posture lives in ONE list in proxy.ts, and it is
// exactly the kind of thing a well-meaning "lock down the app"
// change quietly reverses.
//
// This test is the fence: if someone adds a creation surface to
// AUTH_REQUIRED_PREFIXES, the signup wall is back and CI says so.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { AUTH_REQUIRED_PREFIXES, MUST_STAY_OPEN_PREFIXES } from './proxy';

/** The same containment rule the proxy applies. */
function isAuthRequired(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

describe('the doorway stays open', () => {
  it('never requires a session for a creation surface', () => {
    for (const prefix of MUST_STAY_OPEN_PREFIXES) {
      expect(isAuthRequired(prefix), `${prefix} must not require auth`).toBe(false);
      expect(isAuthRequired(`${prefix}/anything`), `${prefix}/… must not require auth`).toBe(false);
    }
  });

  it('keeps the wizard, the editor, and the express door open specifically', () => {
    // Spelled out separately from the loop so the intent survives a
    // careless edit to the constant.
    expect(isAuthRequired('/wizard/new')).toBe(false);
    expect(isAuthRequired('/editor/emma-and-james')).toBe(false);
    expect(isAuthRequired('/api/doorway/extract')).toBe(false);
    expect(isAuthRequired('/demo/wedding')).toBe(false);
  });

  it('keeps guest surfaces open — a guest never needs an account to reply', () => {
    expect(isAuthRequired('/g/some-token')).toBe(false);
    expect(isAuthRequired('/a/emma-and-james')).toBe(false);
  });
});

describe('the host dashboard stays closed', () => {
  it('requires a session for every dashboard surface', () => {
    expect(isAuthRequired('/dashboard')).toBe(true);
    expect(isAuthRequired('/dashboard/rsvp')).toBe(true);
    expect(isAuthRequired('/dashboard/profile')).toBe(true);
    expect(isAuthRequired('/templates')).toBe(true);
    expect(isAuthRequired('/vendors')).toBe(true);
  });

  it('matches on path segments, not bare string prefixes', () => {
    // '/dashboards-public' must not be caught by the '/dashboard'
    // entry, and '/wizardry' must not be treated as '/wizard'.
    expect(isAuthRequired('/dashboardsomething')).toBe(false);
    expect(isAuthRequired('/vendors-directory')).toBe(false);
  });
});

describe('the two lists cannot overlap', () => {
  it('no prefix is both required-auth and must-stay-open', () => {
    for (const open of MUST_STAY_OPEN_PREFIXES) {
      expect(
        AUTH_REQUIRED_PREFIXES,
        `${open} appears in both lists — the doorway contract is broken`,
      ).not.toContain(open);
    }
  });
});
