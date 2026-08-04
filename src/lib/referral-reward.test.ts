// ─────────────────────────────────────────────────────────────
// referral-reward — what a referral earns.
//
// A reward loop is where a product most easily starts lying: to the
// referrer (implying a grant that's capped out), or to itself
// (paying for signups that never became anything). These tests pin
// the three rules that keep it honest:
//
//   1. ACTIVATION, not signup — an empty account earns nothing, and
//      self-referral is refused outright.
//   2. The cap is real, and the copy is honest when it bites.
//   3. The grant is archive ONLY — never the things we sell.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  referralOutcome,
  referralQualifies,
  referralThanks,
  inheritedLookFrom,
  ARCHIVE_YEARS_PER_REFERRAL,
  MAX_REFERRAL_ARCHIVE_YEARS,
} from './referral-reward';

describe('rule 1 — activation, not signup', () => {
  it('qualifies only when the new host actually published', () => {
    expect(referralQualifies({
      referrerEmail: 'a@x.test', newHostEmail: 'b@x.test', newSitePublished: true,
    })).toBe(true);
    expect(referralQualifies({
      referrerEmail: 'a@x.test', newHostEmail: 'b@x.test', newSitePublished: false,
    })).toBe(false);
  });

  it('REFUSES self-referral — the obvious abuse', () => {
    expect(referralQualifies({
      referrerEmail: 'a@x.test', newHostEmail: 'a@x.test', newSitePublished: true,
    })).toBe(false);
    // Case and whitespace must not defeat it.
    expect(referralQualifies({
      referrerEmail: ' A@X.test ', newHostEmail: 'a@x.test', newSitePublished: true,
    })).toBe(false);
  });

  it('refuses when either party is unknown', () => {
    expect(referralQualifies({ referrerEmail: null, newHostEmail: 'b@x.test', newSitePublished: true })).toBe(false);
    expect(referralQualifies({ referrerEmail: 'a@x.test', newHostEmail: '', newSitePublished: true })).toBe(false);
  });
});

describe('rule 2 — the cap is real', () => {
  it('grants a year at a time', () => {
    const first = referralOutcome(0);
    expect(first.archiveYearsGranted).toBe(ARCHIVE_YEARS_PER_REFERRAL);
    expect(first.totalArchiveYears).toBe(1);
    expect(first.cappedOut).toBe(false);
  });

  it('stops at the ceiling rather than compounding into free hosting', () => {
    const atCap = referralOutcome(MAX_REFERRAL_ARCHIVE_YEARS);
    expect(atCap.archiveYearsGranted).toBe(0);
    expect(atCap.totalArchiveYears).toBe(MAX_REFERRAL_ARCHIVE_YEARS);
    expect(atCap.cappedOut).toBe(true);
  });

  it('never overshoots the ceiling on the last partial grant', () => {
    const near = referralOutcome(MAX_REFERRAL_ARCHIVE_YEARS - 1);
    expect(near.totalArchiveYears).toBe(MAX_REFERRAL_ARCHIVE_YEARS);
    expect(near.cappedOut).toBe(false);
  });

  it('treats nonsense balances as zero rather than granting from them', () => {
    for (const bad of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = referralOutcome(bad as number);
      expect(r.totalArchiveYears).toBeLessThanOrEqual(MAX_REFERRAL_ARCHIVE_YEARS);
      expect(r.totalArchiveYears).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('rule 2b — the copy is honest when the cap bites', () => {
  it('does not imply a grant that is not coming', () => {
    const msg = referralThanks(referralOutcome(MAX_REFERRAL_ARCHIVE_YEARS), 'Sam');
    expect(msg).toContain('Sam');
    // No promise of added time when none was added.
    expect(msg).not.toMatch(/added a year|years in all/i);
    expect(msg).toMatch(/thank you/i);
  });

  it('names the real total when a year was granted', () => {
    expect(referralThanks(referralOutcome(0), 'Sam')).toMatch(/1 year in all/);
    expect(referralThanks(referralOutcome(1), 'Sam')).toMatch(/2 years in all/);
  });

  it('reads fine without a name', () => {
    const msg = referralThanks(referralOutcome(0), null);
    expect(msg).not.toMatch(/undefined|null/);
    expect(msg.startsWith('Someone')).toBe(true);
  });
});

describe('rule 3 — the new host inherits a look, not a coupon', () => {
  it('carries the referring site’s theme', () => {
    expect(inheritedLookFrom({ themeId: 'garden', kitId: 'plate' }))
      .toEqual({ themeId: 'garden', kitId: 'plate' });
    expect(inheritedLookFrom({ themeId: 'garden' })).toEqual({ themeId: 'garden' });
  });

  it('returns null when there is nothing to inherit, so the wizard uses its own default', () => {
    expect(inheritedLookFrom(null)).toBeNull();
    expect(inheritedLookFrom(undefined)).toBeNull();
    expect(inheritedLookFrom({})).toBeNull();
    expect(inheritedLookFrom({ themeId: '   ' })).toBeNull();
  });

  it('grants no plan, no entitlement, nothing we sell', () => {
    const look = inheritedLookFrom({ themeId: 'garden', kitId: 'plate' });
    expect(JSON.stringify(look)).not.toMatch(/plan|pass|keepsake|premium|pro|entitle|credit/i);
  });
});
