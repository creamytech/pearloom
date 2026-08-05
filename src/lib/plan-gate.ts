// ─────────────────────────────────────────────────────────────
// Pearloom / lib/plan-gate.ts
//
// Server-side plan gating: check whether the current user's
// plan meets a required tier, enforce limits, and throw
// structured errors when access is denied.
// ─────────────────────────────────────────────────────────────

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserPlan } from '@/lib/db';

// ─── Plan hierarchy (lowest → highest) ──────────────────────
//
// PACKAGING (restructured 2026-08-04, from the three-review
// synthesis — docs/REVIEW-SYNTHESIS.md §1.4):
//
//   Page      $0    — one celebration, genuinely beautiful. Design
//                     is the marketing, so the theme catalog is NOT
//                     the paywall (only the signature shelf sits
//                     above it).
//   Pass      $89   — the whole celebration: linked events, co-hosts,
//                     500 guests, full Studio. (Custom domain is
//                     RESERVED — priced once, never built; see below.)
//   Keepsake  $199  — preservation: unlimited media + the long view.
//
// What's gated is OPERATIONAL POWER (coordination, collaboration,
// communication volume, preservation) — never visual quality.
//
// The CANONICAL ids stay `free` / `pro` / `premium`: they are what
// public.user_plans already stores, so every existing paid row keeps
// working and no migration is required. Only the marketed names,
// prices, limits, and pack grants changed. Both vocabularies — the
// retired Journal/Atelier/Legacy names and the new Page/Pass/Keepsake
// ones — resolve to the same three ranks.

const TIER_RANK: Record<string, number> = {
  free:     0,
  journal:  0, // retired marketing name
  page:     0,
  pro:      1,
  atelier:  1, // retired marketing name
  pass:     1,
  premium:  2,
  legacy:   2, // retired marketing name
  keepsake: 2,
};

/** Canonical plan name for each alias. */
const CANONICAL: Record<string, string> = {
  free:     'free',
  journal:  'free',
  page:     'free',
  pro:      'pro',
  atelier:  'pro',
  pass:     'pro',
  premium:  'premium',
  legacy:   'premium',
  keepsake: 'premium',
};

// ─── Plan limits ─────────────────────────────────────────────

export interface PlanLimits {
  maxSites: number;
  maxGuests: number;
  maxPhotos: number;
  aiGenerations: number;
  /** RESERVED — NOT IMPLEMENTED. There is no custom-domain feature
   *  in the product: no DNS provisioning, no TLS issuance, no
   *  verification screen. The flag stays so the ladder's shape is
   *  intact for when it's built, but NOTHING may sell it until then.
   *  It was on the pricing copy, in the Stripe description, and in a
   *  help answer that directed hosts to "Dashboard → Profile →
   *  Domains" — a screen that does not exist. All removed 2026-08-05.
   *  Build it, then sell it. */
  customDomain: boolean;
  /** Co-hosts BESIDES the owner. Free gets one, because for most
   *  celebrations that second person is the other half of the
   *  couple — gating them out entirely would be hostile, not
   *  commercial. The Pass is for the rest: the MOH, the best man,
   *  both sets of parents, the planner. */
  maxCoHosts: number;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  // Page — the free tier must be genuinely good, not a crippled
  // trial: it IS the acquisition loop (every published free site is
  // the marketing). Generous enough to run a real small celebration.
  //
  // maxSites is 2, not 1, DELIBERATELY (docs/DECISIONS-2026-08-04 §2).
  // One site closes our best growth loop: bridal-party reverse-
  // acquisition depends on a maid of honour building a shower site
  // and the couple then creating their own from her link. At one
  // site, she can't add the bachelorette and they can't create the
  // wedding if they'd already made anything — we'd ship the loop and
  // the gate that closes it in the same product. Two is the smallest
  // number that lets someone host their own thing AND join someone
  // else's arc; the Pass at 10 remains the answer for a whole weekend.
  // (Memorials never count against this — the grief promise.)
  FREE: {
    maxSites: 2,
    maxGuests: 100,
    maxPhotos: 50,
    aiGenerations: 10,
    customDomain: false,
    maxCoHosts: 1,
  },
  // Pass — the whole celebration. maxSites covers a weekend arc's
  // linked events (ceremony + shower + bachelor/ette + rehearsal +
  // welcome + brunch, with room to spare).
  PRO: {
    maxSites: 10,
    maxGuests: 500,
    maxPhotos: 500,
    aiGenerations: 100,
    customDomain: true,
    maxCoHosts: Infinity,
  },
  // Keepsake — preservation. Unlimited by design: this is the tier
  // whose whole promise is that nothing gets trimmed later.
  PREMIUM: {
    maxSites: Infinity,
    maxGuests: Infinity,
    maxPhotos: Infinity,
    aiGenerations: Infinity,
    customDomain: true,
    maxCoHosts: Infinity,
  },
} as const;

