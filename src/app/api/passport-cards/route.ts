// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/passport-cards/route.ts
//
// GET ?siteId=xxx — returns every guest for a site + their
// personal passport URL (/g/{guest_token}) so the client can
// render a bulk-print sheet: one card per guest, each with their
// own QR code. Hosts print, cut, and slip into welcome bags.
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

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const [cfg, guestsRes] = await Promise.all([
    getSiteConfig(siteId).catch(() => null),
    supabase
      .from('pearloom_guests')
      .select('id, display_name, guest_token, home_city, relationship_to_host, side')
      .eq('site_id', siteId)
      .order('display_name', { ascending: true }),
  ]);

  const guests = (guestsRes.data ?? []).map((g) => ({
    id: g.id,
    name: g.display_name,
    token: g.guest_token,
    homeCity: g.home_city,
    relationship: g.relationship_to_host,
    side: g.side,
    passportUrl: `${appOrigin()}/g/${g.guest_token}`,
  }));

  return NextResponse.json({
    site: cfg
      ? {
          domain: cfg.slug ?? siteId,
          names: cfg.names ?? [],
          occasion: (cfg.manifest as unknown as { occasion?: string })?.occasion ?? 'wedding',
          date: cfg.manifest?.logistics?.date ?? null,
          venue: cfg.manifest?.logistics?.venue ?? null,
        }
      : { domain: siteId, names: [], occasion: 'wedding', date: null, venue: null },
    guests,
  });
}
