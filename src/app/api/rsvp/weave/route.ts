// ─────────────────────────────────────────────────────────────
// Pearloom / api/rsvp/weave — public strand feed for The Loom.
//
// GET /api/rsvp/weave?subdomain=<slug>
//   → { ok: true, strands: [{ seed, t }], total }
//
// Feeds the RSVP section's LoomTapestry: one strand per ATTENDING
// reply. Privacy-first — NO PII leaves this route. Each strand is
//   seed — first 8 hex chars of sha256(guest row uuid); stable per
//          guest, meaningless to everyone else.
//   t    — 0..1 position in responded_at order (earliest reply 0,
//          latest 1), so early guests sit at the top of the cloth.
// Mirrors the /api/song-requests public=1 shape: resolve the
// subdomain → site uuid server-side, never trust a raw site id.
// Cached a few minutes; rate-limited lightly per IP.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=180, s-maxage=180, stale-while-revalidate=300',
};

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Short, stable, non-reversible-to-PII strand seed from a row id. */
function strandSeed(rowId: string): string {
  return createHash('sha256').update(rowId).digest('hex').slice(0, 8);
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`rsvp-weave:${ip}`, { max: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  const subdomain = req.nextUrl.searchParams.get('subdomain')?.trim();
  if (!subdomain) {
    return NextResponse.json({ ok: false, error: 'subdomain required' }, { status: 400 });
  }

  const supabase = sb();
  if (!supabase) {
    // Graceful empty cloth when Supabase isn't configured (local dev).
    return NextResponse.json({ ok: true, strands: [], total: 0 }, { headers: CACHE_HEADERS });
  }

  try {
    // Resolve subdomain → site uuid for the FK on guests.
    const { data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();
    const siteUuid = (site as { id?: string } | null)?.id;
    if (!siteUuid) {
      return NextResponse.json({ ok: true, strands: [], total: 0 }, { headers: CACHE_HEADERS });
    }

    // Attending replies only — same status normalisation family as
    // /api/rsvp/pulse ('attending' is canonical; 'yes' / 'accepted'
    // are historical spellings on older rows).
    const { data, error } = await supabase
      .from('guests')
      .select('id, status, responded_at, created_at')
      .eq('site_id', siteUuid)
      .in('status', ['attending', 'yes', 'accepted'])
      .order('responded_at', { ascending: true, nullsFirst: false })
      .limit(400);
    if (error) throw error;

    const rows = (data ?? []) as Array<{
      id: string;
      responded_at: string | null;
      created_at: string | null;
    }>;
    // Normalise the order client-visibly: responded_at wins, older
    // imports without one fall back to created_at.
    rows.sort((a, b) =>
      (a.responded_at ?? a.created_at ?? '').localeCompare(b.responded_at ?? b.created_at ?? ''),
    );

    const n = rows.length;
    const strands = rows.map((row, i) => ({
      seed: strandSeed(String(row.id)),
      t: n <= 1 ? 0.5 : i / (n - 1),
    }));

    return NextResponse.json({ ok: true, strands, total: n }, { headers: CACHE_HEADERS });
  } catch (err) {
    console.error('[rsvp/weave] read failed:', err);
    return NextResponse.json({ ok: true, strands: [], total: 0 }, { status: 200 });
  }
}
