// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/dashboard/sites-stats/route.ts
//
// Owner-gated batch stats for the My-sites cards (v2 SiteCard
// stat row). Returns, per owned site id: guests coming (yes) +
// total invited, and lifetime site visits. Real data only —
// guests.status + site_analytics — so the card never shows an
// invented number. Ownership is filtered in SQL (indexed on
// site_config->>creator_email), never by scanning the table.
// NOTE: site_analytics.site_id is the site SLUG (subdomain),
// not the uuid — visits must be counted by subdomain.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

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

/** Escape ilike wildcards so `a_b@x.com` can't match `aXb@x.com`. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const rawEmail = session?.user?.email;
  if (!rawEmail) return NextResponse.json({ stats: {} }, { status: 401 });
  const email = rawEmail.toLowerCase().trim();

  const rl = checkRateLimit(`sites-stats:${getClientIp(req)}`, { max: 30, windowMs: 60 * 1000 });
  if (!rl.allowed) return NextResponse.json({ stats: {} }, { status: 429 });

  try {
    const supabase = sb();
    // Ownership in SQL — either the column or the config field.
    // Exact match first (the normal case); case-drift fallback via
    // ilike, mirroring /api/sites GET.
    const primary = await supabase
      .from('sites')
      .select('id, subdomain')
      .or(`creator_email.eq.${email},site_config->>creator_email.eq.${email}`);
    if (primary.error) throw primary.error;
    let rows = primary.data ?? [];
    if (rows.length === 0) {
      const fallback = await supabase
        .from('sites')
        .select('id, subdomain')
        .ilike('site_config->>creator_email', escapeLike(email));
      rows = fallback.data ?? [];
    }

    const owned = rows;
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
    // large). Keyed by SUBDOMAIN — that's what the visit beacon writes.
    await Promise.all(owned.map(async (site) => {
      const slug = String(site.subdomain ?? '');
      if (!slug) return;
      const { count } = await supabase
        .from('site_analytics')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', slug);
      stats[String(site.id)].visits = count || 0;
    }));

    return NextResponse.json({ stats });
  } catch (err) {
    console.error('[dashboard/sites-stats]', err);
    return NextResponse.json({ stats: {} }, { status: 500 });
  }
}
