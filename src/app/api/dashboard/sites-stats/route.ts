// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/dashboard/sites-stats/route.ts
//
// Owner-gated batch stats for the My-sites cards (v2 SiteCard
// stat row). Returns, per owned site id: guests coming (yes) +
// total invited, and lifetime site visits. Real data only —
// guests.status + site_analytics — so the card never shows an
// invented number.
//
// Owner resolution happens IN the query (mirrors /api/sites's
// canonical filter: eq on site_config->>creator_email with an
// ilike fallback, plus the top-level creator_email column) — a
// full-table fetch filtered in JS silently drops rows past
// PostgREST's 1000-row cap and ships every site's config over
// the wire.
//
// NOTE site_analytics.site_id holds the site's SUBDOMAIN, not its
// UUID (see the RLS join in 20260606_tighten_anon_inserts.sql) —
// visits must be counted by subdomain.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { normaliseRsvpStatus } from '@/lib/rsvp-status';
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

interface SiteRow { id: string; subdomain: string | null }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const rawEmail = session?.user?.email;
  if (!rawEmail) return NextResponse.json({ stats: {} }, { status: 401 });
  const email = rawEmail.toLowerCase().trim();

  const rl = checkRateLimit(`sites-stats:${getClientIp(req)}`, { max: 30, windowMs: 60 * 1000 });
  if (!rl.allowed) return NextResponse.json({ stats: {} }, { status: 429 });

  try {
    const supabase = sb();

    // Owned sites — same filter family as /api/sites so every site
    // that appears in the dashboard list gets a stat row.
    const [byConfig, byColumn] = await Promise.all([
      supabase.from('sites').select('id, subdomain').eq('site_config->>creator_email', email),
      supabase.from('sites').select('id, subdomain').eq('creator_email', email),
    ]);
    let rows: SiteRow[] = ([] as SiteRow[]).concat(
      (byConfig.data ?? []) as SiteRow[],
      (byColumn.data ?? []) as SiteRow[],
    );
    if (rows.length === 0) {
      // Legacy mixed-case rows — /api/sites falls back to ilike too.
      const { data: legacy } = await supabase
        .from('sites')
        .select('id, subdomain')
        .ilike('site_config->>creator_email', email.replace(/[\\%_]/g, (c) => `\\${c}`));
      rows = (legacy ?? []) as SiteRow[];
    }

    const bySiteId = new Map<string, SiteRow>();
    for (const r of rows) bySiteId.set(String(r.id), r);
    const ids = [...bySiteId.keys()];
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

    // Guests — batched + paginated past PostgREST's 1000-row page so
    // large hosts aren't silently undercounted. Status buckets via
    // the shared normaliser (same vocabulary as the Guests page).
    const PAGE = 1000;
    for (let from = 0; from < 20_000; from += PAGE) {
      const { data: guests } = await supabase
        .from('guests')
        .select('site_id, status')
        .in('site_id', ids)
        .range(from, from + PAGE - 1);
      for (const g of guests ?? []) {
        const s = stats[String(g.site_id)];
        if (!s) continue;
        s.invited += 1;
        if (normaliseRsvpStatus(g.status as string | null) === 'yes') s.coming += 1;
      }
      if (!guests || guests.length < PAGE) break;
    }

    // Visits — per-site head count (no row transfer; analytics can be
    // large). Keyed by SUBDOMAIN — that's what the visit beacon
    // writes. N sites is small, so parallel head counts are cheap.
    await Promise.all(ids.map(async (id) => {
      const slug = bySiteId.get(id)?.subdomain;
      if (!slug) return;
      const { count } = await supabase
        .from('site_analytics')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', slug);
      stats[id].visits = count || 0;
    }));

    return NextResponse.json({ stats });
  } catch (err) {
    console.error('[dashboard/sites-stats]', err);
    return NextResponse.json({ stats: {} });
  }
}
