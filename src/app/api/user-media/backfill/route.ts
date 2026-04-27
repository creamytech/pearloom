// ─────────────────────────────────────────────────────────────
// Pearloom / api/user-media/backfill — one-shot fill from manifest.
//
// Older wizards uploaded photos straight into a site's manifest
// (chapters, coverPhoto) without persisting to user_media. The
// library page now sees those photos via a client-side merge, but
// each manifest scan is wasted work. POST here on first library
// view to copy them into user_media so subsequent loads hit a
// single index query instead.
//
// Idempotent — UPSERT by url so re-running is a no-op. Auth gated.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface Body {
  photos?: Array<{
    url: string;
    source_site_id?: string | null;
    filename?: string | null;
  }>;
}

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ ok: true });
  const client = sb();
  if (!client) return NextResponse.json({ ok: true });

  let body: Body = {};
  try { body = (await req.json()) as Body; } catch { /* noop */ }
  const photos = (body.photos ?? []).filter((p) => p && typeof p.url === 'string' && p.url.length > 0).slice(0, 500);
  if (photos.length === 0) return NextResponse.json({ ok: true, inserted: 0 });

  // Skip URLs we already have for this user — Supabase doesn't
  // have a unique constraint on (owner_email, url) by default, so
  // we filter client-side rather than rely on UPSERT.
  const urls = photos.map((p) => p.url);
  const { data: existing } = await client
    .from('user_media')
    .select('url')
    .eq('owner_email', session.user.email)
    .in('url', urls);
  const existingUrls = new Set((existing ?? []).map((r: { url: string }) => r.url));
  const fresh = photos.filter((p) => !existingUrls.has(p.url));
  if (fresh.length === 0) return NextResponse.json({ ok: true, inserted: 0 });

  const rows = fresh.map((p) => ({
    owner_email: session.user!.email!,
    url: p.url,
    filename: p.filename ?? null,
    source: 'wizard' as const,
    source_site_id: p.source_site_id ?? null,
  }));
  const { error } = await client.from('user_media').insert(rows);
  if (error) {
    console.warn('[user-media/backfill] insert failed:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, inserted: rows.length });
}
