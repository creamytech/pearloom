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

describe('seedSectionsFromWizard — the extras', () => {
  it('countdown joins the block order without disturbing an explicit one', () => {
    const out = loose(seedSectionsFromWizard(base(), { wantsCountdown: true }));
    expect(out.blockOrder).toContain('countdown');
    const out2 = loose(
      seedSectionsFromWizard(base({ blockOrder: ['story', 'countdown', 'rsvp'] }), { wantsCountdown: true }),
    );
    expect(out2.blockOrder).toEqual(['story', 'countdown', 'rsvp']);
  });

  it('playlist becomes the Music embed with a detected provider', () => {
    const out = loose(
      seedSectionsFromWizard(base(), { playlistUrl: 'https://open.spotify.com/playlist/abc' }),
    );
    expect((out.music as { provider: string; url: string }).provider).toBe('spotify');
    expect(out.blockOrder).toContain('music');
  });

  it('never clobbers an existing music embed', () => {
    const out = loose(
      seedSectionsFromWizard(base({ music: { provider: 'apple', url: 'https://music.apple.com/x' } }), {
        playlistUrl: 'https://open.spotify.com/playlist/abc',
      }),
    );
    expect((out.music as { url: string }).url).toBe('https://music.apple.com/x');
  });

  it('meals become rsvpConfig.mealOptions in the MealOption shape', () => {
    const out = loose(seedSectionsFromWizard(base(), { meals: ['Beef', 'Vegan'] }));
    const opts = (out.rsvpConfig as { mealOptions: Array<{ id: string; name: string }> }).mealOptions;
    expect(opts.map((o) => o.name)).toEqual(['Beef', 'Vegan']);
  });

  it('registry link becomes a named entry', () => {
    const out = loose(seedSectionsFromWizard(base(), { registryUrl: 'https://www.zola.com/registry/us' }));
    const reg = out.registry as { enabled: boolean; entries: Array<{ name: string; url: string }> };
    expect(reg.enabled).toBe(true);
    expect(reg.entries[0].name).toBe('Zola');
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