/** Resolve the limits object for a given plan string. */
export function getLimitsForPlan(plan: string): PlanLimits {
  const canonical = CANONICAL[plan.toLowerCase()] ?? 'free';
  if (canonical === 'premium') return PLAN_LIMITS.PREMIUM;
  if (canonical === 'pro') return PLAN_LIMITS.PRO;
  return PLAN_LIMITS.FREE;
}

// ─── Limit lookup + standard 402 body ────────────────────────

/**
 * Resolve plan name + limits for a user email in one lookup.
 * Defaults to FREE on a missing row or any lookup error — including
 * Supabase env vars not being configured (getUserPlan throws there).
 */
export async function getPlanWithLimitsForEmail(
  email: string,
): Promise<{ plan: string; limits: PlanLimits }> {
  let plan = 'free';
  try {
    const row = await getUserPlan(email);
    if (row?.plan) plan = row.plan;
  } catch {
    // Supabase unconfigured / unreachable — fall through to FREE.
  }
  return { plan, limits: getLimitsForPlan(plan) };
}

/** Limits-only convenience over getPlanWithLimitsForEmail. */
export async function getPlanLimitsForEmail(email: string): Promise<PlanLimits> {
  const { limits } = await getPlanWithLimitsForEmail(email);
  return limits;
}

/**
 * Standard JSON body for plan-limit rejections (status 402) so every
 * enforcing route returns the same shape the UI can branch on.
 */
export function planLimitResponseBody(feature: string, limit: number, currentPlan: string) {
  return {
    error: `You've reached the ${feature} limit for your plan (${limit}). Upgrade to add more.`,
    code: 'PLAN_LIMIT' as const,
    feature,
    limit,
    currentPlan,
    upgradeUrl: '/dashboard?upgrade=true',
  };
}

// ─── Access check result ─────────────────────────────────────

export interface PlanAccessResult {
  allowed: boolean;
  currentPlan: string;
  requiredPlan: string;
  upgradeUrl: string;
}

// ─── Structured error for denied access ──────────────────────

export class PlanGateError extends Error {
  public readonly code = 'PLAN_GATE_DENIED' as const;
  public readonly currentPlan: string;
  public readonly requiredPlan: string;
  public readonly upgradeUrl: string;

  constructor(result: PlanAccessResult) {
    super(
      `Plan "${result.currentPlan}" does not meet the required "${result.requiredPlan}" tier.`,
    );
    this.name = 'PlanGateError';
    this.currentPlan = result.currentPlan;
    this.requiredPlan = result.requiredPlan;
    this.upgradeUrl = result.upgradeUrl;
  }
}

// ─── Core: check whether the session user meets a tier ───────

/**
 * Resolve the current user's plan rank against a required tier.
 *
 * @param requiredTier - One of: free, journal, pro, atelier, premium, legacy
 * @returns A structured result with `allowed`, plan names, and an upgrade URL.
 */
export async function checkPlanAccess(
  requiredTier: string,
): Promise<PlanAccessResult> {
  const upgradeUrl = '/dashboard?upgrade=true';

  /* 1. The authenticated session.
     `authOptions` is NOT optional here. This was the one call site
     of 209 that omitted it, and with the JWT strategy that means
     the session never resolves — so every caller, INCLUDING PAYING
     ONES, read as 'anonymous' and got denied. It was harmless only
     because requirePlan had no callers; the first gate wired to it
     would have locked out the entire user base. Found on the way to
     wiring exactly that. */
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return {
      allowed: false,
      currentPlan: 'anonymous',
      requiredPlan: requiredTier,
      upgradeUrl,
    };
  }

  // 2. Look up the user's plan from the database
  const userPlanRow = await getUserPlan(session.user.email);
  const currentPlan = userPlanRow?.plan ?? 'free';

  // 3. Compare ranks
  const currentRank = TIER_RANK[currentPlan.toLowerCase()] ?? 0;
  const requiredRank = TIER_RANK[requiredTier.toLowerCase()] ?? 0;

  return {
    allowed: currentRank >= requiredRank,
    currentPlan,
    requiredPlan: requiredTier,
    upgradeUrl,
  };
}

// ─── Convenience: throw if access is denied ──────────────────

/**
 * Guard for server actions and API routes. Throws a `PlanGateError`
 * if the current user's plan does not meet the required tier.
 *
 * @example
 * ```ts
 * export async function POST(req: NextRequest) {
 *   await requirePlan('pro');   // throws 403-style error for free users
 *   // ... rest of handler
 * }
 * ```
 */
