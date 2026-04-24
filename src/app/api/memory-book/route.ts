// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/memory-book/route.ts
//
// Exports the Memory Book for a site: a single JSON artifact
// the client can render as a printable HTML/PDF. Includes:
//   - hero (couple names, occasion, date, venue)
//   - story chapters
//   - every guest's memory response
//   - every revealed whisper
//   - every revealed time-capsule note
//   - accepted playlist
//   - thank-you notes the host wrote (if any cached)
//
// The client composes the print view; this endpoint does the
// aggregation in one authenticated round trip.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSiteConfig } from '@/lib/db';

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

  const cfg = await getSiteConfig(siteId).catch(() => null);
  if (!cfg?.manifest) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const [memoryRes, whispersRes, capsuleRes, songsRes] = await Promise.all([
    supabase
      .from('memory_prompts')
      .select('guest_name, prompt, response, responded_at')
      .eq('site_id', siteId)
      .not('response', 'is', null),
    supabase
      .from('whispers')
      .select('guest_name, body, created_at, deliver_after')
      .eq('site_id', siteId)
      .lte('deliver_after', new Date().toISOString()),
    supabase
      .from('time_capsule')
      .select('guest_name, body, reveal_years, reveal_on')
      .eq('site_id', siteId)
      .lte('reveal_on', new Date().toISOString().slice(0, 10)),
    supabase
      .from('song_requests')
      .select('guest_name, song_title, artist, spotify_url')
      .eq('site_id', siteId)
      .eq('state', 'accepted'),
  ]);

  // Pull the hero photo from the manifest + chapter covers.
  const manifestAny = cfg.manifest as unknown as {
    coverPhoto?: string;
    heroSlideshow?: string[];
    chapters?: Array<{ title?: string; images?: Array<{ url?: string }> }>;
  };
  const coverPhoto = manifestAny.coverPhoto ?? null;
  const heroSlideshow = Array.isArray(manifestAny.heroSlideshow) ? manifestAny.heroSlideshow : [];
  const chapterPhotos: Array<{ url: string; caption: string }> = [];
  for (const c of manifestAny.chapters ?? []) {
    for (const img of c.images ?? []) {
      if (img?.url) chapterPhotos.push({ url: img.url, caption: c.title ?? '' });
      if (chapterPhotos.length >= 12) break;
    }
    if (chapterPhotos.length >= 12) break;
  }

  return NextResponse.json({
    site: {
      domain: cfg.slug ?? siteId,
      names: cfg.names ?? [],
      occasion: (cfg.manifest as unknown as { occasion?: string }).occasion ?? 'wedding',
      date: cfg.manifest?.logistics?.date ?? null,
      venue: cfg.manifest?.logistics?.venue ?? null,
      coverPhoto,
      heroSlideshow,
    },
    chapters: cfg.manifest?.chapters ?? [],
    chapterPhotos,
    memories: memoryRes.data ?? [],
    whispers: whispersRes.data ?? [],
    capsule: capsuleRes.data ?? [],
    songs: songsRes.data ?? [],
  });
}
