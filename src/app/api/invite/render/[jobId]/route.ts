// ─────────────────────────────────────────────────────────────
// Pearloom / api/invite/render/[jobId]
//
// Polling endpoint for the async invite-render flow. The client
// hits this every ~2s after kicking off a paint job — we read
// the render_jobs row, verify the requester owns it, and return
// status + (when done) the result URL.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getJob } from '@/lib/render-jobs';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const { jobId } = await ctx.params;
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId.' }, { status: 400 });
  }

  const job = await getJob(jobId, session.user.email);
  if (!job) {
    // Either the row doesn't exist or another user owns it. Don't
    // distinguish — both look like 404 to the requester.
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    status: job.status,
    url: job.result_url,
    mimeType: job.result_mime,
    error: job.status === 'failed' ? job.status_detail : null,
    createdAt: job.created_at,
    finishedAt: job.finished_at,
  });
}
