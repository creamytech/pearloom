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
import { resolveSiteRef } from '@/lib/event-os/db';

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

  /* Dashboard pages pass sites.id (uuid); getSiteConfig needs the
     subdomain — the old direct call always came back null and this
     page rendered nothing (G.1a). Resolve once, tolerant of either
     shape, and key the guest read by the canonical uuid. */
  const siteRef = await resolveSiteRef(siteId).catch(() => null);
  const [cfg, guestsRes] = await Promise.all([
    siteRef ? getSiteConfig(siteRef.subdomain).catch(() => null) : Promise.resolve(null),
    supabase
      .from('guests')
      .select('id, display_name:name, guest_token, passport_token, home_city, relationship_to_host, side')
      .eq('site_id', siteRef?.id ?? siteId)
      .order('name', { ascending: true }),
  ]);

  const guests = (guestsRes.data ?? []).map((g) => ({
    id: g.id,
    name: g.display_name,
    token: g.passport_token ?? g.guest_token,
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
