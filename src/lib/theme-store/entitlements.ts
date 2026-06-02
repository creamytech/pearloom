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
import { FREE_PACK_IDS, isPackFree } from './packs';

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

  return [...purchased, ...implicit];
}

/**
 * Single-pack ownership check. Used by /api/theme-store/apply
 * and the pack card "Apply" / "Buy" branch. Free packs always
 * return true without a DB round-trip.
 */
export async function userOwnsPack(userEmail: string, packId: string): Promise<boolean> {
  if (isPackFree(packId)) return true;

  const email = normalizeEmail(userEmail);
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
