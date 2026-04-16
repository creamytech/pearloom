// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/pricing.ts
//
// Pure helpers for marketplace booking economics. Kept in a
// dependency-free file so unit tests don't need Supabase/Stripe.
// ─────────────────────────────────────────────────────────────

/**
 * Pearloom takes an 8% platform fee on each booking total.
 * Returns null when total is unknown (pre-proposal inquiries).
 */
export function pearloomFeeCents(totalCents: number | null | undefined): number | null {
  if (typeof totalCents !== 'number' || !Number.isFinite(totalCents) || totalCents <= 0) return null;
  return Math.round(totalCents * 0.08);
}

/**
 * For a given deposit amount we cap the application_fee at (deposit - 1¢) so
 * Stripe never rejects a zero-or-negative transfer to the vendor.
 */
export function applicationFeeFor(depositCents: number, totalFeeCents: number | null): number {
  if (!Number.isFinite(depositCents) || depositCents < 1) return 0;
  const base = totalFeeCents ?? Math.round(depositCents * 0.08);
  return Math.max(0, Math.min(base, depositCents - 1));
}
