// ─────────────────────────────────────────────────────────────
// Pearloom / lib/plan-gate.ts
//
// Server-side plan gating: check whether the current user's
// plan meets a required tier, enforce limits, and throw
// structured errors when access is denied.
// ─────────────────────────────────────────────────────────────

import { getServerSession } from 'next-auth';
import { getUserPlan } from '@/lib/db';

// ─── Plan hierarchy (lowest → highest) ──────────────────────

const TIER_RANK: Record<string, number> = {
  free:     0,
  journal:  0, // journal === free tier
  pro:      1,
  atelier:  1, // atelier === pro tier
  premium:  2,
  legacy:   2, // legacy === premium tier
};

/** Canonical plan name for each alias. */
const CANONICAL: Record<string, string> = {
  free:    'free',
  journal: 'free',
  pro:     'pro',
  atelier: 'pro',
  premium: 'premium',
  legacy:  'premium',
};

// ─── Plan limits ─────────────────────────────────────────────

export interface PlanLimits {
  maxSites: number;
  maxGuests: number;
  maxPhotos: number;
  aiGenerations: number;
  customDomain: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    maxSites: 1,
    maxGuests: 50,
    maxPhotos: 20,
    aiGenerations: 3,
    customDomain: false,
  },
  PRO: {
    maxSites: 3,
    maxGuests: 500,
    maxPhotos: 200,
    aiGenerations: 50,
    customDomain: true,
  },
  PREMIUM: {
    maxSites: 10,
    maxGuests: Infinity,
    maxPhotos: Infinity,
    aiGenerations: Infinity,
    customDomain: true,
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

  // 1. Get the authenticated session
  const session = await getServerSession();
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
 * Marketed plan name (the pricing-page vocabulary: Journal /
 * Atelier / Legacy) for any plan alias. Use this for host-facing
 * chrome (plan strips, settings badges); use `tierLabel` for
 * internal/diagnostic copy.
 */
export function planMarketingLabel(plan: string): 'Journal' | 'Atelier' | 'Legacy' {
  const canonical = CANONICAL[plan.toLowerCase()] ?? 'free';
  if (canonical === 'premium') return 'Legacy';
  if (canonical === 'pro') return 'Atelier';
  return 'Journal';
}

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
