// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/analytics/visit/route.ts
// Records a site visit (page view) + returns aggregate stats.
// Lightweight — no external service needed.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST — record a visit
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`analytics-visit:${ip}`, { max: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  try {
    const { siteId, referrer } = await req.json();
    if (!siteId) return NextResponse.json({ ok: false });

    const supabase = getSupabase();
    const ua = req.headers.get('user-agent') || '';
    const isMobile = /mobile|android|iphone|ipad/i.test(ua);

    await supabase.from('site_analytics').insert({
      site_id: siteId,
      referrer: referrer || null,
      device: isMobile ? 'mobile' : 'desktop',
      visited_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[analytics/visit]', err);
    return NextResponse.json({ ok: false });
  }
}

// GET — return aggregate stats for the owner dashboard
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`analytics-visit-get:${ip}`, { max: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ visits: 0, mobile: 0, desktop: 0, today: 0 }, { status: 429 });
  }

  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ visits: 0, mobile: 0, desktop: 0, today: 0 });

  try {
    const supabase = getSupabase();

    // Total visits
    const { count: total } = await supabase
      .from('site_analytics')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId);

    // Today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: today } = await supabase
      .from('site_analytics')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('visited_at', todayStart.toISOString());

    // Mobile vs desktop
    const { count: mobile } = await supabase
      .from('site_analytics')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('device', 'mobile');

    return NextResponse.json({
      visits: total || 0,
      today: today || 0,
      mobile: mobile || 0,
      desktop: (total || 0) - (mobile || 0),
    });
  } catch {
    return NextResponse.json({ visits: 0, mobile: 0, desktop: 0, today: 0 });
  }
}
