// ─────────────────────────────────────────────────────────────
// Pearloom / api/friends/route.ts — the HOST-side friend circle
// (GRAND-PLAN Phase 4). The account-holder counterpart to the
// guest-passport /api/guest/friends: a signed-in user manages the
// same first-names-only friend graph from the dashboard.
//
// Auth is the SESSION (not a passport token). The caller's identity
// in the people graph is resolved from their account email via
// resolvePersonId — closing the guest↔user gap (one person_id across
// both). Everything below is the same privacy contract as the guest
// API: mutual consent, opt-in (default off), first names only, no
// email / last name ever emitted.
//
//   GET  → { optedIn, friends[], incoming[], candidates[] }
//   POST { action:'opt-in', optIn }            — toggle discovery
//        { action:'request'|'accept'|'decline', otherPersonId, siteId? }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { resolvePersonId, getConnectionsOptIn, setConnectionsOptIn } from '@/lib/people';
import {
  listFriends,
  pendingIncoming,
  friendCandidates,
  requestFriend,
  respondFriend,
  isRequestable,
} from '@/lib/friends';

export const dynamic = 'force-dynamic';

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Resolve the signed-in caller to their people-graph id (upserting a
 *  person row for their account email if needed — this is what closes
 *  the guest↔user gap). Returns null when unauthenticated / unresolvable. */
async function callerPerson(
  sb: SupabaseClient,
  session: { user?: { email?: string | null; name?: string | null } } | null,
): Promise<string | null> {
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return null;
  return resolvePersonId(sb, { email, name: session?.user?.name ?? undefined });
}

/** Candidates the host could friend: mutual-opt-in familiar faces
 *  across every event where the host's OWN person appears as a guest
 *  (deduped). Discovery is gated on the caller being opted in, exactly
 *  like the guest API. Carries the siteId each was found through so a
 *  later `request` can re-verify requestability. */
async function hostCandidates(
  sb: SupabaseClient,
  personId: string,
): Promise<Array<{ firstName: string; personId: string; siteId: string }>> {
  try {
    // The sites where this person is a guest (their own attendance).
    const { data: mine } = await sb
      .from('guests')
      .select('site_id')
      .eq('person_id', personId)
      .limit(40);
    const siteIds = Array.from(new Set((mine ?? []).map((r) => String(r.site_id)))).slice(0, 20);
    const seen = new Set<string>();
    const out: Array<{ firstName: string; personId: string; siteId: string }> = [];
    for (const siteId of siteIds) {
      const faces = await friendCandidates(sb, { personId, siteId });
      for (const f of faces) {
        if (seen.has(f.personId)) continue;
        seen.add(f.personId);
        out.push({ firstName: f.firstName, personId: f.personId, siteId });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`friends:r:${ip}`, { max: 60, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true, available: false, optedIn: false, friends: [], incoming: [], candidates: [] });

  const session = await getServerSession(authOptions);
  const personId = await callerPerson(sb, session);
  if (!personId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [optedIn, friends, incoming] = await Promise.all([
    getConnectionsOptIn(sb, personId),
    listFriends(sb, personId),
    pendingIncoming(sb, personId),
  ]);
  // Discovery only when opted in — mutual, like the guest API.
  const candidates = optedIn ? await hostCandidates(sb, personId) : [];

  return NextResponse.json({ ok: true, available: true, optedIn, friends, incoming, candidates });
}

interface PostBody {
  action?: 'opt-in' | 'request' | 'accept' | 'decline';
  otherPersonId?: string;
  siteId?: string;
  optIn?: boolean;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`friends:w:${ip}`, { max: 30, windowMs: 5 * 60_000 }).allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'Not configured' }, { status: 503 });

  const session = await getServerSession(authOptions);
  const personId = await callerPerson(sb, session);
  if (!personId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  if (body.action === 'opt-in') {
    await setConnectionsOptIn(sb, personId, body.optIn === true);
    return NextResponse.json({ ok: true, optedIn: body.optIn === true });
  }

  const other = typeof body.otherPersonId === 'string' ? body.otherPersonId : '';
  if (!other || other === personId) {
    return NextResponse.json({ ok: false, error: 'otherPersonId required' }, { status: 400 });
  }

  if (body.action === 'request') {
    // A request may only go to a current mutual-opt-in familiar face —
    // re-verified server-side against the site the candidate came from.
    const siteId = typeof body.siteId === 'string' ? body.siteId : '';
    const ok = siteId && (await isRequestable(sb, { personId, siteId, otherPersonId: other }));
    if (!ok) return NextResponse.json({ ok: false, error: 'Not connectable' }, { status: 403 });
    const status = await requestFriend(sb, { fromPersonId: personId, toPersonId: other });
    return NextResponse.json({ ok: true, status });
  }

  if (body.action === 'accept' || body.action === 'decline') {
    const status = await respondFriend(sb, {
      personId,
      otherPersonId: other,
      accept: body.action === 'accept',
    });
    return NextResponse.json({ ok: true, status });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
