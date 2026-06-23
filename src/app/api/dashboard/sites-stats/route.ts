// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/dashboard/sites-stats/route.ts
//
// Owner-gated batch stats for the My-sites cards (v2 SiteCard
// stat row). Returns, per owned site id: guests coming (yes) +
// total invited, and lifetime site visits. Real data only —
// guests.status + site_analytics — so the card never shows an
// invented number. Mirrors the owner-sites pattern in
// /api/dashboard/reel.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export interface SiteStat {
  coming: number;
  invited: number;
  visits: number;
  cohosts: { email: string; role: string }[];
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const rawEmail = session?.user?.email;
  if (!rawEmail) return NextResponse.json({ stats: {} }, { status: 401 });
  const email = rawEmail.toLowerCase().trim();

  try {
    const supabase = sb();
    const { data: rows, error } = await supabase
      .from('sites')
      .select('id, creator_email, site_config');
    if (error) throw error;

    const owned = (rows ?? []).filter((r) => {
      const cfg = r.site_config as { creator_email?: string } | null;
      const owner = String(r.creator_email ?? cfg?.creator_email ?? '').toLowerCase().trim();
      return owner === email;
    });
    const ids = owned.map((r) => String(r.id));
    if (ids.length === 0) return NextResponse.json({ stats: {} });

    const stats: Record<string, SiteStat> = {};
    for (const id of ids) stats[id] = { coming: 0, invited: 0, visits: 0, cohosts: [] };

    // Co-hosts — collaborators per site (cohosts table). One batched
    // query; the owner is implied (this is their dashboard).
    const { data: cohostRows } = await supabase
      .from('cohosts')
      .select('site_id, email, role')
      .in('site_id', ids);
    for (const c of cohostRows ?? []) {
      const s = stats[String(c.site_id)];
      if (s) s.cohosts.push({ email: String(c.email ?? ''), role: String(c.role ?? '') });
    }

    // Guests — one batched query, tallied per site. Bounded (a few
    // hundred rows across a host's sites).
    const { data: guests } = await supabase
      .from('guests')
      .select('site_id, status')
      .in('site_id', ids);
    for (const g of guests ?? []) {
      const s = stats[String(g.site_id)];
      if (!s) continue;
      s.invited += 1;
      const st = String(g.status ?? '').toLowerCase();
      if (st === 'yes' || st === 'attending') s.coming += 1;
    }

    // Visits — per-site head count (no row transfer; analytics can be
    // large). N sites is small, so parallel head counts are cheap.
    await Promise.all(ids.map(async (id) => {
      const { count } = await supabase
        .from('site_analytics')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', id);
      stats[id].visits = count || 0;
    }));

    return NextResponse.json({ stats });
  } catch (err) {
    console.error('[dashboard/sites-stats]', err);
    return NextResponse.json({ stats: {} });
  }
}