export async function requirePlan(tier: string): Promise<void> {
  const result = await checkPlanAccess(tier);
  if (!result.allowed) {
    throw new PlanGateError(result);
  }
}

// ─── Client-safe helpers (no async, no DB) ───────────────────

/**
 * Pure comparison — useful when the plan string is already known
 * on the client (e.g. from session context or a prop).
 */
export function isPlanSufficient(
  currentPlan: string,
  requiredTier: string,
): boolean {
  const currentRank = TIER_RANK[currentPlan.toLowerCase()] ?? 0;
  const requiredRank = TIER_RANK[requiredTier.toLowerCase()] ?? 0;
  return currentRank >= requiredRank;
}

/**
 * Return a display-friendly label for a tier string.
 */
export function tierLabel(tier: string): string {
  const canonical = CANONICAL[tier.toLowerCase()] ?? 'free';
  if (canonical === 'premium') return 'Premium';
  if (canonical === 'pro') return 'Pro';
  return 'Free';
}

/**
 * Marketed plan name (the pricing-page vocabulary: Page / Pass /
 * Keepsake) for any plan alias — including rows still storing the
 * retired Journal/Atelier/Legacy names. Use this for host-facing
 * chrome (plan strips, settings badges); use `tierLabel` for
 * internal/diagnostic copy.
 */
export function planMarketingLabel(plan: string): 'Page' | 'Pass' | 'Keepsake' {
  const canonical = CANONICAL[plan.toLowerCase()] ?? 'free';
  if (canonical === 'premium') return 'Keepsake';
  if (canonical === 'pro') return 'Pass';
  return 'Page';
}

// ─── Prices (one-time; the "not a subscription" promise) ─────
//
// The optional archive fee after the keep window is preservation,
// not planning — it buys custom-domain renewal + full-resolution
// media retention, and never gates access to a published site.

export const PLAN_PRICE_CENTS = {
  free: 0,
  pro: 8900,      // Pass
  premium: 19900, // Keepsake
} as const;

/** Optional post-event archive renewal (per year, after the keep
 *  window). The site itself stays online free on its subdomain. */
export const ARCHIVE_RENEWAL_CENTS = 2900;

/** Canonical plan id (`free` / `pro` / `premium`) for any alias. */
export function canonicalPlan(plan: string): 'free' | 'pro' | 'premium' {
  return (CANONICAL[plan.toLowerCase()] ?? 'free') as 'free' | 'pro' | 'premium';
}

// ─── Grief exemption ─────────────────────────────────────────
//
// "Grief deserves no paywall" is a published brand promise
// (landing page, pricing footer, Settings). It is enforced HERE,
// not just in copy: memorial and funeral sites are exempt from
// plan limits — creating one is never blocked, and owning one
// never consumes a slot that would paywall a celebration later.
// Every site-scoped gate must consult this before rejecting.

export const GRIEF_EXEMPT_OCCASIONS: ReadonlySet<string> = new Set(['memorial', 'funeral']);

/** True when the occasion is covered by the no-paywall promise. */
export function isGriefExempt(occasion: string | null | undefined): boolean {
  return !!occasion && GRIEF_EXEMPT_OCCASIONS.has(occasion.toLowerCase().trim());
}

/**
 * Site-scoped variant for gates that only have a site id. Reads the
 * occasion from the site row (manifest is canonical, site_config is
 * the legacy fallback — same order as /api/sites GET). Fails CLOSED
 * to `false` (i.e. the normal gate applies) on any lookup error so a
 * DB hiccup can't open a billing hole; the named-occasion overload
 * above is the fast path when the caller already knows the occasion.
 */
interface SiteLookupClient {
  from: (t: string) => {
    select: (cols: string) => {
      eq: (col: string, v: string) => {
        maybeSingle: () => PromiseLike<{ data: unknown }>;
      };
    };
  };
}

export async function isSiteGriefExempt(
  /** A Supabase client (typed loosely — structurally checking the
   *  full SupabaseClient generic here trips TS2589 at call sites). */
  db: unknown,
  siteId: string | null | undefined,
): Promise<boolean> {
  if (!db || !siteId) return false;
  try {
    // Extract ONLY the occasion strings (manifest-first, site_config
    // legacy — same order as /api/sites GET), never the full blobs.
    // The table column is `ai_manifest`, NOT `manifest`: the old
    // `.select('manifest, …')` errored, so this helper always returned
    // false and grief sites were wrongly gated on guest/create limits.
    const { data } = await (db as SiteLookupClient)
      .from('sites')
      .select('occasion:ai_manifest->>occasion, configOccasion:site_config->>occasion')
      .eq('id', siteId)
      .maybeSingle();
    if (!data) return false;
    const row = data as { occasion?: string | null; configOccasion?: string | null };
    return isGriefExempt(row.occasion ?? row.configOccasion);
  } catch {
    return false;
  }
}

