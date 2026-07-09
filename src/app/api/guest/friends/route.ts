// ─────────────────────────────────────────────────────────────
// /api/guest/friends — the light friend layer (GRAND-PLAN Phase 4)
// on top of the opt-in "people you've celebrated with" base.
//
//   GET  ?token=<guest credential>
//     → { available, optedIn,
//         friends:    [{ firstName }],
//         incoming:   [{ firstName, otherId }],
//         candidates: [{ firstName, personId }] }
//   POST { token, action: 'request' | 'accept' | 'decline', otherPersonId }
//     → { ok, status? }
//
// Token-authed via the guest's passport token → their person id.
// Consent is the request → accept handshake; a request may only be
// SENT to a mutual-opt-in familiar face (both opted in + a shared
// celebration). First names only ever leave here — never an email,
// never a last name. Candidates only compute for an opted-in caller
// (discovery is mutual, like /api/guest/connections). Default-quiet:
// nothing surfaces for guests who stay opted out.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { resolveGuestToken, getConnectionsOptIn } from '@/lib/people';
import {
  requestFriend,
  respondFriend,
  listFriends,
  pendingIncoming,
  friendCandidates,
  isRequestable,
} from '@/lib/friends';

export const dynamic = 'force-dynamic';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMPTY = { available: false, optedIn: false, friends: [], incoming: [], candidates: [] };

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json(EMPTY);

    const token = req.nextUrl.searchParams.get('token');
    const rate = checkRateLimit(`friends:get:${token ?? getClientIp(req)}`, { max: 40, windowMs: 60_000 });
    if (!rate.allowed) return NextResponse.json({ error: 'Try again in a moment.' }, { status: 429 });

    const guest = await resolveGuestToken(supabase, token);
    if (!guest) return NextResponse.json({ error: 'Unknown guest link' }, { status: 401 });
    // No person record (no email on the invite) → the graph can't
    // recognize them; the card explains rather than erroring.
    if (!guest.personId) return NextResponse.json(EMPTY);

    // Existing relationships are always visible to the person in them.
    const [friends, incoming, optedIn] = await Promise.all([
      listFriends(supabase, guest.personId),
      pendingIncoming(supabase, guest.personId),
      getConnectionsOptIn(supabase, guest.personId),
    ]);

    // Discovery is mutual: candidates only for an opted-in caller.
    const candidates = optedIn
      ? await friendCandidates(supabase, { personId: guest.personId, siteId: guest.siteId })
      : [];

    return NextResponse.json({
      available: true,
      optedIn,
      friends: friends.map((f) => ({ firstName: f.firstName })),
      incoming: incoming.map((i) => ({ firstName: i.firstName, otherId: i.otherId })),
      candidates: candidates.map((c) => ({ firstName: c.firstName, personId: c.personId })),
    });
  } catch (err) {
    console.error('[guest/friends] GET failed:', err);
    return NextResponse.json(EMPTY);
  }
}

type Action = 'request' | 'accept' | 'decline';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    let parsed: { token?: string; action?: string; otherPersonId?: string };
    try {
      parsed = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const rate = checkRateLimit(`friends:post:${parsed.token ?? ip}`, { max: 20, windowMs: 300_000 });
    if (!rate.allowed) return NextResponse.json({ error: 'Try again in a moment.' }, { status: 429 });

    const action = parsed.action as Action | undefined;
    if (action !== 'request' && action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    const otherPersonId = typeof parsed.otherPersonId === 'string' ? parsed.otherPersonId.trim() : '';
    if (!UUID_RX.test(otherPersonId)) {
      return NextResponse.json({ error: 'A person is required.' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

    const guest = await resolveGuestToken(supabase, parsed.token);
    if (!guest) return NextResponse.json({ error: 'Unknown guest link' }, { status: 401 });
    if (!guest.personId) {
      return NextResponse.json({ error: 'Connections need an email on your invite.' }, { status: 400 });
    }
    if (guest.personId === otherPersonId) {
      return NextResponse.json({ error: "That's you." }, { status: 400 });
    }

    if (action === 'request') {
      // Consent-first: you may only ask someone you've genuinely
      // celebrated with who also opted in — and you must be opted in
      // yourself (discovery is mutual).
      const optedIn = await getConnectionsOptIn(supabase, guest.personId);
      if (!optedIn) {
        return NextResponse.json({ error: 'Turn on connections to add friends.' }, { status: 403 });
      }
      const allowed = await isRequestable(supabase, {
        personId: guest.personId,
        siteId: guest.siteId,
        otherPersonId,
      });
      if (!allowed) {
        return NextResponse.json({ error: "That person isn't available to add." }, { status: 403 });
      }
      const res = await requestFriend(supabase, { fromPersonId: guest.personId, toPersonId: otherPersonId });
      if (!res.ok) return NextResponse.json({ error: 'Could not send. Try again?' }, { status: 500 });
      return NextResponse.json({ ok: true, status: res.status });
    }

    // accept / decline — respond to a request addressed to me.
    const res = await respondFriend(supabase, {
      personId: guest.personId,
      otherPersonId,
      accept: action === 'accept',
    });
    if (!res.ok) {
      const status = res.error === 'not_found' ? 404 : 500;
      return NextResponse.json({ error: 'Could not save. Try again?' }, { status });
    }
    return NextResponse.json({ ok: true, status: res.status });
  } catch (err) {
    console.error('[guest/friends] POST failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
