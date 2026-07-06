// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/budget-categories.ts
//
// Occasion-aware default budget categories (GRAND-PLAN Phase 0). When
// a host opens the budget for a fresh site, we seed the categories
// that actually fit their event — a bachelor trip plans Lodging /
// Travel / Activities, a wedding plans Venue / Catering / Attire, a
// memorial plans Flowers / Program. Routed off the EVENT_TYPES
// registry's `category` (one of wedding-arc | cultural | commemoration
// | milestone | family) with per-occasion overrides for the
// trip-shaped events.
//
// Plain words the host already has (BRAND §7) — never craft jargon.
// These are DEFAULTS: the host adds/removes/renames freely.
// ─────────────────────────────────────────────────────────────

import { getEventType } from './event-types';
import type { SiteOccasion } from '@/lib/site-urls';

// Participant-is-payer trips (Pillar 2 group-split shape).
const TRIP = ['Lodging', 'Travel', 'Food & drink', 'Activities', 'Transport', 'Gifts'];
// Full wedding / vow renewal.
const WEDDING = ['Venue', 'Catering', 'Photography', 'Attire', 'Flowers', 'Music', 'Cake', 'Stationery', 'Rentals'];
// A single-honoree party or gathering.
const PARTY = ['Venue', 'Food & drink', 'Cake', 'Decorations', 'Entertainment', 'Favors'];
// Showers.
const SHOWER = ['Venue', 'Food & drink', 'Decorations', 'Games & favors', 'Gifts'];
// Cultural / religious ceremonies.
const CEREMONY = ['Venue', 'Catering', 'Attire', 'Flowers', 'Photography', 'Officiant'];
// Commemoration — gathered, not celebrated (BRAND §6.6 tone).
const MEMORIAL = ['Venue', 'Catering', 'Flowers', 'Program & printing', 'Officiant'];
// Last resort.
const DEFAULT = ['Venue', 'Food & drink', 'Decorations', 'Photography', 'Other'];

// Per-occasion overrides where the registry `category` isn't specific
// enough (a bachelor party is `wedding-arc` but plans like a trip; a
// shower is `wedding-arc`/`family` but plans like a shower).
const BY_OCCASION: Partial<Record<SiteOccasion, string[]>> = {
  'bachelor-party': TRIP,
  'bachelorette-party': TRIP,
  'reunion': TRIP,
  'vow-renewal': WEDDING,
  'bridal-shower': SHOWER,
  'baby-shower': SHOWER,
  'engagement': PARTY,
  'birthday': PARTY,
  'milestone-birthday': PARTY,
  'sweet-sixteen': PARTY,
  'retirement': PARTY,
  'graduation': PARTY,
  'anniversary': PARTY,
  'housewarming': PARTY,
  'gender-reveal': PARTY,
  'sip-and-see': SHOWER,
};

/** Default budget categories for an occasion. Always returns a
 *  non-empty list; unknown occasions fall back to a generic set. */
export function budgetCategoriesFor(occasion?: string | null): string[] {
  const key = (occasion ?? '') as SiteOccasion;
  const override = BY_OCCASION[key];
  if (override) return [...override];

  const et = getEventType((occasion ?? null) as SiteOccasion | null);
  switch (et?.category) {
    case 'wedding-arc':
      return [...WEDDING];
    case 'cultural':
      return [...CEREMONY];
    case 'commemoration':
      return [...MEMORIAL];
    case 'milestone':
    case 'family':
      return [...PARTY];
    default:
      return [...DEFAULT];
  }
}
