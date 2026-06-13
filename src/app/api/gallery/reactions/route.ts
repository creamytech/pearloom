// ─────────────────────────────────────────────────────────────
// Pearloom / api/gallery/reactions — read counts for a site.
//
// GET /api/gallery/reactions?siteId=<slug>
//   → { counts: { [photoUrl]: number }, mine: { [photoUrl]: true } }
//
// `mine` reflects which photos the requesting reactor (cookie)
// has already hearted, so the lightbox can render the heart in
// "active" state without an extra round trip per photo.
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

const COOKIE_NAME = 'pl_react_token';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`gallery-reactions:${ip}`, { max: 120, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const siteId = req.nextUrl.searchParams.get('siteId') ?? '';
  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ counts: {}, mine: {} });
  }

  try {
    const { data, error } = await supabase
      .from('photo_reactions')
      .select('photo_url, reactor_token')
      .eq('site_id', siteId)
      .eq('kind', 'love');
    if (error) throw error;

    const reactorToken = req.cookies.get(COOKIE_NAME)?.value ?? '';
    const counts: Record<string, number> = {};
    const mine: Record<string, true> = {};
    for (const row of data ?? []) {
      const url = (row as { photo_url: string }).photo_url;
      const tk = (row as { reactor_token: string }).reactor_token;
      counts[url] = (counts[url] ?? 0) + 1;
      if (tk === reactorToken) mine[url] = true;
    }
    return NextResponse.json({ counts, mine });
  } catch (err) {
    console.error('[gallery/reactions] read failed:', err);
    return NextResponse.json({ counts: {}, mine: {} });
  }
}
