// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/seed-event-details.ts
//
// The wizard's "event-details" step captures a handful of
// occasion-specific answers — days for multi-day trips, the
// livestream URL and donation line for memorials, the school
// for graduations.
//
// This helper takes the freshly-generated manifest block list
// and mutates it so those answers end up as real block config,
// not just metadata the server throws away. It runs once, right
// after getDefaultBlocks() during generation.
// ─────────────────────────────────────────────────────────────

import type { PageBlock } from '@/types';

export interface EventDetails {
  days?: number;
  livestreamUrl?: string;
  inMemoryOf?: string;
  school?: string;
}

/**
 * Mutates blocks in place, seeding block configs based on the
 * optional event-details answers from the wizard. Safe to call
 * when eventDetails is undefined or empty — it no-ops.
 *
 * Returns the same array reference for convenience.
 */
export function seedBlocksFromEventDetails(
  blocks: PageBlock[],
  occasion: string | undefined,
  details: EventDetails | undefined,
  names?: [string, string],
): PageBlock[] {
  if (!details || !occasion) return blocks;

  // Multi-day events get an itinerary skeleton — one card per
  // day with an empty slots array. Hosts fill the slots in the
  // editor; without this they'd land on an empty dashed strip.
  if (
    details.days &&
    details.days > 0 &&
    (occasion === 'bachelor-party' ||
      occasion === 'bachelorette-party' ||
      occasion === 'reunion' ||
      occasion === 'welcome-party')
  ) {
    const itinerary = blocks.find((b) => b.type === 'itinerary');
    if (itinerary) {
      const entries = Array.from({ length: details.days }, (_, i) => ({
        day: `Day ${i + 1}`,
        time: '',
        title: '',
        location: '',
        detail: '',
      }));
      itinerary.config = {
        ...(itinerary.config ?? {}),
        entries,
      };
    }
  }

  // Memorial / funeral: pre-fill the livestream block's URL if
  // provided, and the obituary's in-memory-of line.
  if (occasion === 'memorial' || occasion === 'funeral') {
    if (details.livestreamUrl) {
      const livestream = blocks.find((b) => b.type === 'livestream');
      if (livestream) {
        livestream.config = {
          ...(livestream.config ?? {}),
          url: details.livestreamUrl,
          title: (livestream.config?.title as string) || 'Watch the service',
        };
      }
    }
    if (details.inMemoryOf) {
      const obituary = blocks.find((b) => b.type === 'obituary');
      if (obituary) {
        obituary.config = {
          ...(obituary.config ?? {}),
          inMemoryOf: details.inMemoryOf,
          // Seed the name from the wizard's names[0] so the
          // memorial doesn't render the empty "In loving memory"
          // fallback out of the gate.
          name: (obituary.config?.name as string) || names?.[0] || '',
        };
      }
    }
  }

  // Graduation: pre-fill the hero subtitle with the school name,
  // and seed a matching "welcome" block body if present.
  if (occasion === 'graduation' && details.school) {
    const hero = blocks.find((b) => b.type === 'hero');
    if (hero) {
      hero.config = {
        ...(hero.config ?? {}),
        subtitle:
          (hero.config?.subtitle as string) || `Class of the ${details.school}`,
      };
    }
    const welcome = blocks.find((b) => b.type === 'welcome');
    if (welcome && !welcome.config?.text) {
      welcome.config = {
        ...(welcome.config ?? {}),
        text: `Celebrating a graduate of ${details.school}.`,
      };
    }
  }

  return blocks;
}
