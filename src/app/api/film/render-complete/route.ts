// ─────────────────────────────────────────────────────────────
// Pearloom / api/film/render-complete/route.ts
//
// External ffmpeg workers call this endpoint once they've
// finished stitching scenes → MP4 → R2. Auth uses a shared
// secret (FILM_RENDERER_WEBHOOK_SECRET) so only trusted
// renderers can flip a job to 'ready'.
//
// POST body: { jobId, outputUrl, durationSeconds? }
//   — OR to signal failure —
//         { jobId, error: string }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { completeFilmRender, failFilmRender } from '@/lib/event-os/film';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = env.FILM_RENDERER_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') || '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: {
    jobId?: string;
    outputUrl?: string;
    durationSeconds?: number;
    error?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  }

  try {
    if (body.error) {
      await failFilmRender(body.jobId, body.error);
      return NextResponse.json({ ok: true, status: 'failed' });
    }
    if (!body.outputUrl) {
      return NextResponse.json({ error: 'outputUrl required' }, { status: 400 });
    }
    await completeFilmRender({
      jobId: body.jobId,
      outputUrl: body.outputUrl,
      durationSeconds: body.durationSeconds,
    });
    return NextResponse.json({ ok: true, status: 'ready' });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update job', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}
