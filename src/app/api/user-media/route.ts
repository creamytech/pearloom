// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/user-media/route.ts
//
// User's photo library — every photo they've uploaded, shared
// across all their sites. Writing goes through /api/photos/upload
// (which now also inserts into user_media); this endpoint is for
// listing + captioning + deleting.
//
// GET                 — list the signed-in user's photos.
// PATCH { id, caption } — update a caption.
// DELETE ?id=xxx      — remove from library (doesn't delete R2 file).
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
  if (!session?.user?.email) return NextResponse.json({ media: [] });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ media: [] });

  const siteId = req.nextUrl.searchParams.get('siteId');
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 500), 1000);

  let q = supabase
    .from('user_media')
    .select('id, url, width, height, mime_type, filename, caption, taken_at, source, source_site_id, created_at')
    .eq('owner_email', session.user.email)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Optional filter: only media associated with a particular site.
  if (siteId) q = q.eq('source_site_id', siteId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message, media: [] }, { status: 500 });
  return NextResponse.json({ media: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const body = await req.json().catch(() => null);
  const id: string | null = body?.id ?? null;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof body?.caption === 'string') update.caption = body.caption;
  if (typeof body?.source_site_id === 'string') update.source_site_id = body.source_site_id;

  const { error } = await supabase
    .from('user_media')
    .update(update)
    .eq('id', id)
    .eq('owner_email', session.user.email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('user_media')
    .delete()
    .eq('id', id)
    .eq('owner_email', session.user.email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
