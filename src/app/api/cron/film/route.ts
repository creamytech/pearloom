// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/cron/film/route.ts
//
// Reaps stuck post-event film jobs: re-runs advanceFilmJob
// for ones stuck in queued/gathering/scripting and re-dispatches
// the external renderer webhook for ones stuck in 'rendering'.
//
// Protected by CRON_SECRET.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { reapStuckFilmJobs } from '@/lib/event-os/film';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/film] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const auth = req.headers.get('authorization') || '';
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await reapStuckFilmJobs();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[cron/film] reap failed', err);
    return NextResponse.json(
      { error: 'Reap failed', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}
