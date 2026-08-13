// ─────────────────────────────────────────────────────────────
// Pearloom / lib/celebration-invite.ts
//
// REVERSE ACQUISITION — the party finds the couple.
//
// The merged synthesis ranks this the #1 distribution channel
// (docs/REVIEW-SYNTHESIS.md §4): the maid of honour planning a
// shower, or the best man planning a weekend, is looking for a
// stylish tool RIGHT NOW — months before the couple shops for a
// wedding site. If the satellite host can hand the couple a link
// that says "your shower already lives here, come claim the rest",
// Pearloom never has to find the engaged couple first.
//
// NO NEW TABLE. The wizard already accepts `?from`, `?cid` and
// `?cname` and carries them into the new site's celebration link,
// so the invite is a *link*, not a record. That keeps this
// shippable with no migration and nothing to reconcile — and a
// link that can't be revoked is fine here, because it grants
// nothing: it pre-fills a celebration name on a site the couple
// creates and owns themselves.
//
// WHAT IT DELIBERATELY DOES NOT DO:
//   • It does not give the couple access to the satellite site.
//   • It does not share the satellite's guest list — the shedding
//     guard (lib/celebration-privacy) governs that separately, and
//     a bachelor/ette stays private by default even once linked.
//   • It carries no guest identity, since it gets forwarded.
//
// Pure + client-safe.
// ─────────────────────────────────────────────────────────────

import { containerNoun } from '@/lib/celebration-naming';
import { normalizeOccasion } from '@/lib/site-urls';
import { getEventType } from '@/lib/event-os/event-types';

/** Occasions that are typically hosted by SOMEONE OTHER than the
 *  guest of honour — the reverse-acquisition wedge. */
export const SATELLITE_OCCASIONS: ReadonlySet<string> = new Set([
  'bridal-shower',
  'bachelorette-party',
  'bachelor-party',
  'bridal-luncheon',
  'rehearsal-dinner',
  'welcome-party',
  'brunch',
  'baby-shower',
  'engagement',
]);

/** True when this occasion is usually planned FOR someone, and so
 *  worth asking "is this part of a bigger celebration?" */
export function isSatelliteOccasion(occasion: string | null | undefined): boolean {
  if (!occasion) return false;
  return SATELLITE_OCCASIONS.has(normalizeOccasion(occasion));
}

export interface CelebrationInviteInput {
  /** The satellite site's slug — the "from" attribution. */
  fromSlug: string;
  /** The celebration these events share. */
  celebrationId: string;
  celebrationName: string;
  /** What the couple/honouree is expected to create. */
  suggestOccasion?: string;
}

/**
 * The link the satellite host sends. Lands the recipient in the
 * wizard with the celebration pre-linked, so their site joins the
 * arc the moment they finish.
 */
export function celebrationInviteHref(input: CelebrationInviteInput): string {
  const params = new URLSearchParams();
  if (input.fromSlug.trim()) params.set('from', input.fromSlug.trim());
  if (input.celebrationId.trim()) params.set('cid', input.celebrationId.trim());
  if (input.celebrationName.trim()) params.set('cname', input.celebrationName.trim().slice(0, 80));
  // Check the RAW value against the registry before normalizing —
  // normalizeOccasion falls back to 'wedding' for anything it
  // doesn't recognize, so normalizing first would silently suggest
  // a wedding to someone planning something else entirely. Better
  // to send no suggestion than a confidently wrong one.
  const raw = (input.suggestOccasion ?? '').trim().toLowerCase();
  if (raw && getEventType(raw)) params.set('occasion', normalizeOccasion(raw));
  return `/wizard/new?${params.toString()}`;
}

/**
 * The message the satellite host sends with it. Plain language
 * (BRAND §7), occasion-aware register, and honest about what the
 * recipient is being handed: their own site, joined to this arc.
 *
 * `hostFirstName` is the SATELLITE host (the person sending).
 */
export function celebrationInviteMessage(opts: {
  hostFirstName?: string | null;
  satelliteOccasion: string;
  celebrationName: string;
  /** The occasion the recipient would create. */
  suggestOccasion?: string;
}): string {
  const noun = containerNoun(opts.suggestOccasion ?? opts.satelliteOccasion);
  const who = (opts.hostFirstName ?? '').trim();
  const satelliteLabel = (getEventType(normalizeOccasion(opts.satelliteOccasion))?.label ?? 'event')
    .split(' / ')[0]
    .toLowerCase();
  const opener = who ? `${who} made a page for your ${satelliteLabel}` : `Your ${satelliteLabel} has a page`;
  return (
    `${opener} on Pearloom, and set it inside “${opts.celebrationName}”. ` +
    `If you make your own site from this link, the two join up — one ${noun}, ` +
    `all of it in one place. Your site stays yours; nothing of yours is shared back.`
  );
}

/** Whether we should offer the invite at all: only for satellite
 *  occasions that are actually linked to a celebration. */
export function shouldOfferInvite(opts: {
  occasion: string | null | undefined;
  celebrationId: string | null | undefined;
}): boolean {
  return isSatelliteOccasion(opts.occasion) && !!(opts.celebrationId ?? '').trim();
}
