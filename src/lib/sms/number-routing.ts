// ─────────────────────────────────────────────────────────────
// Pearloom / lib/sms/number-routing.ts
//
// WHICH celebration is this number being texted ABOUT?
//
// The concierge already resolves the guest from the number they
// text FROM. That's enough until someone is on two lists, where the
// best it can do is ask. This adds the other half: the number they
// texted TO.
//
// Two models, and the product should support both rather than
// picking one:
//
//   SHARED NUMBER — one Pearloom number for everyone. Costs
//   nothing per celebration and scales to thousands, but a guest on
//   two lists has to be asked which one they mean.
//
//   DEDICATED NUMBER — a number bought for one celebration. About
//   a dollar a month each, so it's a premium touch, not the
//   default; in exchange there is never anything to disambiguate,
//   because the number itself names the event.
//
// So: if the inbound `To` maps to a celebration, that answers the
// question outright. Otherwise fall back to resolving by the
// guest's own matches, exactly as before. Buying a number becomes
// a row in the database — config, not code.
//
// THE ONE RULE THAT MATTERS: a dedicated number narrows, it never
// widens. Texting Emma & James's number does not entitle you to
// anything about Emma & James — you must still be on their list.
// Otherwise a bought number becomes a public read of a guest list.
//
// Pure: no I/O, no clock.
// ─────────────────────────────────────────────────────────────

import { resolveCelebration, type ConciergeMatch, type Resolution } from './concierge';

/** Digits only, so +1 (555) 123-0000 and +15551230000 are one number. */
export function normalizeNumberKey(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\D/g, '');
}

export function sameNumber(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeNumberKey(a);
  const nb = normalizeNumberKey(b);
  return na.length > 0 && na === nb;
}

/**
 * Resolve the celebration, preferring the number that was texted.
 *
 * `toNumber` is the Pearloom number the guest messaged.
 * `dedicatedSiteId` is the celebration that number belongs to, or
 * null when it's the shared number.
 *
 * When a dedicated number IS matched but the guest isn't on that
 * celebration's list, this returns `none` — not the guest's other
 * celebrations. Answering about a different event than the one they
 * texted would be confusing at best; falling through to a list they
 * ARE on would let a bought number become a probe.
 */
export function resolveWithNumber(
  matches: readonly ConciergeMatch[],
  dedicatedSiteId: string | null | undefined,
): Resolution {
  if (!dedicatedSiteId) return resolveCelebration(matches);

  const onThisCelebration = (matches ?? []).filter((m) => m.siteId === dedicatedSiteId);
  // Still goes through resolveCelebration so the published-only
  // rule and the duplicate-row collapse apply identically.
  return resolveCelebration(onThisCelebration);
}

/**
 * The reply when someone texts a celebration's own number but isn't
 * on its list.
 *
 * Says nothing about the celebration — not whose it is, not that
 * the number is even in use for one. A dedicated number is more
 * guessable than a passport token, so it gets the same silence a
 * stranger gets anywhere else in this product.
 */
export function notOnThisListReply(): string {
  return 'This is the Pearloom concierge. We can’t match this number to a celebration — '
    + 'ask whoever invited you for their site link, and reply here once you’re on their list.';
}
