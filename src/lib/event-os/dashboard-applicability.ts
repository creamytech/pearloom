// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/dashboard-applicability.ts
//
// Which dashboard surfaces apply to which occasions. The sibling
// of redesign/section-applicability.ts (editor sections) — same
// philosophy: derive from the EVENT_TYPES registry's block
// vocabulary where a natural mapping exists, fall back to a
// conservative occasion judgment where it doesn't, and DEFAULT
// TO SHOWING when the occasion is unknown. Routes themselves
// stay live at their URLs — this only governs what nav, ⌘K, and
// discovery strips advertise, so bookmarks never break.
//
// Consumed by DashSubNav (section tabs), DashCommandPalette
// (destination list), and EventIndexPage (weekend-builder strip).
// ─────────────────────────────────────────────────────────────

import type { BlockType } from '@/types';
import type { SiteOccasion } from '@/lib/site-urls';
import { getEventType, type EventType } from './event-types';

/** Dashboard surfaces that are occasion-shaped. Anything not in
 *  this map (analytics, payments, help, …) is universal. */
export type DashSurfaceId = 'registry' | 'seating' | 'music' | 'weekend';

/** True when the occasion's registry entry allows the block
 *  (i.e. it isn't in hiddenBlocks). */
function blockAllowed(et: EventType, block: BlockType): boolean {
  return !et.hiddenBlocks.includes(block);
}

/** Occasions where a seating chart genuinely doesn't apply —
 *  trips and open-house formats with no seated dinner. Kept
 *  deliberately short: receptions, reunions, and memorials all
 *  legitimately seat tables. */
const NO_SEATING: ReadonlySet<string> = new Set([
  'bachelor-party',
  'bachelorette-party',
  'housewarming',
  'sip-and-see',
]);

const GATES: Record<DashSurfaceId, (et: EventType) => boolean> = {
  // Registry hub (claims, thank-yous) — follows the registry
  // block, which the registry hides for e.g. bachelor parties
  // but keeps for memorials (donation-in-lieu).
  registry: (et) => blockAllowed(et, 'registry'),
  // Playlist triage — follows the spotify block.
  music: (et) => blockAllowed(et, 'spotify'),
  // Seating arranger — judgment list above.
  seating: (et) => !NO_SEATING.has(et.id),
  // Weekend builder — multi-site weekends are a wedding-arc
  // product (rehearsal → ceremony → brunch).
  weekend: (et) => et.category === 'wedding-arc',
};

/**
 * Should this dashboard surface be advertised for the occasion?
 * Unknown occasion / no site selected → true (show everything;
 * hiding is only safe once we know what the event is).
 */
export function isDashSurfaceApplicable(
  surface: DashSurfaceId | string,
  occasion: SiteOccasion | string | null | undefined,
): boolean {
  const gate = (GATES as Record<string, (et: EventType) => boolean>)[surface];
  if (!gate) return true;
  const et = getEventType(occasion ?? null);
  if (!et) return true;
  return gate(et);
}
