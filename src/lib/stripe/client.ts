// ──────────────────────────────────────────────────────────────
// Stripe — server-side client wrapper.
//
// We use Stripe Standard (not Connect): Pearloom is the merchant
// of record. Couples receive their funds via manual payout from
// Pearloom (off-platform) until/unless we move to Connect for the
// designer marketplace later.
//
// Two clients are exported:
//   - getStripe(): full SDK access for webhooks / advanced flows
//   - hasStripe(): boolean — does the env have a usable secret key?
//
// Every API route that calls Stripe should hasStripe()-gate first
// so the rest of the app keeps working when keys aren't configured
// (dev / preview / unconfigured Supabase environments).
// ──────────────────────────────────────────────────────────────

import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cached = new Stripe(key, {
    apiVersion: '2026-03-25.dahlia',
    typescript: true,
    appInfo: { name: 'Pearloom', version: '8.0.0' },
  });
  return cached;
}

export function hasStripe(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Pearloom platform fee (basis points). 300 = 3%. Applied to
 *  cash gifts and registry purchases — couples receive net. */
export const PEARLOOM_FEE_BPS = 300;

export function calculateFeeCents(amountCents: number): number {
  return Math.round((amountCents * PEARLOOM_FEE_BPS) / 10_000);
}

export function calculateNetCents(amountCents: number): number {
  return amountCents - calculateFeeCents(amountCents);
}
