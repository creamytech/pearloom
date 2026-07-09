// ─────────────────────────────────────────────────────────────
// Pearloom / lib/ai-budget.ts
//
// Per-account (or per-IP) daily AI SPEND CAP — the enforcement
// layer that complements the observability-only meter in
// src/lib/ai-usage.ts.
//
// ai-usage.ts RECORDS what every model call cost (logs + an
// in-memory rolling aggregate). This module ENFORCES a ceiling:
// before an expensive model call, a route asks `overBudget(key)`;
// after a successful call it `chargeAi(key, cents)`. The counter is
// persistent (Supabase `ai_spend`) so it survives serverless cold
// starts and is shared across instances — unlike the per-instance
// rate limiter.
//
// The cap is a SAFETY NET against runaway spend (a compromised
// token, a client stuck in a retry loop), not a product paywall —
// plan tiers are handled separately by checkPearGate. It is set
// GENEROUSLY: high enough that a real host's normal editing never
// approaches it, low enough that abuse is bounded to a few dollars
// per key per day.
//
// FAIL-OPEN CONTRACT: every read/write here is best-effort. A DB
// blip, missing env, or unexpected shape must NEVER block a legit
// request. `overBudget` returns true ONLY on a confirmed read that
// today's spend has reached the ceiling; on any error it returns
// false (allow). `chargeAi` is fire-and-forget and never throws.
// ─────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { estimateCostUsd, type AiUsageEvent } from '@/lib/ai-usage';

// ── The cap ─────────────────────────────────────────────────────
// Integer US cents per key per UTC day. Env-overridable via
// AI_DAILY_CAP_CENTS; default 500 = $5.00/day. Read once at module
// load (matches how sibling lib modules read config). A malformed
// or non-positive override falls back to the default.
const DEFAULT_CAP_CENTS = 500;

function readCap(): number {
  const raw = process.env.AI_DAILY_CAP_CENTS;
  if (!raw) return DEFAULT_CAP_CENTS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CAP_CENTS;
}

export const AI_DAILY_CAP_CENTS = readCap();

// ── Service-role client (built like other lib modules) ──────────
// Returns null when Supabase isn't configured — the caller then
// fails open (can't enforce → allow).
function budgetClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** UTC calendar day, `YYYY-MM-DD` — matches ai-usage's day key. */
function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// ── Key helpers ─────────────────────────────────────────────────

/**
 * Build the budget key for a request. Uses the caller's account
 * email when authenticated, else their IP (prefixed `ip:` so an IP
 * can never collide with a real account email). Both are bounded by
 * the same daily cap, so anonymous / guest AI callers are still
 * capped per source.
 */
export function budgetKey(email: string | null | undefined, ip: string): string {
  const e = (email ?? '').toLowerCase().trim();
  return e || `ip:${(ip || 'unknown').trim()}`;
}

/**
 * Convert an AiUsageEvent's estimated USD cost into integer cents
 * for the budget counter. Rounds UP and floors at 1 cent so that
 * EVERY charged call moves the counter — a runaway loop on a cheap
 * or un-priced model still accrues toward the cap rather than
 * charging zero forever.
 */
export function centsForUsage(event: AiUsageEvent): number {
  const usd = estimateCostUsd(event) ?? 0;
  return Math.max(1, Math.ceil(usd * 100));
}

/** Rough token estimate from character length (~4 chars/token).
 *  Used by routes that call Gemini via raw fetch and don't parse
 *  usageMetadata — an approximate charge is enough for a cap. */
export function approxTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 4);
}

// ── The gate ────────────────────────────────────────────────────

/**
 * Has this key reached today's cap? Returns true ONLY on a
 * confirmed read that today's cents >= the cap. Fails open (false)
 * on missing config, a read error, or any unexpected shape — an AI
 * cap must never break a legit request over a flaky check.
 */
export async function overBudget(key: string): Promise<boolean> {
  try {
    const sb = budgetClient();
    if (!sb) return false; // not configured → can't enforce → allow
    const { data, error } = await sb
      .from('ai_spend')
      .select('cents')
      .eq('email', key)
      .eq('day', utcDay())
      .maybeSingle();
    if (error) return false; // read failed → allow
    const cents = (data as { cents?: number } | null)?.cents ?? 0;
    return cents >= AI_DAILY_CAP_CENTS;
  } catch {
    return false; // fail-open on anything unexpected
  }
}

/**
 * Add `cents` to today's counter for `key`. Fire-and-forget and
 * failure-tolerant: a dropped charge just means we under-count
 * slightly this once; it never throws into the request path. Uses
 * the atomic increment_ai_spend() function (insert … on conflict …
 * do update set cents = ai_spend.cents + excluded.cents).
 */
export async function chargeAi(key: string, cents: number): Promise<void> {
  if (!Number.isFinite(cents) || cents <= 0) return;
  const amount = Math.round(cents);
  try {
    const sb = budgetClient();
    if (!sb) return;
    const { error } = await sb.rpc('increment_ai_spend', {
      p_email: key,
      p_day: utcDay(),
      p_cents: amount,
    });
    if (error) {
      // Best-effort — log and move on. Never surfaces to the caller.
      console.warn('[ai-budget] charge failed:', error.message);
    }
  } catch (err) {
    console.warn('[ai-budget] charge threw:', err instanceof Error ? err.message : err);
  }
}
