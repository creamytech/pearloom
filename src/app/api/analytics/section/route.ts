// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/analytics/section/route.ts
// Tracks per-section engagement events (views, time_spent).
// POST is public (no auth). GET requires auth (owner data).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SECTION_RATE_LIMIT = { max: 60, windowMs: 60 * 1000 };

// POST — record a section event (public, no auth)
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`section:${ip}`, SECTION_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json();
    const { siteId, sectionId, eventType, durationMs } = body as {
      siteId: string;
      sectionId: string;
      eventType: 'view' | 'scroll_past' | 'time_spent';
      durationMs?: number;
    };

    if (!siteId || !sectionId || !eventType) {
      return NextResponse.json({ ok: false });
    }

    const supabase = getSupabase();
    await supabase.from('section_analytics').insert({
      site_id: siteId,
      section_id: sectionId,
      event_type: eventType,
      duration_ms: durationMs ?? null,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[analytics/section POST]', err);
    return NextResponse.json({ ok: false });
  }
}

// GET — returns section engagement summary for the owner dashboard (auth required)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ sections: [] });
    }

    const supabase = getSupabase();

    // Fetch all view events for this site
    const { data: viewRows } = await supabase
      .from('section_analytics')
      .select('section_id, event_type, duration_ms')
      .eq('site_id', siteId)
      .eq('event_type', 'view');

    // Fetch all time_spent events for this site
    const { data: durationRows } = await supabase
      .from('section_analytics')
      .select('section_id, duration_ms')
      .eq('site_id', siteId)
      .eq('event_type', 'time_spent')
      .not('duration_ms', 'is', null);

    // Group views by section_id
    const viewCounts: Record<string, number> = {};
    for (const row of viewRows || []) {
      viewCounts[row.section_id] = (viewCounts[row.section_id] || 0) + 1;
    }

    // Group durations by section_id
    const durationSums: Record<string, number> = {};
    const durationCounts: Record<string, number> = {};
    for (const row of durationRows || []) {
      if (row.duration_ms != null) {
        durationSums[row.section_id] = (durationSums[row.section_id] || 0) + row.duration_ms;
        durationCounts[row.section_id] = (durationCounts[row.section_id] || 0) + 1;
      }
    }

    const sections = Object.keys(viewCounts).map((sectionId) => ({
      sectionId,
      views: viewCounts[sectionId],
      avgDurationMs: durationCounts[sectionId]
        ? Math.round(durationSums[sectionId] / durationCounts[sectionId])
        : 0,
    }));

    // Sort by view count descending
    sections.sort((a, b) => b.views - a.views);

    return NextResponse.json({ sections });
  } catch (err) {
    console.error('[analytics/section GET]', err);
    return NextResponse.json({ sections: [] });
  }
}
