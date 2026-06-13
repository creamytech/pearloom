// ─────────────────────────────────────────────────────────────
// Auto-Draft — Pear pre-fills every empty section after wizard
// generation so hosts arrive at a complete site they refine,
// not an empty shell they assemble.
//
// Design: each section type gets a Drafter — a pure function
// that takes (occasion, voice, dateInfo, venue, names, vibes)
// and returns sensible starter content. The runAutoDraft
// helper composes them and stamps `manifest.draftedByPear[*]`
// flags so the editor can show "Pear drafted this" affordances.
//
// Drafters never overwrite host content. If the section already
// has user data, the drafter returns null and runAutoDraft skips
// it. Only empty sections get filled.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { SiteOccasion } from '@/lib/site-urls';
import type { EventVoice } from '@/lib/event-os/event-types';

/** Context passed to every Drafter. Loose by design so future
 *  drafters can ignore fields they don't need. */
export interface DraftContext {
  occasion: SiteOccasion;
  voice: EventVoice;
  /** Names from manifest.names[0..1]. */
  names: [string, string];
  /** ISO date string from manifest.logistics.date, or null. */
  eventDate: string | null;
  /** Hour 0-23 from manifest.logistics.time, or null. */
  eventHour: number | null;
  /** Venue label from manifest.logistics.venue, or null. */
  venue: string | null;
  /** Vibes selected in the wizard. May be empty. */
  vibes: string[];
}

/** A Drafter — takes context, returns a partial manifest patch
 *  to merge in (the keys it wants to populate), or null to skip
 *  if the section already has content. */
export type Drafter = (
  ctx: DraftContext,
  existing: StoryManifest,
) => Partial<StoryManifest> | null;

/** The keys runAutoDraft can fill. Each maps to one Drafter. */
export type DraftableSection = 'schedule' | 'faq' | 'travel' | 'registry' | 'details';
