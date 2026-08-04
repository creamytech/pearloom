// ─────────────────────────────────────────────────────────────
// doorway/referral — guest→host attribution.
//
// Two properties matter:
//   1. PRIVACY — the marker is a site slug, never a guest. A
//      referral link gets forwarded and pasted into group chats.
//   2. HONESTY OF THE METRIC — first-wins so a later ref-less
//      visit can't erase attribution, and cleared after use so a
//      host's SECOND site isn't credited to a months-old referral.
//      A growth metric that over-counts is worse than none.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import {
  readReferralParam,
  captureReferral,
  storedReferral,
  clearReferral,
  sanitizeReferral,
  REFERRAL_STORAGE_KEY,
} from './referral';

beforeEach(() => {
  window.localStorage.clear();
});

describe('readReferralParam — validated, never trusted', () => {
  it('reads a plausible site slug', () => {
    expect(readReferralParam('?ref=emma-and-james')).toBe('emma-and-james');
    expect(readReferralParam('ref=emma-and-james')).toBe('emma-and-james');
    expect(readReferralParam('?a=1&ref=site2&b=2')).toBe('site2');
  });

  it('lowercases', () => {
    expect(readReferralParam('?ref=Emma-And-James')).toBe('emma-and-james');
  });

  it('rejects anything that is not a slug — this value reaches analytics', () => {
    for (const bad of [
      '?ref=<script>alert(1)</script>',
      '?ref=../../etc/passwd',
      '?ref=has spaces',
      '?ref=-leading-dash',
      `?ref=${'x'.repeat(200)}`,
      '?ref=',
      '?other=emma',
    ]) {
      expect(readReferralParam(bad), bad).toBeNull();
    }
  });

  it('degrades safely on empty/absent input', () => {
    expect(readReferralParam(null)).toBeNull();
    expect(readReferralParam(undefined)).toBeNull();
    expect(readReferralParam('')).toBeNull();
  });
});

describe('captureReferral — first wins', () => {
  it('stores an incoming marker', () => {
    expect(captureReferral('?ref=emma-and-james')).toBe('emma-and-james');
    expect(storedReferral()).toBe('emma-and-james');
  });

  it('does NOT overwrite an earlier attribution', () => {
    captureReferral('?ref=first-site');
    // The host wanders the marketing site, then comes back with a
    // different (or no) ref — the original credit stands.
    expect(captureReferral('?ref=second-site')).toBe('first-site');
    expect(captureReferral('')).toBe('first-site');
    expect(storedReferral()).toBe('first-site');
  });

  it('stores nothing when there is no marker', () => {
    expect(captureReferral('?utm_source=x')).toBeNull();
    expect(storedReferral()).toBeNull();
  });

  it('ignores a corrupted stored value rather than propagating it', () => {
    window.localStorage.setItem(REFERRAL_STORAGE_KEY, '<script>');
    expect(storedReferral()).toBeNull();
    // …and a fresh capture can still take hold.
    expect(captureReferral('?ref=clean-site')).toBe('clean-site');
  });
});

describe('clearReferral — the metric must not over-count', () => {
  it('clears after use, so a second site is not credited to an old referral', () => {
    captureReferral('?ref=emma-and-james');
    clearReferral();
    expect(storedReferral()).toBeNull();
  });

  it('is safe to call when nothing is stored', () => {
    expect(() => clearReferral()).not.toThrow();
  });
});

describe('sanitizeReferral — the server side', () => {
  it('accepts a slug and rejects everything else', () => {
    expect(sanitizeReferral('emma-and-james')).toBe('emma-and-james');
    expect(sanitizeReferral('  Emma-And-James ')).toBe('emma-and-james');
    expect(sanitizeReferral('drop table sites')).toBeNull();
    expect(sanitizeReferral(42)).toBeNull();
    expect(sanitizeReferral(null)).toBeNull();
    expect(sanitizeReferral(undefined)).toBeNull();
    expect(sanitizeReferral({ slug: 'x' })).toBeNull();
  });
});

describe('privacy — a referral never carries a person', () => {
  it('the stored marker is a site slug with no guest identity in it', () => {
    captureReferral('?ref=emma-and-james&g=secret-guest-token');
    const stored = storedReferral();
    expect(stored).toBe('emma-and-james');
    expect(stored).not.toMatch(/secret-guest-token/);
  });
});
