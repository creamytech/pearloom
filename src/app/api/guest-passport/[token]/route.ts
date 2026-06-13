// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/guest-passport/[token]/route.ts
//
// Public endpoint (no auth): given a guest's token, return every
// scrap of info needed to render their personalized passport —
// RSVP, seat, song slot, memory prompt, couple info, and any
// existing whispers / time-capsule / song requests they've already
// submitted.
//
// Queries `pearloom_guests` (the existing multi-guest table with
// `guest_token`) and joins to the newer passport tables introduced
// in 20260425_guest_passport.sql.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSiteConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Passport unavailable' }, { status: 503 });
  }

  const { data: guest, error } = await supabase
    .from('pearloom_guests')
    .select('*')
    .eq('guest_token', token)
    .maybeSingle();

  if (error || !guest) {
    return NextResponse.json({ error: 'Passport not found' }, { status: 404 });
  }

  // Fetch the site config so we can render names, venue, story, etc.
  // guest.site_id on pearloom_guests is a text domain/subdomain.
  const siteCfg = await getSiteConfig(guest.site_id).catch(() => null);

  // Fetch this guest's memory prompt (if any).
  const { data: memoryRow } = await supabase
    .from('memory_prompts')
    .select('id, prompt, response, responded_at, created_at')
    .eq('guest_id', guest.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: whisper } = await supabase
    .from('whispers')
    .select('id, body, created_at, is_private')
    .eq('guest_id', guest.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: timeCapsule } = await supabase
    .from('time_capsule')
    .select('id, body, reveal_years, reveal_on, revealed, created_at')
    .eq('guest_id', guest.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: songs } = await supabase
    .from('song_requests')
    .select('id, song_title, artist, spotify_url, note, created_at')
    .eq('guest_id', guest.id)
    .order('created_at', { ascending: false });

  const { data: seatIntro } = await supabase
    .from('seatmate_intros')
    .select('table_label, intro, seatmates')
    .eq('guest_id', guest.id)
    .maybeSingle();

  return NextResponse.json({
    guest: {
      id: guest.id,
      token: guest.guest_token,
      name: guest.display_name,
      email: guest.email,
      phone: guest.phone,
      homeCity: guest.home_city,
      relationshipToHost: guest.relationship_to_host,
      pronouns: guest.pronouns,
      dietary: guest.dietary ?? [],
      accessibility: guest.accessibility ?? [],
      language: guest.language ?? 'en',
      side: guest.side,
      notes: guest.notes,
    },
    site: siteCfg
      ? {
          domain: siteCfg.slug ?? guest.site_id,
          names: siteCfg.names ?? [],
          manifest: siteCfg.manifest ?? null,
        }
      : { domain: guest.site_id, names: [], manifest: null },
    memoryPrompt: memoryRow
      ? {
          id: memoryRow.id,
          prompt: memoryRow.prompt,
          response: memoryRow.response,
          respondedAt: memoryRow.responded_at,
        }
      : null,
    whisper: whisper ?? null,
    timeCapsule: timeCapsule ?? null,
    songs: songs ?? [],
    seatIntro: seatIntro ?? null,
  });
}
