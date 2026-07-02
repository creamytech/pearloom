// ─────────────────────────────────────────────────────────────
// Travel auto-drafter — fills the Travel section with sensible
// starter copy: a venue intro, parking/transit notes, and 2-3
// placeholder hotel cards the host swaps for real bookings.
//
// Without venue geocoding we can't suggest real hotels, but we
// CAN stub a credible 3-card structure (Budget / Mid / Splurge)
// with empty fields the host fills in. Better than an empty
// section with no scaffold.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { Drafter } from './types';

interface DraftHotel {
  name: string;
  address: string;
  groupRate?: string;
  bookingUrl?: string;
  distance?: string;
}

function hotelTemplatesFor(occasion: string): DraftHotel[] {
  const isMultiDay = ['bachelor-party', 'bachelorette-party', 'reunion'].includes(occasion);
  if (isMultiDay) {
    // Group trips lean toward whole-house rentals + budget hotels.
    return [
      { name: 'The house rental', address: 'Add the Airbnb/VRBO address here', groupRate: 'Split cost: ~$N per person' },
      { name: 'Hotel for the in-and-out crowd', address: 'Address here', groupRate: 'Group rate code: REUNION25' },
    ];
  }
  // Standard 3-tier hotel scaffold for weddings + events.
  return [
    { name: 'The closest', address: 'Address — within walking distance of the venue', groupRate: 'Mention {names} at booking for the group rate' },
    { name: 'A comfortable option', address: 'Address — 10-15 minute drive', groupRate: '' },
    { name: 'Budget-friendly nearby', address: 'Address — short drive or rideshare', groupRate: '' },
  ];
}

function travelNoteFor(occasion: string, venue: string | null): string {
  const venueRef = venue ? `the venue (${venue})` : 'the venue';
  if (occasion === 'memorial' || occasion === 'funeral') {
    return `Anyone travelling — here are a few places to stay near ${venueRef}, and a note on parking. Reach out to the family if you need help with logistics.`;
  }
  if (occasion === 'bachelor-party' || occasion === 'bachelorette-party' || occasion === 'reunion') {
    return `We've sorted accommodations together — see below for where everyone's staying and how to get there.`;
  }
  return `If you're travelling in, here are a few hotels near ${venueRef} and a quick note on parking + getting there.`;
}

export const draftTravel: Drafter = (ctx, existing) => {
  const existingTravel = existing.travelInfo;
  // Skip if hotels already populated. Empty/absent fields below
  // are what we fill — never overwrite real travel data.
  if (existingTravel?.hotels && existingTravel.hotels.length > 0) return null;

  const hotels = hotelTemplatesFor(ctx.occasion);
  const intro = travelNoteFor(ctx.occasion, ctx.venue);

  return {
    travelInfo: {
      ...(existingTravel ?? {}),
      intro,
      hotels: hotels.map((h) => ({
        name: h.name,
        address: h.address,
        groupRate: h.groupRate ?? '',
        bookingUrl: h.bookingUrl ?? '',
        distance: h.distance ?? '',
      })),
    } as StoryManifest['travelInfo'],
  };
};
