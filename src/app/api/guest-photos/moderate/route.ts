// ─────────────────────────────────────────────────────────────
// Pearloom / api/guest-photos/moderate/route.ts
// Host-only endpoint to review the guest photo queue.
//
//   GET  ?siteId=<subdomain?>&status=pending|approved|rejected
//        → photos for the host's owned sites (the moderation queue).
//   POST { photoId, action: 'approved' | 'rejected' }
//        → moderate a single photo (ownership-checked).
//
// guest_photos.site_id is the SUBDOMAIN string (see the
// 20260614 migration), so ownership is resolved by matching the
// photo's subdomain against the sites the session user created.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { moderateGuestPhoto, getGuestPhotos } from '@/lib/db';

export const dynamic = 'force-dynamic';

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Subdomains of every site the email created, plus a label map. */
async function ownedSites(
  supabase: SupabaseClient,
  email: string,
): Promise<{ subdomains: string[]; labels: Map<string, string> }> {
  const { data } = await supabase
    .from('sites')
    .select('subdomain, creator_email, site_config');
  const labels = new Map<string, string>();
  const subdomains: string[] = [];
  const lower = email.toLowerCase().trim();
  for (const row of (data ?? []) as Array<{
    subdomain: string;
    creator_email: string | null;
    site_config: { creator_email?: string; names?: [string, string] } | null;
  }>) {
    const owner = String(row.creator_email ?? row.site_config?.creator_email ?? '').toLowerCase().trim();
    if (owner !== lower) continue;
    subdomains.push(row.subdomain);
    const names = (row.site_config?.names ?? []).filter(Boolean);
    labels.set(row.subdomain, names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] ?? row.subdomain));
  }
  return { subdomains, labels };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ photos: [] });

  const { searchParams } = new URL(req.url);
  const siteFilter = searchParams.get('siteId');
  const statusParam = searchParams.get('status');
  const status = statusParam === 'approved' || statusParam === 'rejected' ? statusParam : 'pending';

  try {
    const { subdomains, labels } = await ownedSites(supabase, session.user.email);
    let scope = subdomains;
    if (siteFilter) {
      // Only honor the filter when the caller owns it.
      scope = subdomains.filter((s) => s === siteFilter);
    }
    if (scope.length === 0) return NextResponse.json({ photos: [] });

    // getGuestPhotos is single-site; fan out across owned subdomains.
    const groups = await Promise.all(scope.map((sub) => getGuestPhotos(sub, status)));
    const photos = groups
      .flatMap((rows, i) =>
        rows.map((p) => ({
          id: p.id,
          siteSubdomain: scope[i],
          siteName: labels.get(scope[i]) ?? scope[i],
          uploaderName: p.uploaderName,
          caption: p.caption ?? null,
          url: p.url,
          status: p.status,
          createdAt: p.createdAt,
        })),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ photos });
  } catch (err) {
    console.error('[guest-photos/moderate] GET error:', err);
    return NextResponse.json({ photos: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json() as { photoId?: string; action?: string };
    const { photoId, action } = body;

    if (!photoId) {
      return NextResponse.json({ error: 'photoId is required' }, { status: 400 });
    }
    if (action !== 'approved' && action !== 'rejected') {
      return NextResponse.json({ error: 'action must be "approved" or "rejected"' }, { status: 400 });
    }

    // Ownership check — the photo's subdomain must belong to a site
    // this host created. Without it any signed-in user could moderate
    // anyone's photos by guessing an id.
    const supabase = getSupabase();
    if (supabase) {
      const { data: photoRow } = await supabase
        .from('guest_photos')
        .select('site_id')
        .eq('id', photoId)
        .maybeSingle();
      if (!photoRow) {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
      }
      const { subdomains } = await ownedSites(supabase, session.user.email);
      if (!subdomains.includes(String((photoRow as { site_id: string }).site_id))) {
        return NextResponse.json({ error: 'Not your site' }, { status: 403 });
      }
    }

    await moderateGuestPhoto(photoId, action);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[guest-photos/moderate] Unexpected error:', err);
    return NextResponse.json({ error: 'Moderation failed' }, { status: 500 });
  }
}