// ─── Guest-capacity choke point ──────────────────────────────
//
// EVERY host-initiated guest creation goes through this one check:
// /api/guests (single add), /api/guests/import (CSV batch),
// /api/guests/copy-from (cross-site copy), /api/guests/from-person
// (circle weave-in). Adding a new host-side guest writer? Call this
// before inserting.
//
// Deliberately NOT gated — guest-initiated flows: /api/rsvp
// (open-list RSVP may create the guest's own row), /api/rsvp/plus-one
// (an attending guest's +1), /api/address-book (a guest submitting
// their own address). A guest's reply is never blocked by the host's
// plan — the same principle as "identity never blocks an RSVP"
// (lib/people.ts).
//
// Posture: fails OPEN on any lookup error (a gate hiccup never
// blocks adding a guest); grief-exempt sites are never capped.

interface GuestCountClient {
  from: (t: string) => {
    select: (cols: string, opts: { count: 'exact'; head: true }) => {
      eq: (col: string, v: string) => PromiseLike<{ count: number | null; error: unknown }>;
    };
  };
}

export type GuestCapacityResult =
  | { ok: true }
  | {
      ok: false;
      status: 402;
      body: ReturnType<typeof planLimitResponseBody> & { allowed: number };
    };

export async function checkGuestCapacity(
  /** Supabase client (loosely typed — see isSiteGriefExempt). */
  db: unknown,
  ownerEmail: string,
  siteId: string,
  /** How many guest rows the caller is about to insert. */
  adding: number,
  opts?: {
    /** Pass when the caller already fetched the site's guest rows —
     *  skips the count query. */
    currentCount?: number;
  },
): Promise<GuestCapacityResult> {
  try {
    const { plan, limits } = await getPlanWithLimitsForEmail(ownerEmail);
    if (!Number.isFinite(limits.maxGuests)) return { ok: true };
    if (await isSiteGriefExempt(db, siteId)) return { ok: true };

    let current = opts?.currentCount;
    if (typeof current !== 'number') {
      const { count, error } = await (db as GuestCountClient)
        .from('guests')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', siteId);
      if (error || typeof count !== 'number') return { ok: true }; // fail open
      current = count;
    }

    if (current + Math.max(1, adding) > limits.maxGuests) {
      return {
        ok: false,
        status: 402,
        body: {
          ...planLimitResponseBody('guests', limits.maxGuests, plan),
          allowed: Math.max(0, limits.maxGuests - current),
        },
      };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[plan-gate] guest capacity check failed (failing open):', err);
    return { ok: true };
  }
}

// ─── Co-host capacity ────────────────────────────────────────

export interface CoHostCapacityResult {
  ok: boolean;
  status?: number;
  body?: Record<string, unknown>;
}

interface CoHostCountClient {
  from(table: string): {
    select(cols: string, opts?: { count?: 'exact'; head?: boolean }): {
      eq(col: string, val: string): Promise<{ count: number | null; error: unknown }>;
    };
  };
}

/**
 * May this site take another co-host?
 *
 * GRANDFATHERING IS THE POINT. Nobody loses a collaborator they
 * already have: this is only ever consulted when ADDING one, it
 * never removes a row, and a site already over the limit keeps
 * everyone on it — the next invitation is simply refused. Turning
 * on a gate must not evict people from a celebration they're
 * already helping to run.
 *
 * Grief-exempt like every other limit, and FAILS OPEN: a counting
 * error must never block a host from inviting their partner.
 */
export async function checkCoHostCapacity(
  /** Supabase client (loosely typed — see isSiteGriefExempt). */
  db: unknown,
  ownerEmail: string,
  siteId: string,
): Promise<CoHostCapacityResult> {
  try {
    const { plan, limits } = await getPlanWithLimitsForEmail(ownerEmail);
    if (!Number.isFinite(limits.maxCoHosts)) return { ok: true };
    if (await isSiteGriefExempt(db, siteId)) return { ok: true };

    const { count, error } = await (db as CoHostCountClient)
      .from('cohosts')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId);
    if (error || typeof count !== 'number') return { ok: true }; // fail open

    if (count + 1 > limits.maxCoHosts) {
      return {
        ok: false,
        status: 402,
        body: {
          ...planLimitResponseBody('co-hosts', limits.maxCoHosts, plan),
          error:
            `Your plan includes ${limits.maxCoHosts} co-host`
            + `${limits.maxCoHosts === 1 ? '' : 's'}. `
            + 'Upgrade to invite the rest of the people helping you run this.',
        },
      };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[plan-gate] co-host capacity check failed (failing open):', err);
    return { ok: true };
  }
}
