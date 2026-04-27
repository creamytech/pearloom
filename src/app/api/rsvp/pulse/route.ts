// ─────────────────────────────────────────────────────────────
// Pearloom / api/rsvp/pulse — public live counts + recent stream.
//
// GET /api/rsvp/pulse?siteId=<slug>
//   → { yes, no, pending, total, recent: [{ firstName, status, ts }] }
//
// Public (no auth) so the live site can render the RSVP counter
// ribbon to guests. We expose ONLY first names + status + the
// timestamp the row was responded — no email, no message, no
// last name. Cap recent at 5. The host has the editor for the
// full picture.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function firstNameOnly(full: string | null | undefined): string {
  if (!full) return 'A guest';
  const trimmed = full.trim();
  if (!trimmed) return 'A guest';
  return trimmed.split(/\s+/)[0];
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`rsvp-pulse:${ip}`, { max: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const siteId = req.nextUrl.searchParams.get('siteId') ?? '';
  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Graceful empty pulse when Supabase isn't configured (local
    // dev). Lets the renderer hide the ribbon instead of erroring.
    return NextResponse.json({ yes: 0, no: 0, pending: 0, total: 0, recent: [] });
  }

  try {
    const { data, error } = await supabase
      .from('guests')
      .select('name, status, responded_at, created_at')
      .eq('site_id', siteId)
      .order('responded_at', { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) throw error;

    const rows = (data ?? []) as Array<{ name: string | null; status: string | null; responded_at: string | null; created_at: string | null }>;

    // Status normalisation — guests table has historically used
    // 'attending' / 'declined' / 'pending' / 'not_attending'.
    let yes = 0, no = 0, pending = 0;
    for (const r of rows) {
      const s = (r.status ?? '').toLowerCase();
      if (s === 'attending' || s === 'yes' || s === 'accepted') yes += 1;
      else if (s === 'declined' || s === 'not_attending' || s === 'no') no += 1;
      else pending += 1;
    }

    // Recent stream — the 5 most-recent responded rows. Only
    // first-name + bucketed status + timestamp.
    const recent = rows
      .filter((r) => r.responded_at && r.status && r.status !== 'pending')
      .slice(0, 5)
      .map((r) => ({
        firstName: firstNameOnly(r.name),
        status: ((r.status ?? '').toLowerCase() === 'attending' || (r.status ?? '').toLowerCase() === 'yes')
          ? 'yes' as const
          : 'no' as const,
        ts: r.responded_at,
      }));

    return NextResponse.json({ yes, no, pending, total: rows.length, recent });
  } catch (err) {
    console.error('[rsvp/pulse] read failed:', err);
    return NextResponse.json({ yes: 0, no: 0, pending: 0, total: 0, recent: [] }, { status: 200 });
  }
}
