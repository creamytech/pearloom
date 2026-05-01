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
