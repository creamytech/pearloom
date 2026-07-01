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
    // Resolve the guest — `?g=` links carry either token column
    // (passport_token from the plus-one/invite flow, guest_token from
    // add/import + dashboard links; new rows mint both). Same
    // fallback order as /api/sites/guest-passport.
    let { data: guest } = await supabase
      .from('guests')
      .select('id')
      .eq('passport_token', token)
      .maybeSingle();
    if (!guest) {
      ({ data: guest } = await supabase
        .from('guests')
        .select('id')
        .eq('guest_token', token)
        .maybeSingle());
    }
    if (!guest) return NextResponse.json({ ok: true, stored: false });

    // First-write-wins: `.is(column, null)` makes the stamp atomic, so
    // concurrent pings (two tabs, double mount) can't overwrite the
    // true first-touch timestamp.
    const { data: updated } = await supabase
      .from('guests')
      .update({ [column]: new Date().toISOString() })
      .eq('id', guest.id)
      .is(column, null)
      .select('id');
    return NextResponse.json({ ok: true, stored: (updated ?? []).length > 0 });
  } catch (err) {
    console.error('[guests/track]', err);
    return NextResponse.json({ ok: false });
  }
}
