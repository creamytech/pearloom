// ─────────────────────────────────────────────────────────────
// Pearloom / lib/budget/split-access.ts — the split ledger's gate
// (GRAND-PLAN Phase 1, the keystone API layer).
//
// ONE place that answers "may this caller touch THIS site's split
// ledger, and who are they?" — shared by /api/split, .../participants,
// and .../expenses so the three routes can't drift.
//
// Private-by-default (bachelor/ette): a caller must be EITHER
//   • the site OWNER  (session email === the site's creator_email), OR
//   • a valid GUEST   (a passport token that resolves to THIS site).
// No anonymous access; a token minted for a different site is treated
// as no token, so one site's ledger never leaks to another's guest.
//
// Pearloom never touches the money — these routes are a ledger and
// settle-up rides the hosts' own P2P handles. Everything here is
// service-role (the tables are deny-anon; see 20260706_group_split.sql).
// ─────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { ownerEmailOf } from '@/lib/cohost-access';
import { resolveGuestToken, type ResolvedTokenGuest } from '@/lib/people';

export const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** $10M ceiling — comfortably above any real group expense. */
export const MAX_CENTS = 1_000_000_000;
export const MAX_NAME_LEN = 80;
export const MAX_DESC_LEN = 140;

export function getSplitSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ── DB rows (snake_case) → app (camelCase) ────────────────────

export interface ParticipantRow {
  id: string;
  site_id: string;
  celebration_id: string | null;
  person_id: string | null;
  display_name: string;
  email: string | null;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  site_id: string;
  celebration_id?: string | null;
  payer_id: string;
  description: string;
  amount_cents: number;
  currency: string;
  split_mode: string;
  spent_on: string | null;
  created_by_email: string | null;
  created_at: string;
}

export interface ShareRow {
  id: string;
  expense_id: string;
  participant_id: string;
  share_cents: number;
  weight: number | null;
}

export function viewParticipant(r: ParticipantRow) {
  return {
    id: r.id,
    siteId: r.site_id,
    personId: r.person_id,
    displayName: r.display_name,
    email: r.email,
    createdAt: r.created_at,
  };
}

/** An expense row with its per-participant share map attached (cents). */
export function viewExpense(r: ExpenseRow, shares: Record<string, number>) {
  return {
    id: r.id,
    siteId: r.site_id,
    payerId: r.payer_id,
    description: r.description,
    amountCents: r.amount_cents,
    currency: r.currency,
    splitMode: r.split_mode,
    spentOn: r.spent_on,
    createdByEmail: r.created_by_email,
    createdAt: r.created_at,
    shares,
  };
}

// ── The gate ──────────────────────────────────────────────────

export interface SplitAccess {
  supabase: SupabaseClient;
  /** The site's canonical uuid (the tables key on this as text). */
  siteId: string;
  isOwner: boolean;
  ownerEmail: string;
  /** Session email when signed in, lowercased — used for created_by. */
  sessionEmail: string | null;
  /** The resolved guest identity when the caller is a guest, else null. */
  guest: ResolvedTokenGuest | null;
  /** Who to stamp on a write's created_by_email (owner email or the
   *  guest's email; null for a name-only guest). */
  actorEmail: string | null;
}

export type SplitGate =
  | { ok: true; access: SplitAccess }
  | { ok: false; res: NextResponse };

const deny = (status: number, error: string): { ok: false; res: NextResponse } => ({
  ok: false,
  res: NextResponse.json({ ok: false, error }, { status }),
});

export interface GateOpts {
  rawSiteId: string | null | undefined;
  token?: string | null;
  /** Writes get the tighter rate bucket + a 503 when storage is absent. */
  write: boolean;
}

/**
 * Resolve the site (by uuid OR subdomain), authenticate the caller as
 * owner or guest, and rate-limit. Returns a ready-to-use SplitAccess or
 * the exact NextResponse to return.
 */
export async function gateSplit(_req: NextRequest, opts: GateOpts): Promise<SplitGate> {
  const supabase = getSplitSupabase();
  if (!supabase) {
    // Env-less deploys: reads degrade softly to an empty ledger (matching
    // /api/sites/budget/lines); writes say so honestly.
    if (opts.write) {
      return deny(503, 'The split ledger isn’t set up yet.');
    }
    return {
      ok: false,
      res: NextResponse.json({
        ok: true,
        stored: false,
        participants: [],
        expenses: [],
        balances: {},
        settleUp: [],
      }),
    };
  }

  const rawSiteId = opts.rawSiteId?.trim();
  if (!rawSiteId) return deny(400, 'siteId required');

  // Resolve the site by canonical uuid or subdomain (the budget/lines gate).
  const lookup = supabase.from('sites').select('id, subdomain, creator_email, site_config');
  const { data: site, error } = await (UUID_RX.test(rawSiteId)
    ? lookup.eq('id', rawSiteId)
    : lookup.eq('subdomain', rawSiteId)
  ).maybeSingle();
  if (error || !site) return deny(404, 'Site not found');

  const siteId = String((site as { id: string }).id);
  const ownerEmail = ownerEmailOf(site as { creator_email?: unknown; site_config?: unknown });

  // Caller identity — prefer an owning session; else a valid guest token.
  const session = await getServerSession(authOptions);
  const sessionEmail = session?.user?.email?.toLowerCase().trim() || null;
  const isOwner = !!sessionEmail && !!ownerEmail && sessionEmail === ownerEmail;

  const token = typeof opts.token === 'string' ? opts.token : null;
  let guest: ResolvedTokenGuest | null = null;
  if (!isOwner && token) {
    const resolved = await resolveGuestToken(supabase, token);
    // A token only ever authorizes ITS OWN site.
    if (resolved && resolved.siteId === siteId) guest = resolved;
  }

  if (!isOwner && !guest) {
    // Don't leak site existence: a signed-in non-owner is Forbidden, an
    // anonymous caller Unauthorized — both dead ends.
    return deny(sessionEmail ? 403 : 401, sessionEmail ? 'Forbidden' : 'Unauthorized');
  }

  const bucket = isOwner ? `o:${sessionEmail}` : `g:${token}`;
  const rate = checkRateLimit(`split:${opts.write ? 'w' : 'r'}:${siteId}:${bucket}`, {
    max: opts.write ? 40 : 120,
    windowMs: 60_000,
  });
  if (!rate.allowed) return deny(429, 'Too many requests');

  const actorEmail = isOwner
    ? sessionEmail
    : guest?.email
      ? guest.email.toLowerCase().trim()
      : null;

  return {
    ok: true,
    access: { supabase, siteId, isOwner, ownerEmail, sessionEmail, guest, actorEmail },
  };
}
