// ─────────────────────────────────────────────────────────────
// Pearloom / api/circle-invites/claim — redeem a personal circle-
// invite token (GRAND-PLAN-2 C.2/C.3).
//
// The SMS (and, later, email) circle invite carries a link to
// /signup?circle=<token>. Signup stashes the token; the first
// authed session POSTs it here. Claiming files the PENDING
// friendship from the inviter (their invite = their request) and
// returns the inviter's first name so the UI can offer the
// one-tap "Add ‹name› back?" — consent still runs through the
// invitee's accept, exactly like every other request.
//
//   POST { token } → { ok, inviterFirstName, inviterPersonId, status }
//
// Session-authed. Rate-limited hard: tokens are unguessable, but
// there's no reason to allow probing either.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { resolvePersonId } from '@/lib/people';
import { claimCircleInvite } from '@/lib/friends';

export const dynamic = 'force-dynamic';

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`circle-claim:${ip}`, { max: 10, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: { token?: string };
  try {
    body = (await req.json()) as { token?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token || token.length > 128) {
    return NextResponse.json({ ok: false, error: 'token required' }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'Not configured' }, { status: 503 });

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const personId = await resolvePersonId(sb, { email, name: session?.user?.name ?? undefined });
  if (!personId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const result = await claimCircleInvite(sb, { token, personId });
  if (!result.ok) {
    // not-found / claimed / self are all terminal for the client —
    // it should clear its stash rather than retry. 200 keeps that
    // signal simple; the ok flag carries the truth.
    return NextResponse.json({ ok: false, error: result.error ?? 'internal' }, { status: 200 });
  }
  return NextResponse.json({
    ok: true,
    inviterFirstName: result.inviterFirstName,
    inviterPersonId: result.inviterPersonId,
    status: result.status,
  });
}
