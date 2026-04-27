// ─────────────────────────────────────────────────────────────
// Pearloom / api/qr/poster/[jobId]
//
// Polling endpoint for the async QR poster paint flow. Mirrors
// /api/invite/render/[jobId] but additionally re-derives the
// theme's qrDark / qrLight / textColor from the original payload
// so the client doesn't have to refetch them.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getJob } from '@/lib/render-jobs';
import { getQrTheme, type QrThemeId } from '@/lib/qr-engine/themes';

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
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }

  // Re-derive theme metadata from the stored payload — saves the
  // client a round trip and keeps the response consistent with
  // the kickoff route's shape.
  const themeId = (job.payload?.themeId as QrThemeId | undefined);
  const theme = themeId ? getQrTheme(themeId) : null;

  return NextResponse.json({
    ok: true,
    status: job.status,
    url: job.result_url,
    mimeType: job.result_mime,
    error: job.status === 'failed' ? job.status_detail : null,
    themeId: theme?.id ?? null,
    qrDark: theme?.qrDark ?? null,
    qrLight: theme?.qrLight ?? null,
    textColor: theme?.textColor ?? null,
    createdAt: job.created_at,
    finishedAt: job.finished_at,
  });
}
