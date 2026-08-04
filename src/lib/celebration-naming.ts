// ─────────────────────────────────────────────────────────────
// Pearloom / lib/celebration-naming.ts
//
// What the CONTAINER is called, in the host's own register.
//
// The container that groups sibling events is internally a
// "celebration" — that's the table name, the manifest field, the
// API path, and it should stay that way. But the word must never
// reach a host who is planning a funeral. "Your celebration has 3
// events" is, for that host, a small cruelty delivered by a
// dropdown.
//
// So: internal id stays `celebration` everywhere; the LABEL is
// derived, per occasion, from the same EVENT_TYPES registry that
// already routes tone, blocks, and RSVP shape. Two rules:
//
//   1. Never hardcode the noun in a host-facing string. Call
//      `containerNoun(occasion)` / `containerLabel(occasion)`.
//   2. Never branch on occasion inline. The registry's `voice` is
//      the source of truth, so adding a solemn occasion needs no
//      changes here.
//
// This mirrors the cockpit's existing solemn handling (the header
// that reads "In loving memory" instead of a countdown) and the
// same discipline the sensitive-occasion privacy rule uses.
//
// Pure + client-safe: no I/O, no server-only imports.
// ─────────────────────────────────────────────────────────────

import { getEventType } from '@/lib/event-os/event-types';
import { normalizeOccasion } from '@/lib/site-urls';

/** The three registers the container speaks in. */
export type ContainerNoun = 'celebration' | 'gathering' | 'remembrance';

/**
 * Occasions that want the neutral "gathering" — events that group
 * people without being celebratory OR solemn. Kept short and
 * explicit; everything else derives from voice.
 */
const GATHERING_OCCASIONS: ReadonlySet<string> = new Set(['reunion']);

/**
 * The container noun for an occasion, lowercase, for use mid-
 * sentence ("everyone across your gathering").
 *
 * Solemn occasions (memorial, funeral) get "remembrance" — derived
 * from the registry voice, so a future solemn occasion is handled
 * without touching this file.
 */
export function containerNoun(occasion: string | null | undefined): ContainerNoun {
  if (!occasion) return 'celebration';
  const id = normalizeOccasion(occasion);
  if (GATHERING_OCCASIONS.has(id)) return 'gathering';
  return getEventType(id)?.voice === 'solemn' ? 'remembrance' : 'celebration';
}

/** Title-case form, for labels and headings ("Your Remembrance"). */
export function containerLabel(occasion: string | null | undefined): string {
  const noun = containerNoun(occasion);
  return noun.charAt(0).toUpperCase() + noun.slice(1);
}

/** Plural, mid-sentence ("all your remembrances"). */
export function containerNounPlural(occasion: string | null | undefined): string {
  return `${containerNoun(occasion)}s`;
}

/**
 * The noun for a MIXED container — a weekend arc holding several
 * occasions at once. The gentlest register wins: if any event in
 * the arc is solemn, the whole container speaks solemnly, because
 * getting it wrong in that direction is the failure that matters.
 */
export function containerNounForSet(
  occasions: ReadonlyArray<string | null | undefined>,
): ContainerNoun {
  const nouns = occasions.map(containerNoun);
  if (nouns.includes('remembrance')) return 'remembrance';
  if (nouns.length > 0 && nouns.every((n) => n === 'gathering')) return 'gathering';
  return 'celebration';
}

/** Title-case form of the mixed-container noun. */
export function containerLabelForSet(
  occasions: ReadonlyArray<string | null | undefined>,
): string {
  const noun = containerNounForSet(occasions);
  return noun.charAt(0).toUpperCase() + noun.slice(1);
}
