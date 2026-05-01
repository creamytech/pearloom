// ─────────────────────────────────────────────────────────────
// Pearloom / api/gallery/react — toggle a heart on a gallery photo.
//
// POST { siteSlug, photoUrl }
//   → { ok: true, reacted: boolean, count: number }
//
// Sets a long-lived `pl_react_token` cookie on first call so we
// can dedupe reactions per browser without auth. Anyone who
// clears cookies can react again — that's fine, this is a
// "vibe check" feature, not a vote.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const COOKIE_NAME = 'pl_react_token';
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365; // 1 year

interface Body {
  siteSlug?: string;
  photoUrl?: string;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`gallery-react:${ip}`, { max: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many reactions' }, { status: 429 });
  }

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const siteSlug = (body.siteSlug ?? '').trim();
  const photoUrl = (body.photoUrl ?? '').trim();
  if (!siteSlug || !photoUrl) {
    return NextResponse.json({ error: 'siteSlug and photoUrl required' }, { status: 400 });
  }
  // Photo URLs are arbitrary R2 / Google CDN links — bound the
  // length so a malicious caller can't fill the column with a
  // 50 KB string.
  if (photoUrl.length > 1024) {
    return NextResponse.json({ error: 'photoUrl too long' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, reacted: false, count: 0 }, { status: 503 });
  }

  // Mint a reactor token on first interaction. Token format is
  // 24 random hex chars — long enough to avoid collisions across
  // millions of guests, short enough to fit nicely in a cookie.
  let reactorToken = req.cookies.get(COOKIE_NAME)?.value ?? '';
  let setCookie = false;
  if (!reactorToken || reactorToken.length < 12) {
    reactorToken = randomBytes(12).toString('hex');
    setCookie = true;
  }

  // Toggle: try to delete first; if no row matched, insert.
  const { data: deleteData, error: deleteErr } = await supabase
    .from('photo_reactions')
    .delete()
    .match({ site_id: siteSlug, photo_url: photoUrl, reactor_token: reactorToken, kind: 'love' })
    .select('id');
  if (deleteErr) {
    console.error('[gallery/react] delete failed:', deleteErr.message);
    return NextResponse.json({ error: 'Failed to toggle' }, { status: 500 });
  }
  let reacted = false;
  if (!deleteData || deleteData.length === 0) {
    // No prior reaction — insert one.
    const { error: insertErr } = await supabase
      .from('photo_reactions')
      .insert({
        site_id: siteSlug,
        photo_url: photoUrl,
        reactor_token: reactorToken,
        kind: 'love',
      });
    if (insertErr) {
      console.error('[gallery/react] insert failed:', insertErr.message);
      return NextResponse.json({ error: 'Failed to react' }, { status: 500 });
    }
    reacted = true;
  }

  // Updated count for this photo.
  const { count } = await supabase
    .from('photo_reactions')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteSlug)
    .eq('photo_url', photoUrl)
    .eq('kind', 'love');

  const res = NextResponse.json({ ok: true, reacted, count: count ?? 0 });
  if (setCookie) {
    res.cookies.set(COOKIE_NAME, reactorToken, {
      maxAge: COOKIE_MAX_AGE_S,
      sameSite: 'lax',
      // HttpOnly so the cookie can't be read from JS — the value
      // never needs to be visible to the page; the route handles
      // dedup. Path / so it's sent on every gallery request on
      // the same domain.
      httpOnly: true,
      path: '/',
    });
  }
  return res;
}
