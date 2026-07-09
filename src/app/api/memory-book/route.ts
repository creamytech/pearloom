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
import { getSiteConfig, getApprovedGuestPhotos } from '@/lib/db';
import { resolveViewerRole } from '@/lib/cohost-access';

export const dynamic = 'force-dynamic';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  // The dashboard passes the site row's uuid (useSelectedSite().site.id);
  // older callers pass the subdomain. Resolve either to the canonical
  // row, and gate on host access — the book carries private guest
  // material (whispers, capsule notes, memories).
  const rawSiteId = req.nextUrl.searchParams.get('siteId');
  if (!rawSiteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const access = await resolveViewerRole(
    supabase,
    UUID_RX.test(rawSiteId) ? { siteId: rawSiteId } : { subdomain: rawSiteId },
    session.user.email,
  );
  if (!access.siteId || !access.subdomain) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }
  if (!access.role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const cfg = await getSiteConfig(access.subdomain).catch(() => null);
  if (!cfg?.manifest) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  // Guest-content tables key site_id as TEXT and the write paths are
  // historically mixed: song_requests / passport submissions store the
  // site uuid, guest_photos the subdomain. Match on both keys so no
  // era of data is dropped.
  const siteKeys = [...new Set([access.siteId, access.subdomain])];

  // tribute_submissions + guestbook may be missing on older
  // deployments; wrap their fetches in try/catch so a missing
  // table doesn't fail the whole memory book.
  type AnyRow = Record<string, unknown>;
  const safeFetch = async (p: PromiseLike<{ data: AnyRow[] | null }>): Promise<AnyRow[]> => {
    try {
      const r = await (p as unknown as Promise<{ data: AnyRow[] | null }>);
      return Array.isArray(r.data) ? r.data : [];
    } catch {
      return [];
    }
  };

  const [memoryRes, whispersRes, capsuleRes, songsRes, tributesData, guestbookData, voiceToastData] = await Promise.all([
    supabase
      .from('memory_prompts')
      .select('guest_name, prompt, response, responded_at')
      .in('site_id', siteKeys)
      .not('response', 'is', null),
    supabase
      .from('whispers')
      .select('guest_name, body, created_at, deliver_after')
      .in('site_id', siteKeys)
      .lte('deliver_after', new Date().toISOString()),
    supabase
      .from('time_capsule')
      .select('guest_name, body, reveal_years, reveal_on')
      .in('site_id', siteKeys)
      .lte('reveal_on', new Date().toISOString().slice(0, 10)),
    supabase
      .from('song_requests')
      .select('guest_name, song_title, artist, spotify_url')
      .in('site_id', siteKeys)
      .eq('state', 'accepted'),
    safeFetch(supabase
      .from('tribute_submissions')
      .select('author_name, body, created_at, state, block_id')
      .in('site_id', siteKeys)
      .neq('state', 'hidden')
      .order('created_at', { ascending: true }) as unknown as PromiseLike<{ data: AnyRow[] | null }>),
    safeFetch(supabase
      .from('guestbook')
      .select('guest_name, message, created_at')
      .in('site_id', siteKeys)
      .order('created_at', { ascending: true }) as unknown as PromiseLike<{ data: AnyRow[] | null }>),
    // Voice toasts recorded from guest passports — the print view
    // lists them as a roll call (paper can't play audio; the
    // recordings themselves live in the day-of room).
    safeFetch(supabase
      .from('voice_toasts')
      .select('guest_display_name, duration_seconds, moderation_status, created_at')
      .in('site_id', siteKeys)
      .order('created_at', { ascending: true }) as unknown as PromiseLike<{ data: AnyRow[] | null }>),
  ]);

  const tributes = tributesData.map((t) => ({
    guest_name: (t.author_name as string) ?? 'A guest',
    body: (t.body as string) ?? '',
    block_id: (t.block_id as string) ?? '',
  })).filter((t) => t.body);
  const guestbookEntries = guestbookData.map((g) => ({
    guest_name: (g.guest_name as string) ?? 'A guest',
    message: (g.message as string) ?? '',
  })).filter((g) => g.message);
  const voiceToasts = voiceToastData
    .filter((t) => t.moderation_status !== 'rejected' && t.moderation_status !== 'hidden')
    .map((t) => ({
      guest_name: (t.guest_display_name as string) ?? 'A guest',
      duration_seconds: typeof t.duration_seconds === 'number' ? t.duration_seconds : null,
      created_at: (t.created_at as string) ?? null,
    }));

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

  // Guest-uploaded photos (the live photo wall) are keyed by
  // subdomain. Only host-APPROVED photos surface (pending/rejected
  // never reach the book). Deduped against the manifest photos by
  // URL; capped so a big wall doesn't bloat the payload (the client
  // renders a handful anyway).
  const seenPhotoUrls = new Set<string>([
    ...(coverPhoto ? [coverPhoto] : []),
    ...heroSlideshow,
    ...chapterPhotos.map((p) => p.url),
  ]);
  const approvedGuestPhotos = await getApprovedGuestPhotos(access.subdomain);
  for (const gp of approvedGuestPhotos) {
    if (!gp.url || seenPhotoUrls.has(gp.url)) continue;
    seenPhotoUrls.add(gp.url);
    chapterPhotos.push({ url: gp.url, caption: gp.caption ?? '' });
    if (chapterPhotos.length >= 60) break;
  }

  return NextResponse.json({
    site: {
      domain: cfg.slug ?? access.subdomain,
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
    tributes,
    guestbook: guestbookEntries,
    voiceToasts,
  });
}
