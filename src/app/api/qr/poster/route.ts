// ─────────────────────────────────────────────────────────────
// Pearloom / api/qr/poster — themed AI poster generation.
//
// POST { themeId, names, dateLabel, kicker?, siteSlug }
//   Generates an A4-portrait poster background using gpt-image-2.
//   The prompt instructs the painter to LEAVE A BLANK CENTRE
//   AREA (700×700 px) where the real, scannable QR is composited
//   client-side at print time.
//
// Returns: { ok, url, themeId, qrDark, qrLight }
//
// Without OPENAI_API_KEY (or Gemini fallback) returns 503 with a
// friendly "painter is offline" message — same pattern as the
// invite designer.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateImage } from '@/lib/memory-engine/image-router';
import { getLastOpenAIError, hasOpenAIImageKey } from '@/lib/memory-engine/openai-image';
import { uploadToR2, getR2Url } from '@/lib/r2';
import { buildQrPosterPrompt, getQrTheme, type QrThemeId } from '@/lib/qr-engine/themes';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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
    const detail = upstream
      ? `Painter said: ${upstream}`
      : 'The painter returned nothing — try a different theme.';
    return NextResponse.json({ error: detail }, { status: 502 });
  }

  // Upload to R2.
  const ext = result.mimeType.includes('jpeg') || result.mimeType.includes('jpg') ? 'jpg' : 'png';
  const key = `qr-posters/${body.siteSlug}/${theme.id}-${Date.now().toString(36)}.${ext}`;
  try {
    await uploadToR2(key, Buffer.from(result.base64, 'base64'), result.mimeType);
  } catch (err) {
    console.error('[qr/poster] R2 upload failed:', err);
    return NextResponse.json({ error: 'Could not stage the poster artwork.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    themeId: theme.id,
    url: getR2Url(key),
    qrDark: theme.qrDark,
    qrLight: theme.qrLight,
    textColor: theme.textColor ?? null,
  });
}
