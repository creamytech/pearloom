// ─────────────────────────────────────────────────────────────
// /api/guest/connections — opt-in "people you've celebrated with".
//
//   GET  ?token=<guest credential>
//     → { available, optedIn, faces: [{ firstName }] }
//   POST { token, optIn: boolean }
//     → { ok, optedIn }
//
// MUTUAL opt-in, enforced server-side both ways: faces only
// compute when the requester opted in, and only return people
// whose own connections_opt_in is true. First names only — no
// emails, no full rosters, nothing for guests who stay opted out
// (the default, people.connections_opt_in DEFAULT false).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  resolveGuestToken,
  getConnectionsOptIn,
  setConnectionsOptIn,
  familiarFacesForPerson,
} from '@/lib/people';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ available: false, optedIn: false, faces: [] });

    const guest = await resolveGuestToken(supabase, req.nextUrl.searchParams.get('token'));
    if (!guest) return NextResponse.json({ error: 'Unknown guest link' }, { status: 401 });
    // No person record (no email on the invite) → the graph can't
    // recognize them; the card explains rather than erroring.
    if (!guest.personId) return NextResponse.json({ available: false, optedIn: false, faces: [] });

    const optedIn = await getConnectionsOptIn(supabase, guest.personId);
    if (!optedIn) return NextResponse.json({ available: true, optedIn: false, faces: [] });

    const faces = await familiarFacesForPerson(supabase, {
      personId: guest.personId,
      siteId: guest.siteId,
    });
    return NextResponse.json({
      available: true,
      optedIn: true,
      faces: faces.map((f) => ({ firstName: f.firstName })),
    });
  } catch (err) {
    console.error('[guest/connections] GET failed:', err);
    return NextResponse.json({ available: false, optedIn: false, faces: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    let parsed: { token?: string; optIn?: boolean };
    try {
      parsed = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const rate = checkRateLimit(`connections:${parsed.token ?? ip}`, { max: 10, windowMs: 300_000 });
    if (!rate.allowed) return NextResponse.json({ error: 'Try again in a moment.' }, { status: 429 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

    const guest = await resolveGuestToken(supabase, parsed.token);
    if (!guest) return NextResponse.json({ error: 'Unknown guest link' }, { status: 401 });
    if (!guest.personId) {
      return NextResponse.json({ error: 'Connections need an email on your invite.' }, { status: 400 });
    }

    const optIn = parsed.optIn === true;
    const ok = await setConnectionsOptIn(supabase, guest.personId, optIn);
    if (!ok) return NextResponse.json({ error: 'Could not save — try again?' }, { status: 500 });
    return NextResponse.json({ ok: true, optedIn: optIn });
  } catch (err) {
    console.error('[guest/connections] POST failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
