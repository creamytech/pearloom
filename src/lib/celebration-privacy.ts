// ─────────────────────────────────────────────────────────────
// Pearloom / lib/celebration-privacy.ts
//
// THE SHEDDING PROBLEM.
//
// A celebration is one container over several sibling events — a
// wedding plus its shower, bachelor/ette, rehearsal, welcome party
// and brunch. The moment that container grows shared machinery (a
// unified roster, cross-event write-back, a container-wide
// passport), it also grows a way for one event's guest list to
// *shed* into another's.
//
// The concrete failure: the bachelorette guest list reaching the
// mother-of-the-bride because both events hang off the same
// celebration. Or a private rehearsal-dinner RSVP surfacing on a
// guest passport issued for the ceremony. Blanket container-wide
// visibility is the bug; per-satellite scopes are the fix.
//
// The model is one field with a safe default:
//
//   shared  — this event's guests participate in the container's
//             roster union, and it can receive cross-event
//             write-back.
//   private — this event's guest list NEVER leaves it. It is
//             excluded from the union, is not a write-back target,
//             and is never advertised on a sibling's public strip.
//
// Defaults are chosen so the dangerous case is safe WITHOUT the
// host having to know this feature exists: sensitive occasions
// default to `private`, everything else to `shared`. An explicit
// host choice always wins.
//
// This module is pure (no I/O) so every reader — the roster union,
// write-back, the public siblings strip — enforces the SAME rule
// and they cannot drift apart.
// ─────────────────────────────────────────────────────────────

import { normalizeOccasion } from '@/lib/site-urls';

export type RosterScope = 'shared' | 'private';

/**
 * Occasions whose guest list is private by default.
 *
 * These are the surprise-shaped and single-cohort events (see
 * CLAUDE-PRODUCT §8 Q2 — bachelor/ette parties are private-by-
 * default as a product decision). A host CAN opt one into the
 * shared roster explicitly; nothing here is a hard block, it is a
 * default that fails safe.
 */
export const SENSITIVE_OCCASIONS: ReadonlySet<string> = new Set([
  'bachelor-party',
  'bachelorette-party',
]);

/** True when the occasion's guest list is private unless the host
 *  says otherwise. */
export function isSensitiveOccasion(occasion: string | null | undefined): boolean {
  if (!occasion) return false;
  return SENSITIVE_OCCASIONS.has(normalizeOccasion(occasion));
}

/** The scope an event gets when the host hasn't chosen one. */
export function defaultRosterScopeFor(occasion: string | null | undefined): RosterScope {
  return isSensitiveOccasion(occasion) ? 'private' : 'shared';
}

/** The shape this module needs off a manifest — deliberately
 *  structural so callers can pass a full StoryManifest, a partial
 *  projection from a `select`, or a plain row. */
export interface ScopeInput {
  occasion?: string | null;
  celebration?: {
    id?: string;
    rosterScope?: string | null;
    /** Legacy per-sibling opt-out for the PUBLIC strip. When the
     *  host set this false they already said "don't advertise this
     *  event", so it also implies a private roster. */
    linkVisible?: boolean | null;
  } | null;
}

/**
 * Resolve an event's roster scope. Explicit host choice wins; the
 * legacy `linkVisible: false` opt-out implies private; otherwise
 * the occasion default applies.
 *
 * Anything unrecognized in `rosterScope` falls through to the
 * default rather than being trusted — a typo must not silently
 * open a private event.
 */
export function rosterScopeFor(input: ScopeInput | null | undefined): RosterScope {
  if (!input) return 'shared';
  const explicit = input.celebration?.rosterScope;
  if (explicit === 'private') return 'private';
  if (explicit === 'shared') return 'shared';
  if (input.celebration?.linkVisible === false) return 'private';
  return defaultRosterScopeFor(input.occasion);
}

/** Convenience: does this event contribute its guests to the
 *  container's shared roster, and can it receive write-back? */
export function participatesInSharedRoster(input: ScopeInput | null | undefined): boolean {
  return rosterScopeFor(input) === 'shared';
}

/**
 * Split a set of events into the ones that share their roster and
 * the ones that keep it private. Both halves are returned because
 * the owner still legitimately sees their OWN private events (their
 * data, their dashboard) — what must not happen is those guests
 * leaking into the cross-event union or becoming write-back targets.
 */
export function partitionByScope<T extends ScopeInput>(
  events: readonly T[],
): { shared: T[]; private: T[] } {
  const shared: T[] = [];
  const priv: T[] = [];
  for (const e of events) {
    (participatesInSharedRoster(e) ? shared : priv).push(e);
  }
  return { shared, private: priv };
}

/** Host-facing reason a private event sits out of the shared
 *  roster. Plain language per BRAND §7 — no jargon, no scolding. */
export function privateScopeReason(occasion: string | null | undefined): string {
  return isSensitiveOccasion(occasion)
    ? 'Kept private by default — this guest list stays with this event.'
    : 'You set this event’s guest list to stay private.';
}
