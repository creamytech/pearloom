// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/analytics/sources/route.ts
//
// Traffic-source breakdown for the Analytics page (v2 "How they
// arrived"). Buckets the REAL site_analytics.referrer column —
// Direct / Email / Social / Web — so the panel never shows an
// invented split. Matches the unauthed + rate-limited shape of
// /api/analytics/visit (referrer counts aren't sensitive).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
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
  const ip = getClientIp(req);
  const rl = checkRateLimit(`analytics-sources:${ip}`, { max: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) return NextResponse.json(EMPTY, { status: 429 });

  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json(EMPTY);

  try {
    const supabase = sb();
    const { data } = await supabase
      .from('site_analytics')
      .select('referrer')
      .eq('site_id', siteId)
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
    return NextResponse.json(EMPTY);
  }
}
