// ─────────────────────────────────────────────────────────────
// Pearloom / lib/referral-reward.ts
//
// WHAT A REFERRAL EARNS. (docs/DECISIONS-2026-08-04 §1.)
//
// The guest→host loop is the product's growth thesis: weddings are
// episodic, so the host who loved Pearloom has no second wedding,
// and only a GUEST becoming the next host compounds. Attribution
// already ships (lib/doorway/referral → `referredBy` on
// site_created). This is the reward side.
//
// WHY NOT WHAT THE REVIEWS PROPOSED. All three suggested "an
// Edition credit for the new host". That was right against the OLD
// pricing, when design was the paywall. We then made design free —
// 55 of 75 packs granted to free accounts (MONETIZATION §3) — so an
// Edition credit is now worth exactly nothing. Shipping it would be
// a reward that reveals itself as hollow the moment the recipient
// notices they already had it, which is worse than no reward.
//
// WHAT WE GIVE INSTEAD, derived from our own ladder:
//
//   • THE NEW HOST inherits the LOOK of the event they attended.
//     They arrive from a passport recap having just seen a site
//     they liked, at peak blank-page uncertainty. Handing them that
//     style costs us nothing and removes the hardest step. This is
//     a real gift, not a coupon.
//
//   • THE REFERRER earns +1 YEAR OF ARCHIVE, capped at 3. Their
//     event is over (the recap is afterglow-only); the only thing
//     they still want from us is that their memories stay — and
//     that is also our only genuinely recurring cost. It's the one
//     currency where their interest and ours point the same way.
//
// The cap exists so the loop can't compound into unlimited free
// hosting, and the grant is archive ONLY — never Pass or Keepsake
// features, which would cannibalise what we sell.
//
// Pure policy. The ledger write lives in the caller so this stays
// testable without a database.
// ─────────────────────────────────────────────────────────────

/** Years of archive granted per activated referral. */
export const ARCHIVE_YEARS_PER_REFERRAL = 1;

/** Hard ceiling on stacked archive years from referrals. Beyond
 *  this the loop would be unlimited free hosting. */
export const MAX_REFERRAL_ARCHIVE_YEARS = 3;

export interface ReferralOutcome {
  /** Archive years to add for the referrer (0 when capped out). */
  archiveYearsGranted: number;
  /** Their new total after this grant. */
  totalArchiveYears: number;
  /** True when the cap swallowed this one — the caller should thank
   *  them warmly and NOT imply a reward that isn't coming. */
  cappedOut: boolean;
}

/**
 * What this referral earns the referrer, given what they already
 * hold. Pure; the caller persists the result.
 */
export function referralOutcome(existingArchiveYears: number): ReferralOutcome {
  const held = Number.isFinite(existingArchiveYears) && existingArchiveYears > 0
    ? Math.floor(existingArchiveYears)
    : 0;
  const room = Math.max(0, MAX_REFERRAL_ARCHIVE_YEARS - held);
  const granted = Math.min(ARCHIVE_YEARS_PER_REFERRAL, room);
  return {
    archiveYearsGranted: granted,
    totalArchiveYears: held + granted,
    cappedOut: granted === 0,
  };
}

/**
 * Does this referral qualify at all?
 *
 * ACTIVATION, not signup — a referral counts when the new host
 * actually publishes something. Rewarding a bare signup would pay
 * for an empty account and invite the obvious abuse (invite
 * yourself, collect archive years).
 *
 * Self-referral is refused explicitly: the referring site's owner
 * and the new host must be different people.
 */
export function referralQualifies(opts: {
  referrerEmail: string | null | undefined;
  newHostEmail: string | null | undefined;
  newSitePublished: boolean;
}): boolean {
  const a = (opts.referrerEmail ?? '').toLowerCase().trim();
  const b = (opts.newHostEmail ?? '').toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b) return false;          // no self-referral
  return opts.newSitePublished === true;
}

/**
 * The thank-you the referrer sees. Plain language (BRAND §7), and
 * honest when the cap means nothing more is coming — a message that
 * implies an ungiven reward is worse than a plain thank-you.
 */
export function referralThanks(outcome: ReferralOutcome, newHostFirstName?: string | null): string {
  const who = (newHostFirstName ?? '').trim();
  const opener = who
    ? `${who} started their own site from yours.`
    : 'Someone started their own site from yours.';
  if (outcome.cappedOut) {
    return `${opener} Thank you — that's the loveliest thing you can do for us.`;
  }
  const total = outcome.totalArchiveYears;
  return (
    `${opener} We've added a year to how long your photos stay in full ` +
    `resolution — ${total} ${total === 1 ? 'year' : 'years'} in all. Thank you.`
  );
}

/**
 * The look a referred host inherits: the theme of the site they came
 * from. Returns null when there's nothing to inherit, so the wizard
 * falls back to its ordinary occasion default rather than a blank.
 */
export function inheritedLookFrom(
  referringManifest: { themeId?: string | null; kitId?: string | null } | null | undefined,
): { themeId: string; kitId?: string } | null {
  const themeId = (referringManifest?.themeId ?? '').trim();
  if (!themeId) return null;
  const kitId = (referringManifest?.kitId ?? '').trim();
  return kitId ? { themeId, kitId } : { themeId };
}
