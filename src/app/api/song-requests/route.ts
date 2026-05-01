// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/song-requests/route.ts
//
// Host queue view of the collaborative playlist.
//   GET ?siteId=xxx           — host triage view (owner-checked,
//                                returns every request with PII).
//   GET ?subdomain=xxx&public=1 — public read of accepted songs
//                                only (no PII; for SpotifySection's
//                                "guests added" strip).
//   PATCH { id, state } — mark queued / accepted / hidden.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    const { data } = await supabase
      .from('song_requests')
      .select('song_title, artist, spotify_url, guest_name, created_at')
      .eq('site_id', siteUuid)
      .eq('state', 'accepted')
      .order('created_at', { ascending: false })
      .limit(50);
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
