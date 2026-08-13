// ─────────────────────────────────────────────────────────────
// Pearloom / api/friends/person — the PERSON CARD (SOCIAL-PLAN S1).
//
// A minimal, PRIVATE profile of one mutual connection: first name,
// the published celebrations the pair shares, and known dietary.
// Visible ONLY to an accepted mutual connection — personCard()
// re-verifies the friendship server-side; the client's word is
// never trusted. Session-authed, rate-limited, never crawlable
// (JSON API, no public page).
//
//   GET ?personId=<uuid> → { ok, card: { firstName,
//     sharedCelebrations[], dietary } }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { resolvePersonId } from '@/lib/people';
import { personCard } from '@/lib/friends';

export const dynamic = 'force-dynamic';

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`friends:card:${ip}`, { max: 60, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'Not configured' }, { status: 503 });

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const viewerId = await resolvePersonId(sb, { email, name: session?.user?.name ?? undefined });
  if (!viewerId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const otherId = req.nextUrl.searchParams.get('personId') ?? '';
  const card = await personCard(sb, { viewerId, otherId });
  if (!card) {
    // Not found and not-your-connection are deliberately the same
    // answer — the card must not confirm whether a person exists.
    return NextResponse.json({ ok: false, error: 'Not available' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, card });
}
