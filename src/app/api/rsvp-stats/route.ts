// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/rsvp-stats/route.ts
// Returns aggregate RSVP counts for a site
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`rsvp-stats:${ip}`, { max: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ attending: 0, total: 0, pending: 0 }, { status: 429 });
  }

  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ attending: 0, total: 0, pending: 0 });

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data } = await supabase
      .from('guests')
      .select('status, plus_one')
      .eq('site_id', siteId);

    const rows = data || [];
    const attending = rows.filter(r => r.status === 'attending').length;
    const plusOnes = rows.filter(r => r.status === 'attending' && r.plus_one).length;
    const declined = rows.filter(r => r.status === 'declined').length;
    const pending = rows.filter(r => r.status === 'pending').length;

    return NextResponse.json({
      attending: attending + plusOnes,   // total heads
      confirmed: attending,              // confirmed guests (no +1)
      declined,
      pending,
      total: rows.length,
    });
  } catch {
    return NextResponse.json({ attending: 0, total: 0, pending: 0 });
  }
}
