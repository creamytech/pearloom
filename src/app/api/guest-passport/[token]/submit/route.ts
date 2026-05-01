// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/guest-passport/[token]/submit/route.ts
//
// Public endpoint (no auth, token-gated): handles all four kinds
// of guest-authored submissions that flow out of the passport page:
//   • memory:   response to the per-guest memory prompt
//   • whisper:  private note, slow-delivered to the couple
//   • capsule:  sealed note, revealed on the Nth anniversary
//   • song:     request for the collaborative playlist
//
// Rate-limited per token + kind to discourage spam.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function randomDeliveryWindow(): Date {
  // Spread delivery across the next 14 days — honeymoon-friendly
  // drip so the couple gets a slow trickle, not a firehose.
  const days = Math.floor(Math.random() * 14);
  const hours = Math.floor(Math.random() * 24);
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours);
  return d;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const rl = checkRateLimit(`passport-submit:${token}`, { max: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Slow down — try again in a minute.' }, { status: 429 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { data: guest, error: guestErr } = await supabase
    .from('pearloom_guests')
    .select('id, site_id, display_name')
    .eq('guest_token', token)
    .maybeSingle();
  if (guestErr || !guest) {
    return NextResponse.json({ error: 'Passport not found' }, { status: 404 });
  }
  const guestName = guest.display_name;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const kind: string = (body as { kind?: string }).kind ?? '';

  if (kind === 'memory') {
    const text = String((body as { response?: unknown }).response ?? '').trim();
    if (!text) return NextResponse.json({ error: 'Response required' }, { status: 400 });
    if (text.length > 3000) return NextResponse.json({ error: 'Too long' }, { status: 400 });
    // Update the most-recent prompt row for this guest.
    const { data: prompt } = await supabase
      .from('memory_prompts')
      .select('id')
      .eq('guest_id', guest.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!prompt) {
      return NextResponse.json({ error: 'No memory prompt' }, { status: 404 });
    }
    const { error: upErr } = await supabase
      .from('memory_prompts')
      .update({ response: text, responded_at: new Date().toISOString() })
      .eq('id', prompt.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (kind === 'whisper') {
    const text = String((body as { body?: unknown }).body ?? '').trim();
    if (!text) return NextResponse.json({ error: 'Whisper required' }, { status: 400 });
    if (text.length > 1500) return NextResponse.json({ error: 'Too long' }, { status: 400 });
    const { error: insErr } = await supabase.from('whispers').insert({
      site_id: guest.site_id,
      guest_id: guest.id,
      guest_name: guestName,
      body: text,
      is_private: true,
      deliver_after: randomDeliveryWindow().toISOString(),
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (kind === 'capsule') {
    const text = String((body as { body?: unknown }).body ?? '').trim();
    const years = Number((body as { years?: unknown }).years ?? 1);
    if (!text) return NextResponse.json({ error: 'Note required' }, { status: 400 });
    if (text.length > 2000) return NextResponse.json({ error: 'Too long' }, { status: 400 });
    const yrs = Math.min(50, Math.max(1, Math.round(years)));
    const reveal = new Date();
    reveal.setFullYear(reveal.getFullYear() + yrs);
    const { error: insErr } = await supabase.from('time_capsule').insert({
      site_id: guest.site_id,
      guest_id: guest.id,
      guest_name: guestName,
      body: text,
      reveal_years: yrs,
      reveal_on: reveal.toISOString().slice(0, 10),
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (kind === 'song') {
    const title = String((body as { title?: unknown }).title ?? '').trim();
    const artist = String((body as { artist?: unknown }).artist ?? '').trim() || null;
    const spotify = String((body as { spotify?: unknown }).spotify ?? '').trim() || null;
    const note = String((body as { note?: unknown }).note ?? '').trim() || null;
    if (!title) return NextResponse.json({ error: 'Song title required' }, { status: 400 });
    const { error: insErr } = await supabase.from('song_requests').insert({
      site_id: guest.site_id,
      guest_id: guest.id,
      guest_name: guestName,
      song_title: title,
      artist,
      spotify_url: spotify,
      note,
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown kind' }, { status: 400 });
}
