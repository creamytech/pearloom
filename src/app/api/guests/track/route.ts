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
  if (!token || !column) return NextResponse.json({ ok: false });

  const supabase = sb();
  if (!supabase) return NextResponse.json({ ok: true, stored: false });

  try {
    // Resolve the guest by passport_token; stamp the column once.
    const { data } = await supabase
      .from('guests')
      .select('id, invite_opened_at, reply_started_at')
      .eq('passport_token', token)
      .maybeSingle();
    const guest = data as unknown as { id: string; invite_opened_at: string | null; reply_started_at: string | null } | null;
    if (!guest) return NextResponse.json({ ok: true, stored: false });
    if ((guest as unknown as Record<string, unknown>)[column]) {
      return NextResponse.json({ ok: true, stored: false }); // already stamped
    }
    await supabase
      .from('guests')
      .update({ [column]: new Date().toISOString() })
      .eq('id', guest.id);
    return NextResponse.json({ ok: true, stored: true });
  } catch (err) {
    console.error('[guests/track]', err);
    return NextResponse.json({ ok: false });
  }
}
