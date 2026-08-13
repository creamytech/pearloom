// ─────────────────────────────────────────────────────────────
// Pearloom / api/personalize/[token]/route.ts
//
// GET /api/personalize/{guest_token}
// Returns cached (or freshly generated) personalization for a
// single guest. Public endpoint — the guest_token IS the capability.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGuestByToken } from '@/lib/event-os/db';
import { getOrGeneratePersonalization } from '@/lib/event-os/personalize';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length < 6) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  try {
    const guest = await getGuestByToken(token);
    if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

    const sb = supabase();
    const { data: site, error: siteErr } = await sb
      .from('sites')
      .select('id, subdomain, site_config, creator_email')
      .eq('id', guest.site_id)
      .maybeSingle();

    if (siteErr || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const manifest = (site.site_config as { manifest?: StoryManifest } | null)?.manifest;
    if (!manifest) {
      return NextResponse.json({ error: 'Site has no manifest yet' }, { status: 404 });
    }

    // Couple names — best effort from manifest
    const coupleId = manifest.coupleId ?? '';
    const [rawA, rawB] = coupleId.split(/[-_]/);
    const coupleNames: [string, string] = [
      rawA?.charAt(0).toUpperCase() + (rawA?.slice(1) || '') || 'Someone',
      rawB?.charAt(0).toUpperCase() + (rawB?.slice(1) || '') || 'Someone',
    ];

    const venueCity =
      manifest.logistics?.venueAddress?.split(',').slice(-2, -1)[0]?.trim();

    const forceRefresh = req.nextUrl.searchParams.get('refresh') === '1';

    const payload = await getOrGeneratePersonalization({
      guest,
      manifest,
      coupleNames,
      venueCity,
      forceRefresh,
    });

    return NextResponse.json({
      guest: {
        id: guest.id,
        displayName: guest.display_name,
        pronunciation: guest.pronunciation,
        homeCity: guest.home_city,
        language: guest.language,
      },
      site: {
        id: site.id,
        subdomain: site.subdomain,
      },
      personalization: payload,
    });
  } catch (err) {
    console.error('[personalize] Error:', err);
    return NextResponse.json(
      { error: 'Failed to load personalization', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}
