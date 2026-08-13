import { describe, expect, it } from 'vitest';
import { hasReplied, normaliseRsvpStatus } from './rsvp-status';

// The whole point of this module is that every surface agrees on the
// vocabulary — these cases are the ones that previously drifted
// (DashGuests counted 'confirmed'/'tentative'; the Analytics funnel
// and sites-stats didn't).

describe('normaliseRsvpStatus', () => {
  it('buckets every yes-flavoured status as yes', () => {
    for (const s of ['yes', 'attending', 'confirmed', 'YES', 'Attending', 'CONFIRMED']) {
      expect(normaliseRsvpStatus(s)).toBe('yes');
    }
  });

  it('buckets declines as no', () => {
    for (const s of ['no', 'declined', 'No', 'DECLINED']) {
      expect(normaliseRsvpStatus(s)).toBe('no');
    }
  });

  it('buckets tentative answers as maybe', () => {
    for (const s of ['maybe', 'tentative', 'Maybe', 'TENTATIVE']) {
      expect(normaliseRsvpStatus(s)).toBe('maybe');
    }
  });

  it('treats everything else — including null/undefined/empty — as pending', () => {
    for (const s of ['', 'invited', 'sent', 'unknown', null, undefined]) {
      expect(normaliseRsvpStatus(s)).toBe('pending');
    }
  });
});

describe('hasReplied', () => {
  it('is true for any non-pending bucket', () => {
    expect(hasReplied('yes')).toBe(true);
    expect(hasReplied('declined')).toBe(true);
    expect(hasReplied('tentative')).toBe(true);
  });

  it('is false for pending-shaped values', () => {
    expect(hasReplied('')).toBe(false);
    expect(hasReplied(null)).toBe(false);
    expect(hasReplied('invited')).toBe(false);
  });
});
