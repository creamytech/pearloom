// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/song-requests/route.ts
//
// Host queue view of the collaborative playlist.
// GET ?siteId=xxx — list all guest song requests.
// PATCH { id, state } — mark queued / accepted / hidden.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const { data, error } = await supabase
    .from('song_requests')
    .select('id, guest_id, guest_name, song_title, artist, spotify_url, note, state, created_at')
    .eq('site_id', siteId)
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

  const { error } = await supabase.from('song_requests').update({ state }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
