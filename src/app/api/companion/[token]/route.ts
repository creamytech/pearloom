// ─────────────────────────────────────────────────────────────
// Pearloom / api/companion/[token]/route.ts
//
// Everything the Guest Companion mobile app needs for a single
// guest, in one call. The guest_token is the capability.
//
// Response:
//   {
//     guest, site, events, timeline, seat,
//     announcements, photoFeed, personalization
//   }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGuestByToken, listEvents, listAnnouncements } from '@/lib/event-os/db';
import { getOrGeneratePersonalization } from '@/lib/event-os/personalize';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  try {
    const guest = await getGuestByToken(token);
    if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

    const client = sb();
    const { data: site } = await client
      .from('sites')
      .select('id, subdomain, site_config')
      .eq('id', guest.site_id)
      .maybeSingle();
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

    const manifest = (site.site_config as { manifest?: StoryManifest } | null)?.manifest ?? null;

    // Couple names (best effort)
    const [rawA, rawB] = (manifest?.coupleId ?? '').split(/[-_]/);
    const coupleNames: [string, string] = [
      rawA ? rawA.charAt(0).toUpperCase() + rawA.slice(1) : 'Us',
      rawB ? rawB.charAt(0).toUpperCase() + rawB.slice(1) : '',
    ];

    const venueCity =
      manifest?.logistics?.venueAddress?.split(',').slice(-2, -1)[0]?.trim();

    const [events, announcements, seatRes, photoRes] = await Promise.all([
      listEvents(guest.site_id).catch(() => []),
      listAnnouncements(guest.site_id, 20).catch(() => []),
      client
        .from('seats')
        .select('seat_label, table_label, tables:table_label ( neighbors )')
        .eq('site_id', guest.site_id)
        .eq('guest_id', guest.id)
        .maybeSingle(),
      client
        .from('photos')
        .select('url, caption, created_at')
        .eq('site_id', guest.site_id)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    let personalization: Awaited<ReturnType<typeof getOrGeneratePersonalization>> | null = null;
    if (manifest) {
      try {
        personalization = await getOrGeneratePersonalization({
          guest,
          manifest,
          coupleNames,
          venueCity,
        });
      } catch {
        /* non-fatal */
      }
    }

    // Build a simple timeline from events
    const timeline = events
      .filter((e) => e.start_at)
      .map((e) => ({
        id: e.id,
        name: e.name,
        kind: e.kind,
        startAt: e.start_at,
        endAt: e.end_at,
        dressCode: e.dress_code,
        description: e.description,
      }))
      .sort((a, b) => new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime());

    return NextResponse.json({
      guest: {
        id: guest.id,
        displayName: guest.display_name,
        firstName: guest.display_name.split(' ')[0],
        pronunciation: guest.pronunciation,
        homeCity: guest.home_city,
        language: guest.language,
        dietary: guest.dietary,
        accessibility: guest.accessibility,
      },
      site: {
        id: site.id,
        subdomain: site.subdomain,
        occasion: manifest?.occasion ?? 'wedding',
        coupleNames,
        venue: manifest?.logistics?.venue ?? null,
        venueAddress: manifest?.logistics?.venueAddress ?? null,
        date: manifest?.logistics?.date ?? null,
        themeColors: manifest?.theme?.colors ?? null,
      },
      timeline,
      seat: seatRes.data
        ? {
            seatLabel: seatRes.data.seat_label,
            tableLabel: seatRes.data.table_label,
          }
        : null,
      announcements: announcements.map((a) => ({
        id: a.id,
        body: a.body,
        kind: a.kind,
        createdAt: a.created_at,
      })),
      photoFeed: (photoRes.data ?? []).map((p) => ({
        url: p.url,
        caption: p.caption,
        createdAt: p.created_at,
      })),
      personalization,
    });
  } catch (err) {
    console.error('[companion] failed', err);
    return NextResponse.json(
      { error: 'Failed to load companion data', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}
