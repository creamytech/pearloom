// ─────────────────────────────────────────────────────────────
// Pearloom / lib/theme-store/entitlements.ts
// Theme-Store pack ownership ledger.
//
// One row per (user_email, pack_id) in public.theme_pack_purchases.
// Free-tier packs are owned IMPLICITLY — no row required. The
// `getUserEntitlements` and `userOwnsPack` helpers fold the
// free catalog in so callers never have to remember the rule.
//
// Stripe webhooks call `addEntitlement` from the existing
// billing pipeline. RLS denies anon access entirely, matching
// the belt-and-braces deny-anon pattern in
// CLAUDE-DESIGN.md §14.3.
// ─────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { FREE_PACK_IDS, PACKS, isPackFree } from './packs';
import { getUserPlan } from '@/lib/db';

// ─── Lazy Supabase client (service-role, server-side only) ───
//
// Mirrors the pattern in src/lib/db.ts + src/lib/marketplace.ts:
// instantiate at request time, never at build time. We use
// the service-role key so this file refuses to compile into
// any browser bundle (it imports server-side env vars).

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// ─── Types ───────────────────────────────────────────────────

/**
 * One ownership row. Free packs surface as synthetic entries
 * with `purchasedAt = null` and no `stripeChargeId`, so callers
 * can render the same "Owned" pill for both real + implicit
 * entitlements without branching.
 */
export interface Entitlement {
  /**
   * The user email this entitlement is keyed by. Lowercased + trimmed
   * on the write path — never trust the raw session value here.
   */
  userId: string;
  /** Pack id matching `Pack.id` in packs.ts. */
  packId: string;
  /** ISO timestamp from the row, or null for free implicit ownership. */
  purchasedAt: string | null;
  /** Stripe charge / session id, when this was a paid purchase. */
  stripeChargeId?: string;
}

