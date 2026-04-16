// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/personalize.ts
//
// Generate per-guest personalization using Claude Sonnet.
// Produces: hero copy that speaks TO the guest by name,
// chapter highlights (why *this guest* is mentioned),
// travel tips based on their home city, seat summary.
//
// Cached in guest_personalization to avoid regenerating on
// every page view — refreshed on manifest change.
// ─────────────────────────────────────────────────────────────

import { generateJson, cached } from '@/lib/claude';
import type { PearloomGuest, GuestPersonalization } from './db';
import { getPersonalization, savePersonalization } from './db';
import type { StoryManifest } from '@/types';

export interface PersonalizationPayload {
  hero_copy: string;
  chapter_highlights: Array<{ chapterId: string; whyTheyreMentioned: string }>;
  travel_tips: {
    nearestAirport?: string;
    driveTime?: string;
    recommendedHotels?: Array<{ name: string; url?: string; note?: string }>;
  };
  seat_summary: string;
}

/**
 * Build the personalization payload for a single guest.
 * Uses Claude Sonnet with prompt caching so N guests sharing
 * the same site manifest only pay full cost once.
 */
export async function generateGuestPersonalization(opts: {
  guest: PearloomGuest;
  manifest: StoryManifest;
  coupleNames: [string, string];
  venueCity?: string;
  seatLabel?: string;
  tableNeighbors?: string[];
}): Promise<PersonalizationPayload> {
  const { guest, manifest, coupleNames, venueCity, seatLabel, tableNeighbors } = opts;

  // The manifest prefix is stable across guests -> cacheable.
  const siteContext = JSON.stringify({
    occasion: manifest.occasion,
    coupleNames,
    vibe: manifest.vibeString,
    venue: manifest.logistics?.venue,
    venueAddress: manifest.logistics?.venueAddress,
    date: manifest.logistics?.date,
    chapters: manifest.chapters?.slice(0, 8).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description?.slice(0, 240),
    })),
    events: manifest.events?.slice(0, 4).map((e) => ({
      name: e.name,
      date: e.date,
      time: e.time,
      venue: e.venue,
    })),
  });

  const result = await generateJson<PersonalizationPayload>({
    tier: 'sonnet',
    temperature: 0.7,
    maxTokens: 1400,
    system: cached(
      `You are Pearloom's personalization writer. For each guest you produce copy that feels like it was hand-written for them — never generic. You know the couple, the event, and the guest's details. You write with warmth, humor, and specificity. Never use emojis. Never reference information you were not given.`,
      '1h'
    ) as unknown as string,
    messages: [
      {
        role: 'user',
        content: `SITE CONTEXT (cacheable across all guests):
${siteContext}

GUEST:
${JSON.stringify({
  name: guest.display_name,
  pronunciation: guest.pronunciation,
  relationship: guest.relationship_to_host,
  side: guest.side,
  homeCity: guest.home_city,
  homeCountry: guest.home_country,
  dietary: guest.dietary,
  language: guest.language,
})}

VENUE CITY: ${venueCity || '(unknown)'}
SEAT: ${seatLabel || '(not assigned yet)'}${tableNeighbors?.length ? ` — neighbors: ${tableNeighbors.join(', ')}` : ''}

Generate:
- hero_copy: 1-2 sentences addressed to this guest by first name. Should reference their relationship to the couple or their home city. Example: "Priya — we can't believe it's been eleven years of you picking up the phone at 3am. Thank you for flying in from Bombay."
- chapter_highlights: 1-3 chapters where this guest's context would make the chapter land harder (id + one sentence). Leave empty if nothing fits.
- travel_tips: if home_city differs from venue city, recommend a nearest airport, approximate drive time, and 1-2 hotels. If they live locally, leave blank.
- seat_summary: 1 sentence about their seat + neighbors if assigned, else a friendly placeholder.`,
      },
    ],
    schemaName: 'emit_personalization',
    schema: {
      type: 'object',
      properties: {
        hero_copy: { type: 'string' },
        chapter_highlights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              chapterId: { type: 'string' },
              whyTheyreMentioned: { type: 'string' },
            },
            required: ['chapterId', 'whyTheyreMentioned'],
          },
        },
        travel_tips: {
          type: 'object',
          properties: {
            nearestAirport: { type: 'string' },
            driveTime: { type: 'string' },
            recommendedHotels: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  url: { type: 'string' },
                  note: { type: 'string' },
                },
                required: ['name'],
              },
            },
          },
        },
        seat_summary: { type: 'string' },
      },
      required: ['hero_copy', 'chapter_highlights', 'travel_tips', 'seat_summary'],
    },
  });

  return result;
}

/**
 * Fetch from cache or regenerate. Caches for 24h.
 */
export async function getOrGeneratePersonalization(opts: {
  guest: PearloomGuest;
  manifest: StoryManifest;
  coupleNames: [string, string];
  venueCity?: string;
  seatLabel?: string;
  tableNeighbors?: string[];
  forceRefresh?: boolean;
}): Promise<PersonalizationPayload> {
  const { forceRefresh = false } = opts;

  if (!forceRefresh) {
    const cached = await getPersonalization(opts.guest.id);
    if (cached && cached.hero_copy && cached.expires_at && new Date(cached.expires_at) > new Date()) {
      return {
        hero_copy: cached.hero_copy,
        chapter_highlights: cached.chapter_highlights ?? [],
        travel_tips: cached.travel_tips ?? {},
        seat_summary: cached.seat_summary ?? '',
      };
    }
  }

  const generated = await generateGuestPersonalization(opts);

  await savePersonalization({
    site_id: opts.guest.site_id,
    guest_id: opts.guest.id,
    hero_copy: generated.hero_copy,
    chapter_highlights: generated.chapter_highlights,
    travel_tips: generated.travel_tips,
    seat_summary: generated.seat_summary,
    pronunciation_audio_url: null,
    generated_by: 'claude-sonnet-4-6',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });

  return generated;
}

// Re-export so callers can use the DB type
export type { GuestPersonalization } from './db';
