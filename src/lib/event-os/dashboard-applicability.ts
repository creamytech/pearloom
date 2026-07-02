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
import { WEEKEND_ANCHORS } from './weekend-arcs';

/** Dashboard surfaces that are occasion-shaped. Anything not in
 *  this map (analytics, help, …) is universal. */
export type DashSurfaceId =
  | 'registry' | 'seating' | 'music' | 'weekend'
  | 'payments' | 'passport' | 'qr' | 'director' | 'speech' | 'cadence' | 'bridge';

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

/** Every occasion that appears in a weekend arc — anchors AND
 *  satellites (a rehearsal-dinner host is mid-arc and should still
 *  find the builder). */
const WEEKEND_OCCASIONS: ReadonlySet<string> = new Set(
  WEEKEND_ANCHORS.flatMap((a) => [a.id, ...a.events.map((e) => e.kind)]),
);

const SOLEMN = (et: EventType) => et.voice === 'solemn';

const GATES: Record<DashSurfaceId, (et: EventType) => boolean> = {
  // Registry hub (claims, thank-yous) — follows the registry
  // block, which the registry hides for e.g. bachelor parties
  // but keeps for memorials (donation-in-lieu).
  registry: (et) => blockAllowed(et, 'registry'),
  // Playlist triage — follows the spotify block.
  music: (et) => blockAllowed(et, 'spotify'),
  // Seating arranger — judgment list above.
  seating: (et) => !NO_SEATING.has(et.id),
  // Weekend builder — any celebration with a weekend arc
  // (wedding, quinceañera, mitzvahs, big birthdays, reunions…)
  // or inside one (rehearsal dinner, welcome party, brunch).
  weekend: (et) => WEEKEND_OCCASIONS.has(et.id),
  // Cash gifts feed — follows the registry block (same money).
  payments: (et) => blockAllowed(et, 'registry'),
  // Per-guest QR cards + welcome-table poster — party furniture;
  // a memorial's welcome table doesn't want a scan poster.
  passport: (et) => !SOLEMN(et),
  qr: (et) => !SOLEMN(et),
  // The Director (budget / vendors / countdown planning) — every
  // celebration plans; a memorial is arranged, not "planned".
  director: (et) => !SOLEMN(et),
  // Speech composer applies everywhere (memorials get eulogies) —
  // gated only so unknown surfaces stay typed; always true.
  speech: () => true,
  // Send-schedule automation (save-the-date cadences) — solemn
  // sites send nothing automatically.
  cadence: (et) => !SOLEMN(et),
  // Guest-threads hub (memory prompts, whispers, capsule) applies
  // broadly; only the anniversary time-capsule inside it is
  // wedding-shaped and gates itself.
  bridge: () => true,
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
