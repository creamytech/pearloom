// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/analytics/sources/route.ts
//
// Traffic-source breakdown for the Analytics page (v2 "How they
// arrived"). Buckets the REAL site_analytics.referrer column —
// Direct / Email / Social / Web — so the panel never shows an
// invented split. Owner-gated: referrer data is per-site host
// data, and site_analytics is keyed by the PUBLIC slug, so an
// unauthenticated read would hand any visitor any site's
// breakdown. `siteId` is the site slug (subdomain).
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

const EMPTY = { sources: [] as { label: string; count: number; pct: number }[], total: 0 };

function bucket(ref: string | null): string {
  if (!ref) return 'Direct';
  let host = ref;
  try { host = new URL(ref).hostname.toLowerCase(); } catch { host = ref.toLowerCase(); }
  if (/mail|gmail|outlook|yahoo|proton|icloud/.test(host)) return 'Email';
  if (/instagram|facebook|fb\.|t\.co|twitter|x\.com|tiktok|pinterest|whatsapp|reddit|linkedin/.test(host)) return 'Social';
  return 'Web';
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const rawEmail = session?.user?.email;
  if (!rawEmail) return NextResponse.json(EMPTY, { status: 401 });
  const email = rawEmail.toLowerCase().trim();

  const ip = getClientIp(req);
  const rl = checkRateLimit(`analytics-sources:${ip}`, { max: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) return NextResponse.json(EMPTY, { status: 429 });

  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json(EMPTY, { status: 400 });

  try {
    const supabase = sb();

    // Ownership — the slug is public, the referrer data isn't.
    const { data: site } = await supabase
      .from('sites')
      .select('creator_email, site_config')
      .eq('subdomain', siteId)
      .maybeSingle();
    if (!site) return NextResponse.json(EMPTY, { status: 404 });
    const cfg = site.site_config as { creator_email?: string } | null;
    const owner = String(site.creator_email ?? cfg?.creator_email ?? '').toLowerCase().trim();
    if (owner !== email) return NextResponse.json(EMPTY, { status: 403 });

    const { data } = await supabase
      .from('site_analytics')
      .select('referrer')
      .eq('site_id', siteId)
      .order('visited_at', { ascending: false })
      .limit(5000);

    const tally: Record<string, number> = {};
    for (const row of data ?? []) {
      const b = bucket((row as { referrer: string | null }).referrer);
      tally[b] = (tally[b] || 0) + 1;
    }
    const total = Object.values(tally).reduce((a, b) => a + b, 0);
    const sources = Object.entries(tally)
      .map(([label, count]) => ({ label, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ sources, total });
  } catch (err) {
    console.error('[analytics/sources]', err);
    return NextResponse.json(EMPTY, { status: 500 });
  }
}
