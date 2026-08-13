// ─────────────────────────────────────────────────────────────
// Pearloom / lib/doorway/referral.ts
//
// GUEST → HOST ATTRIBUTION.
//
// A guest who attended a Pearloom event is the warmest possible
// next host, and the passport's post-event recap invites them with
// `/wizard/new?ref=<site>`. This module is the other end: it
// captures that marker, survives it through the signup round-trip,
// and hands it to the site-create call so the conversion is
// actually COUNTABLE.
//
// All three external reviews asked for exactly one metric to be
// instrumented above the others — the rate at which guests become
// hosts (docs/REVIEW-SYNTHESIS.md §1.6/§1.10). Without this the
// loop exists but is invisible, which is the same as not knowing
// whether the product's central growth thesis is true.
//
// PRIVACY: the marker is a SITE slug, never a guest. A referral
// link may be forwarded or pasted into a group chat, so it must
// not carry who sent it. The attribution answers "which event
// produced a new host", never "which guest did".
//
// Pure + client-safe. Storage access is guarded so this is inert
// during SSR.
// ─────────────────────────────────────────────────────────────

/** Survives the signup round-trip alongside the wizard draft. */
export const REFERRAL_STORAGE_KEY = 'pl-referral-src';

/** Slugs are lowercase alphanumeric + dashes; anything else is not
 *  ours and is discarded rather than stored or echoed back. */
const SLUG_RX = /^[a-z0-9][a-z0-9-]{0,79}$/;

/**
 * Read and sanitize a `?ref=` marker from a query string.
 * Returns null for anything that isn't a plausible site slug —
 * this value ends up in analytics and (briefly) in storage, so it
 * is validated, never trusted.
 */
export function readReferralParam(search: string | null | undefined): string | null {
  if (!search) return null;
  let raw: string | null;
  try {
    raw = new URLSearchParams(search).get('ref');
  } catch {
    return null;
  }
  if (!raw) return null;
  const slug = raw.trim().toLowerCase();
  return SLUG_RX.test(slug) ? slug : null;
}

/**
 * Capture a referral marker if the current URL carries one.
 * Idempotent and first-wins: a host who arrives via a friend's
 * passport and then wanders the site keeps the original
 * attribution rather than having it overwritten by a later,
 * ref-less visit.
 */
export function captureReferral(search?: string): string | null {
  if (typeof window === 'undefined') return null;
  const incoming = readReferralParam(search ?? window.location.search);
  try {
    const existing = window.localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (existing && SLUG_RX.test(existing)) return existing; // first wins
    if (incoming) {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, incoming);
      return incoming;
    }
    return null;
  } catch {
    // Private mode / storage disabled — attribution is a nicety and
    // must never break the flow.
    return incoming;
  }
}

/** The stored marker, if any. */
export function storedReferral(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(REFERRAL_STORAGE_KEY);
    return v && SLUG_RX.test(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Clear it once the site is created — the marker has done its job,
 * and a stale one must not attribute a host's SECOND site to a
 * referral they followed months earlier.
 */
export function clearReferral(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch { /* nothing to do */ }
}

/** Server-side sanitizer for the value arriving on a create call. */
export function sanitizeReferral(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const slug = value.trim().toLowerCase();
  return SLUG_RX.test(slug) ? slug : null;
}
