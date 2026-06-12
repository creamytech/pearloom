// ─────────────────────────────────────────────────────────────
// GET /api/giphy/search?q=…&token=…
//
// GIPHY proxy for the guest thread's GIF picker. Server-side so
// the GIPHY key never ships to the client. Guest-token gated
// (the same credential /api/messages accepts) — anonymous
// internet traffic can't burn the quota. Empty q → trending.
//
// Returns { ok, gifs: [{ id, url, preview, width, height }] }
// — `url` is the downsized render (kept under ~2MB, what the
// thread stores as the message body), `preview` the small grid
// thumb. Rating pinned to 'pg' — this surfaces at celebrations
// with grandparents in the room.
//
// Keyless deploys return { ok: false } and the picker simply
// doesn't render — same graceful-degrade contract as every
// other keyed feature.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { resolveGuestToken } from '@/lib/people';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export const dynamic = 'force-dynamic';

interface GiphyImage { url?: string; width?: string; height?: string }
interface GiphyHit {
  id?: string;
  images?: {
    fixed_width_downsampled?: GiphyImage;
    downsized?: GiphyImage;
    original?: GiphyImage;
  };
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, gifs: [] });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim().slice(0, 80);
  const token = (searchParams.get('token') ?? '').trim();

  // Guest-token gate — the picker only lives on token-authed
  // guest surfaces, so require the same credential they carry.
  const supabase = getSupabase();
  const guest = supabase && token ? await resolveGuestToken(supabase, token) : null;
  if (!guest) {
    return NextResponse.json({ ok: false, error: 'Not on the guest list.' }, { status: 401 });
  }

  const rate = checkRateLimit(`giphy:${getClientIp(req)}`, { max: 30, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'Slow down a moment.' }, { status: 429 });
  }

  try {
    const endpoint = q
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=18&rating=pg&lang=en`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=18&rating=pg`;
    const res = await fetch(endpoint, { next: { revalidate: 60 } });
    if (!res.ok) {
      console.warn('[giphy/search] upstream', res.status);
      return NextResponse.json({ ok: false, gifs: [] }, { status: 502 });
    }
    const data = (await res.json()) as { data?: GiphyHit[] };
    const gifs = (data.data ?? [])
      .map((g) => {
        const full = g.images?.downsized?.url || g.images?.original?.url;
        const preview = g.images?.fixed_width_downsampled?.url || full;
        if (!g.id || !full || !preview) return null;
        return {
          id: g.id,
          url: full,
          preview,
          width: Number(g.images?.downsized?.width ?? 0) || undefined,
          height: Number(g.images?.downsized?.height ?? 0) || undefined,
        };
      })
      .filter(Boolean);
    return NextResponse.json({ ok: true, gifs });
  } catch (err) {
    console.warn('[giphy/search] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, gifs: [] }, { status: 502 });
  }
}
