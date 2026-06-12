// wizard-seed — the "Guests will ask" quick-collect must land in
// the sections guests actually read, and never clobber existing
// host/AI content.

import { describe, it, expect } from 'vitest';
import { seedSectionsFromWizard, suggestRsvpDeadline } from './wizard-seed';
import type { StoryManifest } from '@/types';

const base = (extra: Record<string, unknown> = {}): StoryManifest =>
  ({
    occasion: 'wedding',
    logistics: { date: '2027-06-12', venue: 'Casa Loma', place: 'Toronto' },
    ...extra,
  } as unknown as StoryManifest);

const loose = (m: StoryManifest) => m as unknown as Record<string, unknown>;

describe('seedSectionsFromWizard — guests-will-ask picks', () => {
  it('seeds wizard hotels into travelInfo.hotels', () => {
    const out = loose(
      seedSectionsFromWizard(base(), {
        hotels: [{ name: 'The Drake', address: '1150 Queen St W' }],
      }),
    );
    const ti = out.travelInfo as { hotels?: Array<{ name: string; address: string }> };
    expect(ti.hotels).toHaveLength(1);
    expect(ti.hotels?.[0].name).toBe('The Drake');
    expect(ti.hotels?.[0].address).toBe('1150 Queen St W');
  });

  it('never clobbers hotels that already exist', () => {
    const out = loose(
      seedSectionsFromWizard(
        base({ travelInfo: { airports: [], hotels: [{ name: 'Existing Inn', address: '' }] } }),
        { hotels: [{ name: 'The Drake', address: '' }] },
      ),
    );
    const ti = out.travelInfo as { hotels: Array<{ name: string }> };
    expect(ti.hotels).toHaveLength(1);
    expect(ti.hotels[0].name).toBe('Existing Inn');
  });

  it("kids policy answers the kids FAQ in the host's words", () => {
    const out = loose(
      seedSectionsFromWizard(base(), { kidsPolicy: 'Adults only' }),
    );
    const faqs = out.faqs as Array<{ question: string; answer: string }>;
    const kids = faqs.find((f) => /kids|children/i.test(f.question));
    expect(kids?.answer).toBe('Adults only');
  });

  it('parking note rides travelInfo.parkingInfo and the details cards', () => {
    const out = loose(
      seedSectionsFromWizard(base(), { parkingNote: 'Free lot behind the venue' }),
    );
    expect((out.travelInfo as { parkingInfo?: string }).parkingInfo).toBe('Free lot behind the venue');
    const cards = out.detailsCards as Array<[string, string]>;
    expect(cards.some(([label, v]) => label === 'Parking' && v === 'Free lot behind the venue')).toBe(true);
  });

  it('first hotel answers the where-to-stay FAQ', () => {
    const out = loose(
      seedSectionsFromWizard(base(), {
        hotels: [{ name: 'The Drake', address: '' }, { name: 'Hotel Ocho', address: '' }],
      }),
    );
    const faqs = out.faqs as Array<{ question: string; answer: string }>;
    const stay = faqs.find((f) => /stay|hotel/i.test(f.question));
    expect(stay?.answer).toContain('The Drake');
    expect(stay?.answer).toContain('Hotel Ocho');
  });
});

describe('suggestRsvpDeadline', () => {
  it('lands ~5 weeks before the date', () => {
    const future = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dl = suggestRsvpDeadline(future);
    expect(dl).toBeTruthy();
    const gap = (Date.parse(future) - Date.parse(dl!)) / 86_400_000;
    expect(Math.round(gap)).toBe(35);
  });

  it('returns null with no date', () => {
    expect(suggestRsvpDeadline(undefined)).toBeNull();
  });
});
