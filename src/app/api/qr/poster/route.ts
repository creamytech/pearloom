// ─────────────────────────────────────────────────────────────
// Pearloom / api/qr/poster — themed AI poster generation.
//
// POST { themeId, names, dateLabel, kicker?, siteSlug }
//   Generates an A4-portrait poster background using gpt-image-2.
//   The prompt instructs the painter to LEAVE A BLANK CENTRE
//   AREA (700×700 px) where the real, scannable QR is composited
//   client-side at print time.
//
// Async pattern (matches /api/invite/render): if render_jobs is
// available, the route writes a job row, schedules the painter
// via Next's after(), and returns { jobId } immediately. Client
// polls /api/qr/poster/[jobId]. Falls back to the legacy
// hold-the-connection flow when Supabase isn't configured.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateImage } from '@/lib/memory-engine/image-router';
import { getLastOpenAIError, hasOpenAIImageKey } from '@/lib/memory-engine/openai-image';
import { uploadToR2, getR2Url } from '@/lib/r2';
import { buildQrPosterPrompt, getQrTheme, type QrThemeId } from '@/lib/qr-engine/themes';
import {
  createJob,
  markRunning,
  markComplete,
  markFailed,
  renderJobsAvailable,
} from '@/lib/render-jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface Body {
  themeId: QrThemeId;
  names: string;
  dateLabel: string;
  kicker?: string;
  siteSlug: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const ip = getClientIp(req);
  const rate = checkRateLimit(`qr-poster:${session.user.email}:${ip}`, { max: 10, windowMs: 5 * 60_000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many poster renders. Try again shortly.' }, { status: 429 });
  }

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!body.themeId || !body.names || !body.dateLabel || !body.siteSlug) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const theme = getQrTheme(body.themeId);
  if (!theme) {
    return NextResponse.json({ error: 'Unknown theme.' }, { status: 400 });
  }

  const hasGeminiKey =
    !!(process.env.GEMINI_API_KEY ||
       process.env.GOOGLE_AI_KEY ||
       process.env.GOOGLE_API_KEY);
  if (!hasOpenAIImageKey() && !hasGeminiKey) {
    return NextResponse.json(
      { error: 'Pear\'s painter is offline — image generation isn\'t configured on this server.' },
      { status: 503 },
    );
  }

  // ── Async path ───────────────────────────────────────────
  if (renderJobsAvailable()) {
    const job = await createJob({
      ownerEmail: session.user.email,
      siteSlug: body.siteSlug,
      surface: 'qr-poster',
      payload: { themeId: body.themeId },
    });

    if (job) {
      after(async () => {
        try {
          await markRunning(job.id);
          const url = await runRender(body, theme);
          await markComplete(job.id, { url, mime: 'image/png' });
        } catch (err) {
          const detail = err instanceof Error ? err.message : 'unknown error';
          console.error('[qr/poster][async]', detail);
          await markFailed(job.id, detail);
        }
      });

      return NextResponse.json({
        ok: true,
        jobId: job.id,
        async: true,
        themeId: theme.id,
        qrDark: theme.qrDark,
        qrLight: theme.qrLight,
        textColor: theme.textColor ?? null,
      });
    }
    // Row write failed — fall through to sync.
  }

  // ── Sync path (fallback) ─────────────────────────────────
  try {
    const url = await runRender(body, theme);
    return NextResponse.json({
      ok: true,
      themeId: theme.id,
      url,
      qrDark: theme.qrDark,
      qrLight: theme.qrLight,
      textColor: theme.textColor ?? null,
    });
  } catch (err) {
    console.error('[qr/poster][sync]', err);
    const detail = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}

async function runRender(body: Body, theme: NonNullable<ReturnType<typeof getQrTheme>>): Promise<string> {
  const prompt = buildQrPosterPrompt(theme, {
    names: body.names,
    dateLabel: body.dateLabel,
    kicker: (body.kicker || 'Scan to open').trim().slice(0, 60),
  });

  const result = await generateImage({
    prompt,
    purpose: 'invite',
    quality: 'high',
    size: '1024x1536',
    moderation: 'auto',
  });

  if (!result) {
    const upstream = getLastOpenAIError();
    throw new Error(
      upstream
        ? `Painter said: ${upstream}`
        : 'The painter returned nothing — try a different theme.',
    );
  }

  const ext = result.mimeType.includes('jpeg') || result.mimeType.includes('jpg') ? 'jpg' : 'png';
  const key = `qr-posters/${body.siteSlug}/${theme.id}-${Date.now().toString(36)}.${ext}`;
  await uploadToR2(key, Buffer.from(result.base64, 'base64'), result.mimeType);
  return getR2Url(key);
}
