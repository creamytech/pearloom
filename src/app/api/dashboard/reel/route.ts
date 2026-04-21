// ─────────────────────────────────────────────────────────────
// Pearloom / api/dashboard/reel/route.ts
//
// Cross-site photo aggregator for The Reel. Pulls every photo
// the signed-in user has across every site they own:
//   · site manifest coverPhoto + heroSlideshow
//   · chapter images from the manifest
//   · guest-submitted photos from /api/gallery per site
//
// Returns them merged, de-duplicated, newest first.
//
// GET query params:
//   site=DOMAIN       — optional filter by single site domain
//   limit=NUMBER      — optional, default 200
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface ReelPhoto {
  id: string;
  url: string;
  siteDomain: string;
  siteName: string | null;
  alt: string | null;
  source: 'cover' | 'hero' | 'chapter' | 'guest';
  uploadedBy?: string | null;
  uploadedAt?: string | null;
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface ManifestShape {
  names?: [string, string];
  coverPhoto?: string;
  heroSlideshow?: string[];
  chapters?: Array<{ title?: string; images?: Array<{ url?: string; alt?: string }> }>;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteFilter = searchParams.get('site');
  const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') ?? 200)));

  try {
    const supabase = sb();
    let query = supabase
      .from('sites')
      .select('id, domain, names, manifest:ai_manifest, site_config, updated_at')
      .order('updated_at', { ascending: false });
    if (siteFilter) query = query.eq('domain', siteFilter);
    const { data: rows, error } = await query;
    if (error) throw error;

    const owned = (rows ?? []).filter((r) => {
      const cfg = r.site_config as { creator_email?: string } | null;
      return cfg?.creator_email === email;
    });

    const out: ReelPhoto[] = [];
    const seen = new Set<string>();
    const push = (p: Omit<ReelPhoto, 'id'>) => {
      if (!p.url || seen.has(p.url)) return;
      seen.add(p.url);
      out.push({ id: `${p.siteDomain}-${out.length}`, ...p });
    };

    // Manifest-side photos (cover + hero + chapter images).
    for (const s of owned) {
      const m = (s.manifest ?? {}) as ManifestShape;
      const siteName =
        (Array.isArray(s.names) && s.names.filter(Boolean).join(' & ')) || m.names?.filter(Boolean).join(' & ') || s.domain;
      if (m.coverPhoto) {
        push({
          url: m.coverPhoto,
          siteDomain: s.domain,
          siteName,
          alt: siteName,
          source: 'cover',
          uploadedAt: s.updated_at,
        });
      }
      for (const url of m.heroSlideshow ?? []) {
        push({ url, siteDomain: s.domain, siteName, alt: siteName, source: 'hero', uploadedAt: s.updated_at });
      }
      for (const ch of m.chapters ?? []) {
        for (const img of ch.images ?? []) {
          if (!img.url) continue;
          push({
            url: img.url,
            siteDomain: s.domain,
            siteName,
            alt: img.alt || ch.title || siteName,
            source: 'chapter',
            uploadedAt: s.updated_at,
          });
        }
      }
    }

    // Guest-submitted gallery photos.
    const siteIds = owned.map((s) => s.id);
    if (siteIds.length) {
      const { data: galleryRows, error: gErr } = await supabase
        .from('gallery_photos')
        .select('id, url, site_id, uploaded_by, created_at')
        .in('site_id', siteIds)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!gErr && galleryRows) {
        for (const g of galleryRows as Array<{
          id: string;
          url: string;
          site_id: string;
          uploaded_by: string | null;
          created_at: string;
        }>) {
          const s = owned.find((o) => o.id === g.site_id);
          if (!s) continue;
          const m = (s.manifest ?? {}) as ManifestShape;
          const siteName =
            (Array.isArray(s.names) && s.names.filter(Boolean).join(' & ')) ||
            m.names?.filter(Boolean).join(' & ') ||
            s.domain;
          push({
            url: g.url,
            siteDomain: s.domain,
            siteName,
            alt: null,
            source: 'guest',
            uploadedBy: g.uploaded_by,
            uploadedAt: g.created_at,
          });
        }
      }
    }

    return NextResponse.json({
      photos: out.slice(0, limit),
      count: out.length,
      siteCount: owned.length,
    });
  } catch (err) {
    console.error('[dashboard/reel]', err);
    return NextResponse.json({ photos: [], count: 0, siteCount: 0 });
  }
}
