// ─────────────────────────────────────────────────────────────
// Pearloom / lib/print-engine/pricing.ts
//
// RETAIL pricing for Pearloom Print — what the HOST pays.
// Wholesale (what Lob invoices us) lives in lob-client.ts
// (postcardCostCents / letterCostCents); the spread between the
// two is the print margin.
//
// Founder-approved retail (2026-06-09):
//   postcard 4x6   $1.79
//   postcard 6x9   $2.79
//   postcard 6x11  $3.29
//   letter         $2.99   (enveloped invitation)
//
// Legacy-plan holders carry a $50.00 lifetime print credit that
// is applied automatically at checkout. The credit ledger is the
// print_order_intents table — every paid/fulfilled intent records
// credit_applied_cents, and the remaining balance is simply
// 5000 minus the sum of those.
//
// MONEY RULE: every number here is server-side truth. The client
// may MIRROR these for display, but checkout always recomputes
// from this module.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { getUserPlan } from '@/lib/db';

export type PrintProduct = 'postcard' | 'letter' | 'thankyou' | 'book';
export type PostcardSize = '4x6' | '6x9' | '6x11';

/** Retail per-card prices in cents. Source of truth — see
 *  docs/MONETIZATION.md "Pearloom Print". */
export const RETAIL_PRINT_PRICES = {
  postcard: { '4x6': 179, '6x9': 279, '6x11': 329 },
  /** Enveloped invitation (Lob letter rail). */
  letter: 299,
} as const;

/** Legacy plan's lifetime print credit: $50.00. */
export const LEGACY_PRINT_CREDIT_CENTS = 5000;

/** Retail per-card price in cents for one card of this product/size.
 *  Non-letter products ride the postcard rail (same as the Lob
 *  submission path), so they price as postcards by size. */
export function retailPrintUnitCents(
  product: PrintProduct,
  size: PostcardSize = '4x6',
): number {
  if (product === 'letter') return RETAIL_PRINT_PRICES.letter;
  return RETAIL_PRINT_PRICES.postcard[size] ?? RETAIL_PRINT_PRICES.postcard['4x6'];
}

/** Retail total in cents for `count` cards. */
export function retailPrintPriceCents(
  product: PrintProduct,
  size: PostcardSize = '4x6',
  count = 1,
): number {
  const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  return retailPrintUnitCents(product, size) * n;
}

/** Pure credit math — exposed for tests. Remaining = cap − used,
 *  floored at 0. */
export function creditRemainingFromUsed(usedCents: number): number {
  const used = Number.isFinite(usedCents) && usedCents > 0 ? usedCents : 0;
  return Math.max(0, LEGACY_PRINT_CREDIT_CENTS - used);
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Remaining lifetime print credit (cents) for this user.
 *
 * - Non-premium plans (anything that isn't legacy/premium) → 0.
 * - Premium/legacy → 5000 minus the sum of credit_applied_cents
 *   across this user's paid/fulfilled print_order_intents.
 * - Fail-CLOSED: any plan-lookup or DB error returns 0 — we never
 *   hand out credit we can't verify.
 */
export async function legacyCreditRemainingCents(email: string): Promise<number> {
  const normalized = email.toLowerCase().trim();

  let plan = 'free';
  try {
    const row = await getUserPlan(email);
    if (row?.plan) plan = row.plan;
  } catch {
    // Supabase unconfigured / unreachable — no verifiable credit.
    return 0;
  }
  const canonical = plan.toLowerCase();
  if (canonical !== 'premium' && canonical !== 'legacy') return 0;

  const sb = getServiceClient();
  if (!sb) return 0;

  const { data, error } = await sb
    .from('print_order_intents')
    .select('credit_applied_cents')
    .eq('user_email', normalized)
    .in('status', ['paid', 'fulfilled']);
  if (error) {
    console.error('[print] credit ledger lookup failed:', error.message);
    return 0;
  }
  const used = (data ?? []).reduce(
    (sum, row) => sum + (typeof row.credit_applied_cents === 'number' ? row.credit_applied_cents : 0),
    0,
  );
  return creditRemainingFromUsed(used);
}
