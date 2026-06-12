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

  it('plus-ones pick lands on rsvpConfig and answers the FAQ', () => {
    const out = loose(seedSectionsFromWizard(base(), { plusOnes: false }));
    expect((out.rsvpConfig as { plusOnes: boolean }).plusOnes).toBe(false);
    const faqs = out.faqs as Array<{ question: string; answer: string }>;
    const q = faqs.find((f) => /plus.?one|bring (a guest|someone)/i.test(f.question));
    expect(q?.answer).toContain('invited guests only');
  });

  it('party names become weddingParty members with the occasion role', () => {
    const out = loose(
      seedSectionsFromWizard(base(), { partyNames: ['Maya', 'Jo'], partyRole: 'Court of honor' }),
    );
    const wp = out.weddingParty as Array<{ name: string; customRole: string }>;
    expect(wp.map((m) => m.name)).toEqual(['Maya', 'Jo']);
    expect(wp[0].customRole).toBe('Court of honor');
    expect(out.blockOrder).toContain('honorList');
  });

  it('never clobbers an existing wedding party', () => {
    const out = loose(
      seedSectionsFromWizard(base({ weddingParty: [{ id: 'x', name: 'Existing' }] }), {
        partyNames: ['Maya'],
      }),
    );
    expect((out.weddingParty as Array<{ name: string }>).map((m) => m.name)).toEqual(['Existing']);
  });

  it('registry link becomes a named entry', () => {
    const out = loose(seedSectionsFromWizard(base(), { registryUrl: 'https://www.zola.com/registry/us' }));
    const reg = out.registry as { enabled: boolean; entries: Array<{ name: string; url: string }> };
    expect(reg.enabled).toBe(true);
    expect(reg.entries[0].name).toBe('Zola');
  });
});

describe('seedSectionsFromWizard — monogram', () => {
  it('seeds an occasion-framed monogram so the nav never defaults to the pear glyph', () => {
    const wedding = loose(seedSectionsFromWizard(base()));
    expect((wedding.monogram as { frame: string }).frame).toBe('laurel');
    const reunion = loose(seedSectionsFromWizard(base({ occasion: 'reunion' })));
    expect((reunion.monogram as { frame: string }).frame).toBe('ring');
    const memorial = loose(seedSectionsFromWizard(base({ occasion: 'memorial' })));
    expect((memorial.monogram as { frame: string }).frame).toBe('none');
  });

  it('never clobbers a configured crest', () => {
    const out = loose(seedSectionsFromWizard(base({ monogram: { initials: 'XO', frame: 'diamond' } })));
    expect((out.monogram as { frame: string }).frame).toBe('diamond');
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
