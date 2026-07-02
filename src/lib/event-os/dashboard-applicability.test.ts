import { describe, expect, it } from 'vitest';
import { isDashSurfaceApplicable } from './dashboard-applicability';
import { getEventType } from './event-types';

describe('isDashSurfaceApplicable', () => {
  it('shows everything when occasion is unknown', () => {
    for (const surface of ['registry', 'seating', 'music', 'weekend']) {
      expect(isDashSurfaceApplicable(surface, null)).toBe(true);
      expect(isDashSurfaceApplicable(surface, undefined)).toBe(true);
      expect(isDashSurfaceApplicable(surface, 'not-a-real-occasion')).toBe(true);
    }
  });

  it('treats unmapped surfaces as universal', () => {
    expect(isDashSurfaceApplicable('roster', 'bachelor-party')).toBe(true);
    expect(isDashSurfaceApplicable('keepsakes', 'memorial')).toBe(true);
    expect(isDashSurfaceApplicable('analytics', 'funeral')).toBe(true);
  });

  it('hides registry where the registry block is hidden', () => {
    // Bachelor parties hide the registry block in EVENT_TYPES.
    expect(isDashSurfaceApplicable('registry', 'bachelor-party')).toBe(false);
    expect(isDashSurfaceApplicable('registry', 'bachelorette-party')).toBe(false);
    // Weddings keep it; memorials keep it (donation-in-lieu).
    expect(isDashSurfaceApplicable('registry', 'wedding')).toBe(true);
    expect(isDashSurfaceApplicable('registry', 'memorial')).toBe(true);
  });

  it('hides seating for trip / open-house occasions only', () => {
    expect(isDashSurfaceApplicable('seating', 'bachelor-party')).toBe(false);
    expect(isDashSurfaceApplicable('seating', 'housewarming')).toBe(false);
    // Seated-dinner formats keep it.
    expect(isDashSurfaceApplicable('seating', 'wedding')).toBe(true);
    expect(isDashSurfaceApplicable('seating', 'rehearsal-dinner')).toBe(true);
    expect(isDashSurfaceApplicable('seating', 'reunion')).toBe(true);
    expect(isDashSurfaceApplicable('seating', 'memorial')).toBe(true);
  });

  it('follows the spotify block for music', () => {
    expect(isDashSurfaceApplicable('music', 'wedding')).toBe(true);
    // Solemn occasions hide spotify in the registry.
    // Derive expectation from the registry rather than hardcoding,
    // so a deliberate registry change doesn't break this test.
    const funeralHidesSpotify = (getEventType('funeral')?.hiddenBlocks ?? []).includes('spotify');
    expect(isDashSurfaceApplicable('music', 'funeral')).toBe(!funeralHidesSpotify);
  });

  it('offers the weekend builder to every occasion inside a weekend arc', () => {
    // Anchors…
    expect(isDashSurfaceApplicable('weekend', 'wedding')).toBe(true);
    expect(isDashSurfaceApplicable('weekend', 'quinceanera')).toBe(true);
    expect(isDashSurfaceApplicable('weekend', 'reunion')).toBe(true);
    expect(isDashSurfaceApplicable('weekend', 'milestone-birthday')).toBe(true);
    // …and satellites (a rehearsal-dinner host is mid-arc).
    expect(isDashSurfaceApplicable('weekend', 'rehearsal-dinner')).toBe(true);
    expect(isDashSurfaceApplicable('weekend', 'brunch')).toBe(true);
    // Occasions with no arc stay out.
    expect(isDashSurfaceApplicable('weekend', 'memorial')).toBe(false);
    expect(isDashSurfaceApplicable('weekend', 'baby-shower')).toBe(false);
  });

  it('keeps party furniture off solemn dashboards', () => {
    for (const surface of ['passport', 'qr', 'director', 'cadence']) {
      expect(isDashSurfaceApplicable(surface, 'memorial'), surface).toBe(false);
      expect(isDashSurfaceApplicable(surface, 'funeral'), surface).toBe(false);
      expect(isDashSurfaceApplicable(surface, 'wedding'), surface).toBe(true);
      expect(isDashSurfaceApplicable(surface, 'birthday'), surface).toBe(true);
    }
  });

  it('payments follows the registry block (same money surface)', () => {
    expect(isDashSurfaceApplicable('payments', 'bachelor-party')).toBe(false);
    expect(isDashSurfaceApplicable('payments', 'wedding')).toBe(true);
    expect(isDashSurfaceApplicable('payments', 'memorial')).toBe(true);
  });
});

// Grief exemption lives in plan-gate but is occasion logic — tested
// here alongside the other occasion-driven gates.
import { isGriefExempt, GRIEF_EXEMPT_OCCASIONS } from '@/lib/plan-gate';

describe('isGriefExempt', () => {
  it('exempts memorial and funeral, case-insensitively', () => {
    expect(isGriefExempt('memorial')).toBe(true);
    expect(isGriefExempt('funeral')).toBe(true);
    expect(isGriefExempt(' Memorial ')).toBe(true);
  });
  it('does not exempt celebrations or unknowns', () => {
    expect(isGriefExempt('wedding')).toBe(false);
    expect(isGriefExempt('birthday')).toBe(false);
    expect(isGriefExempt(null)).toBe(false);
    expect(isGriefExempt(undefined)).toBe(false);
    expect(isGriefExempt('')).toBe(false);
  });
  it('covers exactly the promised occasions', () => {
    expect([...GRIEF_EXEMPT_OCCASIONS].sort()).toEqual(['funeral', 'memorial']);
  });
});
