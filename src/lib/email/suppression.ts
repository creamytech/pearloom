// ─────────────────────────────────────────────────────────────
// Pearloom / lib/email/suppression.ts
//
// The send-time gate. Before any guest-facing email fans out we
// check two sources:
//   • email_opt_outs        — the one-click List-Unsubscribe /
//     spam-complaint opt-out list (per-site or global).
//   • guests.email_bounced_at — a hard bounce recorded by the
//     Resend webhook; never mail a dead address again.
//
// Contract: FAIL-OPEN on a lookup error (a flaky check must not
// block an entire send) but FAIL-CLOSED on a confirmed opt-out /
// bounce (a recorded suppression always wins). Every query is
// wrapped so a transient failure resolves to "not suppressed".
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const lc = (e: string) => e.trim().toLowerCase();

/**
 * Record a per-recipient opt-out. `siteId` null = global (all mail
 * to that address). Idempotent: check-then-insert, with the unique
 * index as the concurrency backstop (a racing insert surfaces as a
 * unique violation, which we treat as success).
 */
export async function recordOptOut(
  sb: SupabaseClient,
  opts: { email: string; siteId?: string | null; channel?: string | null },
): Promise<boolean> {
  const email = lc(opts.email);
  if (!email) return false;
  const siteId = opts.siteId && UUID_RX.test(opts.siteId) ? opts.siteId : null;
  const channel = opts.channel ?? null;
  try {
    let q = sb.from('email_opt_outs').select('id').eq('email', email).limit(1);
    q = siteId ? q.eq('site_id', siteId) : q.is('site_id', null);
    q = channel ? q.eq('channel', channel) : q.is('channel', null);
    const { data } = await q;
    if (Array.isArray(data) && data.length > 0) return true; // already recorded

    const { error } = await sb.from('email_opt_outs').insert({ email, site_id: siteId, channel });
    if (error) {
      // A concurrent one-click may have inserted first (unique
      // violation) — that's still "the address is suppressed".
      console.warn('[suppression] recordOptOut insert:', error.message);
      return true;
    }
    return true;
  } catch (e) {
    console.error('[suppression] recordOptOut failed:', e);
    return false;
  }
}

/** True if `email` should be skipped for `siteId` (opt-out or bounce). */
export async function isSuppressed(
  sb: SupabaseClient,
  email: string,
  siteId?: string | null,
): Promise<boolean> {
  const e = lc(email);
  if (!e) return false;
  const site = siteId && UUID_RX.test(siteId) ? siteId : null;

  // 1) opt-out list — a global row OR one scoped to this site.
  try {
    let q = sb.from('email_opt_outs').select('id').eq('email', e).limit(1);
    q = site ? q.or(`site_id.is.null,site_id.eq.${site}`) : q.is('site_id', null);
    const { data, error } = await q;
    if (!error && Array.isArray(data) && data.length > 0) return true;
  } catch {
    /* fail-open */
  }

  // 2) a hard bounce recorded on the guest row for this site.
  if (site) {
    try {
      const { data, error } = await sb
        .from('guests')
        .select('id')
        .eq('site_id', site)
        .ilike('email', e)
        .not('email_bounced_at', 'is', null)
        .limit(1);
      if (!error && Array.isArray(data) && data.length > 0) return true;
    } catch {
      /* fail-open */
    }
  }

  return false;
}

/**
 * Batch variant for fan-out sends — one pair of queries covers the
 * whole recipient list. Returns the set of lowercased emails to skip.
 * Callers test membership with `set.has(email.toLowerCase())`.
 */
export async function suppressedEmails(
  sb: SupabaseClient,
  emails: Array<string | null | undefined>,
  siteId?: string | null,
): Promise<Set<string>> {
  const out = new Set<string>();
  const lowered = Array.from(new Set(emails.filter(Boolean).map((x) => lc(x as string))));
  if (lowered.length === 0) return out;
  const site = siteId && UUID_RX.test(siteId) ? siteId : null;

  // opt-outs matching any recipient (global row or this site).
  try {
    let q = sb.from('email_opt_outs').select('email').in('email', lowered);
    q = site ? q.or(`site_id.is.null,site_id.eq.${site}`) : q.is('site_id', null);
    const { data, error } = await q;
    if (!error) {
      for (const r of (data ?? []) as Array<{ email?: string }>) if (r.email) out.add(lc(r.email));
    }
  } catch {
    /* fail-open */
  }

  // bounced guest rows for this site (typically a short list).
  if (site) {
    try {
      const { data, error } = await sb
        .from('guests')
        .select('email')
        .eq('site_id', site)
        .not('email_bounced_at', 'is', null);
      if (!error) {
        for (const r of (data ?? []) as Array<{ email?: string | null }>) if (r.email) out.add(lc(r.email));
      }
    } catch {
      /* fail-open */
    }
  }

  return out;
}
