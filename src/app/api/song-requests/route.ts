// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/song-requests/route.ts
//
// Host queue view + public loop of the collaborative playlist.
//   GET ?siteId=xxx           — host triage view (owner-checked,
//                                returns every request with PII).
//   GET ?subdomain=xxx&public=1 — public read of accepted songs
//                                only (no PII; feeds the site's
//                                "The guest playlist" tracklist).
//   POST { subdomain, songTitle, … } — public suggest-a-song from
//                                the site's MusicBlock composer.
//                                Lands 'queued' unless the host
//                                turned on manifest.music.autoAdd,
//                                in which case it goes straight to
//                                'accepted'. Rate-limited per IP.
//   PATCH { id, state } — mark queued / accepted / hidden.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  // Public branch — accepted songs only, no PII. Used by the
  // public SpotifySection so guests see what their peers added.
  const isPublic = req.nextUrl.searchParams.get('public') === '1';
  if (isPublic) {
    const subdomain = req.nextUrl.searchParams.get('subdomain')?.trim();
    if (!subdomain) return NextResponse.json({ error: 'subdomain required' }, { status: 400 });
    const supabase = sb();
    if (!supabase) return NextResponse.json({ songs: [] });
    // Resolve subdomain → site uuid for the FK on song_requests.
    const { data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();
    const siteUuid = (site as { id?: string } | null)?.id;
    if (!siteUuid) return NextResponse.json({ songs: [] });
    const { data, error } = await supabase
      .from('song_requests')
      .select('song_title, artist, spotify_url, art_url, preview_url, guest_name, created_at')
      .eq('site_id', siteUuid)
      .eq('state', 'accepted')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      // Older deployments may predate the 20260702 art/preview
      // migration — retry without the new columns so the public
      // tracklist keeps rendering.
      const { data: legacy } = await supabase
        .from('song_requests')
        .select('song_title, artist, spotify_url, guest_name, created_at')
        .eq('site_id', siteUuid)
        .eq('state', 'accepted')
        .order('created_at', { ascending: false })
        .limit(50);
      return NextResponse.json({ songs: legacy ?? [] });
    }
    return NextResponse.json({ songs: data ?? [] });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  // Accept either UUID or subdomain so the dashboard client can
  // pass whichever it has on hand (siteSummary.id is uuid; the
  // editor + public surfaces work in subdomain).
  const raw = (req.nextUrl.searchParams.get('siteId') ?? req.nextUrl.searchParams.get('siteSlug') ?? '').trim();
  if (!raw) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  const siteRow = UUID_RX.test(raw)
    ? await supabase.from('sites').select('id, creator_email, site_config').eq('id', raw).maybeSingle()
    : await supabase.from('sites').select('id, creator_email, site_config').eq('subdomain', raw).maybeSingle();
  const site = siteRow.data as { id?: string; creator_email?: string; site_config?: { creator_email?: string } } | null;
  if (!site?.id) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = (site.creator_email ?? site.site_config?.creator_email ?? '').toLowerCase();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('song_requests')
    .select('id, guest_id, guest_name, song_title, artist, spotify_url, note, state, created_at')
    .eq('site_id', site.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ songs: data ?? [] });
}

