// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/guests/track/route.ts
//
// Public, rate-limited funnel pings from the published site. A guest
// opening their personal invite link stamps invite_opened_at; opening
// the RSVP form stamps reply_started_at. Both are idempotent (set
// only when null) so a single real timestamp is kept — never an
// inflated count. Fire-and-forget from the client; failure is silent
// and never blocks the guest. Feeds the Analytics RSVP funnel.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const COLUMN: Record<string, string> = {
  opened: 'invite_opened_at',
  started: 'reply_started_at',
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`guests-track:${ip}`, { max: 30, windowMs: 60 * 1000 });
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 });

  let body: { token?: string; event?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const token = String(body.token ?? '').trim().slice(0, 64);
  const column = COLUMN[String(body.event ?? '')];
  if (!token || !column) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = sb();
  if (!supabase) return NextResponse.json({ ok: true, stored: false });

  try {
    // A personal link's `?g=<token>` may resolve via either column —
    // passport_token first, then legacy guest_token (same fallback as
    // /api/sites/guest-passport; older links only carry guest_token,
    // and dropping them silently undercounts the funnel forever).
    // The stamp itself is one conditional UPDATE: `.is(column, null)`
    // keeps it idempotent without a read-then-write round trip.
    const stamp = { [column]: new Date().toISOString() };
    const { data: viaPassport } = await supabase
      .from('guests')
      .update(stamp)
      .eq('passport_token', token)
      .is(column, null)
      .select('id');
    let stored = (viaPassport ?? []).length > 0;
    if (!stored) {
      const { data: viaLegacy } = await supabase
        .from('guests')
        .update(stamp)
        .eq('guest_token', token)
        .is(column, null)
        .select('id');
      stored = (viaLegacy ?? []).length > 0;
    }
    return NextResponse.json({ ok: true, stored });
  } catch (err) {
    console.error('[guests/track]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