interface PurchaseRow {
  user_email: string;
  pack_id: string;
  purchased_at: string;
  stripe_session_id: string | null;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function toEntitlement(row: PurchaseRow): Entitlement {
  return {
    userId: row.user_email,
    packId: row.pack_id,
    purchasedAt: row.purchased_at,
    stripeChargeId: row.stripe_session_id ?? undefined,
  };
}

function syntheticFreeEntitlements(userEmail: string): Entitlement[] {
  return FREE_PACK_IDS.map((packId) => ({
    userId: userEmail,
    packId,
    purchasedAt: null,
  }));
}

// ─── Plan-tier grants (finalized 2026-06-09) ─────────────────
//
// The plan ladder includes the Theme Store, so upgrading is the
// best deal in the shop:
//   • Journal (free)   → free packs only; everything else à la carte.
//   • Atelier ($19)    → every PREMIUM pack included (sub-$20 shelf).
//   • Legacy  ($129)   → the entire catalog, signature shelf included.
//
// Plan strings come from public.user_plans via getUserPlan and use
// the canonical names in src/lib/plan-gate.ts (free/journal,
// pro/atelier, premium/legacy).

const PREMIUM_PACK_IDS: readonly string[] = PACKS.filter((p) => p.tier === 'premium').map((p) => p.id);
const PAID_PACK_IDS: readonly string[] = PACKS.filter((p) => p.tier !== 'free').map((p) => p.id);

/** Pack ids granted by a plan, beyond the free shelf. */
export function planGrantedPackIds(plan: string | null | undefined): readonly string[] {
  const p = (plan ?? '').toLowerCase();
  if (p === 'premium' || p === 'legacy') return PAID_PACK_IDS;
  if (p === 'pro' || p === 'atelier') return PREMIUM_PACK_IDS;
  return [];
}

/**
 * Look up the user's plan and return its granted pack ids.
 * Fails closed (no grants) on any DB error — a transient outage
 * should never hand out the catalog, and real purchases are
 * still honored via theme_pack_purchases.
 */
async function planGrantsFor(userEmail: string): Promise<Entitlement[]> {
  try {
    const planRow = await getUserPlan(userEmail);
    return planGrantedPackIds(planRow?.plan).map((packId) => ({
      userId: userEmail,
      packId,
      purchasedAt: null,
    }));
  } catch {
    return [];
  }
}

// ─── Reads ───────────────────────────────────────────────────

/**
 * All packs a user is entitled to — real Stripe purchases plus
 * the free tier folded in. Deduped by pack id so a free pack
 * that somehow ended up in the purchases table only shows once.
 *
 * Returns an empty array (plus the free tier) on DB error so
 * the store keeps rendering — the free packs are still useful.
 */
export async function getUserEntitlements(userEmail: string): Promise<Entitlement[]> {
  const email = normalizeEmail(userEmail);
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('theme_pack_purchases')
    .select('user_email, pack_id, purchased_at, stripe_session_id')
    .eq('user_email', email);

  if (error) {
    console.error('[theme-store] getUserEntitlements error:', error.message);
    return syntheticFreeEntitlements(email);
  }

  const purchased: Entitlement[] = (data ?? []).map((r) => toEntitlement(r as PurchaseRow));
  const purchasedIds = new Set(purchased.map((e) => e.packId));

  // Fold in free-tier implicit ownership for any pack the user
  // hasn't already paid for. (A free pack with a real purchase
  // row is unusual — we keep the real row since it carries the
  // purchasedAt timestamp.)
  const implicit = syntheticFreeEntitlements(email).filter((e) => !purchasedIds.has(e.packId));

  // Fold in plan-tier grants (Atelier → premium shelf, Legacy →
  // everything). Synthetic like the free tier — no purchase row.
  const seen = new Set([...purchasedIds, ...implicit.map((e) => e.packId)]);
  const planGrants = (await planGrantsFor(email)).filter((e) => !seen.has(e.packId));

  return [...purchased, ...implicit, ...planGrants];
}

/**
 * Single-pack ownership check. Used by /api/theme-store/apply
 * and the pack card "Apply" / "Buy" branch. Free packs always
 * return true without a DB round-trip.
 */
export async function userOwnsPack(userEmail: string, packId: string): Promise<boolean> {
  if (isPackFree(packId)) return true;

  const email = normalizeEmail(userEmail);

  // Plan-tier grant — Atelier covers the premium shelf, Legacy
  // covers everything. Checked before the purchase row so plan
  // holders skip the extra query.
  try {
    const planRow = await getUserPlan(email);
    if (planGrantedPackIds(planRow?.plan).includes(packId)) return true;
  } catch {
    /* fall through to the purchase-row check */
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('theme_pack_purchases')
    .select('id')
    .eq('user_email', email)
    .eq('pack_id', packId)
    .maybeSingle();

  if (error) {
    console.error('[theme-store] userOwnsPack error:', error.message);
    return false;
  }
  return data !== null;
}

// ─── Writes ──────────────────────────────────────────────────

/**
 * Idempotent purchase recorder — Stripe sends webhooks with
 * at-least-once semantics, so dedupe is on (stripe_session_id),
 * which is uniquely indexed at the table level (see migration
 * 20260618_theme_pack_purchases.sql).
 *
 * Throws on database error so the webhook handler returns a
 * non-2xx and Stripe retries.
 */
export async function addEntitlement(
  userEmail: string,
  packId: string,
  stripeChargeId: string,
  amountCents?: number,
): Promise<Entitlement> {
  const email = normalizeEmail(userEmail);
  const supabase = getSupabase();

  // Upsert keyed by stripe_session_id — a webhook retry for
  // the same charge is a no-op.
  const { data, error } = await supabase
    .from('theme_pack_purchases')
    .upsert(
      {
        user_email: email,
        pack_id: packId,
        stripe_session_id: stripeChargeId,
        amount_cents: amountCents ?? null,
        purchased_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_session_id' },
    )
    .select('user_email, pack_id, purchased_at, stripe_session_id')
    .single();

  if (error || !data) {
    throw new Error(`addEntitlement failed: ${error?.message ?? 'no row returned'}`);
  }
  return toEntitlement(data as PurchaseRow);
}