// ── POST { subdomain, songTitle, artist?, guestName?, … } ────
// Public suggest-a-song from the site's guest playlist composer.
// No auth — the site is public; rate limit + length caps keep the
// queue civil. Initial state honours the host's MusicPanel picks:
//   manifest.music.suggestions === false → 403 (composer is also
//     hidden client-side; this is the belt to that braces)
//   manifest.music.autoAdd === true      → 'accepted' (on the list)
//   otherwise                            → 'queued' (host approves)
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`song-suggest:${ip}`, { max: 6, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many suggestions too fast. Take a breath and try again.' },
      { status: 429 },
    );
  }

  let body: {
    subdomain?: string;
    songTitle?: string;
    artist?: string;
    guestName?: string;
    spotifyUrl?: string;
    artUrl?: string;
    previewUrl?: string;
  } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const subdomain = (body.subdomain ?? '').trim();
  const songTitle = (body.songTitle ?? '').trim();
  const artist = (body.artist ?? '').trim().slice(0, 120);
  const guestName = ((body.guestName ?? '').trim() || 'A guest').slice(0, 80);
  /* URL fields ride in from /api/music/search picks — https only,
     capped, silently dropped when malformed (they're garnish). */
  const safeUrl = (v?: string): string | null => {
    const s = (v ?? '').trim();
    return /^https:\/\/\S+$/.test(s) && s.length <= 600 ? s : null;
  };
  const spotifyUrl = safeUrl(body.spotifyUrl);
  const artUrl = safeUrl(body.artUrl);
  const previewUrl = safeUrl(body.previewUrl);

  if (!subdomain) return NextResponse.json({ ok: false, error: 'subdomain required' }, { status: 400 });
  if (songTitle.length < 1 || songTitle.length > 120) {
    return NextResponse.json({ ok: false, error: 'Song title must be 1–120 characters.' }, { status: 400 });
  }

  const supabase = sb();
  if (!supabase) {
    console.log('[song-requests] POST (no-db):', { subdomain, songTitle });
    return NextResponse.json({ ok: true, stored: false, state: 'queued' });
  }

  const { data: siteRow } = await supabase
    .from('sites')
    .select('id, ai_manifest, site_config')
    .eq('subdomain', subdomain)
    .maybeSingle();
  const site = siteRow as {
    id?: string;
    ai_manifest?: { music?: { suggestions?: boolean; autoAdd?: boolean } } | null;
    site_config?: { manifest?: { music?: { suggestions?: boolean; autoAdd?: boolean } } } | null;
  } | null;
  if (!site?.id) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

  const music = (site.ai_manifest ?? site.site_config?.manifest)?.music ?? {};
  if (music.suggestions === false) {
    return NextResponse.json({ ok: false, error: 'Song suggestions are closed on this site.' }, { status: 403 });
  }
  const state = music.autoAdd === true ? 'accepted' : 'queued';

  const row = {
    site_id: site.id,
    guest_id: null,
    guest_name: guestName,
    song_title: songTitle,
    artist: artist || null,
    spotify_url: spotifyUrl,
    art_url: artUrl,
    preview_url: previewUrl,
    state,
  };
  const { error } = await supabase.from('song_requests').insert(row);
  if (error) {
    // Older deployments may predate the 20260702 art/preview
    // migration — retry without the new columns before failing.
    const { art_url: _a, preview_url: _p, ...legacyRow } = row;
    const { error: legacyError } = await supabase.from('song_requests').insert(legacyRow);
    if (legacyError) {
      console.error('[song-requests] insert failed:', error);
      return NextResponse.json({ ok: false, error: 'Could not save your suggestion.' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, stored: true, state });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const body = await req.json().catch(() => null);
  const id: string | null = body?.id ?? null;
  const state: string = body?.state ?? 'queued';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (!['queued', 'accepted', 'hidden'].includes(state)) {
    return NextResponse.json({ error: 'invalid state' }, { status: 400 });
  }

  // Verify ownership of the row's parent site before letting any
  // host mutate state. Without this, a logged-in user could PATCH
  // any song row on any site.
  const { data: row } = await supabase
    .from('song_requests')
    .select('site_id')
    .eq('id', id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data: site } = await supabase
    .from('sites')
    .select('creator_email, site_config')
    .eq('id', (row as { site_id: string }).site_id)
    .maybeSingle();
  const ownerEmail = (
    (site as { creator_email?: string } | null)?.creator_email
    ?? (site as { site_config?: { creator_email?: string } } | null)?.site_config?.creator_email
    ?? ''
  ).toLowerCase();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('song_requests').update({ state }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
