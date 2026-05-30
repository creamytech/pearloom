// ─────────────────────────────────────────────────────────────
// Auto-Draft — entry point. Composes the per-section drafters
// into a single runAutoDraft() the generation pipeline calls
// after the AI passes finish. Skips sections that already have
// host content; stamps manifest.draftedByPear[*] for everything
// it fills so the editor can show a "Pear drafted this" banner.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { SiteOccasion } from '@/lib/site-urls';
import type { EventVoice } from '@/lib/event-os/event-types';
import { getEventType } from '@/lib/event-os/event-types';
import type { DraftContext, Drafter, DraftableSection } from './types';
import { draftSchedule } from './schedule';
import { draftFaq } from './faq';
import { draftRegistry } from './registry';
import { draftTravel } from './travel';
import { draftDetails } from './details';

const DRAFTERS: Record<DraftableSection, Drafter> = {
  schedule: draftSchedule,
  faq: draftFaq,
  registry: draftRegistry,
  travel: draftTravel,
  details: draftDetails,
};

/** Builds the DraftContext from a manifest. */
function contextFromManifest(manifest: StoryManifest): DraftContext | null {
  const occasion = (manifest as unknown as { occasion?: string }).occasion as SiteOccasion | undefined;
  if (!occasion) return null;
  const eventType = getEventType(occasion);
  const voice: EventVoice = eventType?.voice ?? 'celebratory';
  const names = (manifest.names as [string, string] | undefined) ?? ['', ''];
  const eventDate = manifest.logistics?.date ?? null;
  // Parse time field — supports "16:00", "4:00 PM", or null.
  let eventHour: number | null = null;
  const timeStr = manifest.logistics?.time;
  if (typeof timeStr === 'string') {
    const match = timeStr.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?$/);
    if (match) {
      let h = parseInt(match[1] ?? '0', 10);
      const m = parseInt(match[2] ?? '0', 10);
      const ampm = (match[3] ?? '').toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      eventHour = h + m / 60;
    }
  }
  const venue = manifest.logistics?.venue ?? null;
  const vibes = (manifest.vibeString ?? '').split(',').map((v) => v.trim()).filter(Boolean);
  return { occasion, voice, names, eventDate, eventHour, venue, vibes };
}

/** Runs every drafter against the manifest, merging results in.
 *  Stamps manifest.draftedByPear[section] = true for every
 *  section a drafter filled. Sections with existing host content
 *  are skipped (drafter returns null). */
export function runAutoDraft(manifest: StoryManifest): StoryManifest {
  const ctx = contextFromManifest(manifest);
  if (!ctx) return manifest;
  let next: StoryManifest = manifest;
  const drafted: Record<string, boolean> = {
    ...(manifest.draftedByPear ?? {}),
  };
  for (const [section, drafter] of Object.entries(DRAFTERS) as Array<[DraftableSection, Drafter]>) {
    const patch = drafter(ctx, next);
    if (!patch) continue;
    next = { ...next, ...patch };
    drafted[section] = true;
  }
  return { ...next, draftedByPear: drafted };
}

export type { DraftContext, Drafter, DraftableSection } from './types';
