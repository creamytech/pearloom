// ─────────────────────────────────────────────────────────────
// Pearloom / api/decor/ai-accent/route.ts
//
// POST /api/decor/ai-accent
//   body: { siteId, occasion, venue?, paletteHex?, vibe?, existingUrl? }
//   returns: { url: string }  // CDN URL of the generated accent
//
// Calls GPT Image 2 with a prompt grounded in the site's occasion
// + venue + palette so the result reads as "this event's decor"
// rather than a generic illustration. Uploads to R2 for a
// permanent URL and returns it. The editor writes this URL onto
// `manifest.aiAccentUrl` so the hero renders it alongside the
// OccasionDecor set.
//
// Rate-limited per user (6 / hour) to keep this out of the free
// tier being abused.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { openaiGenerateImage, getLastOpenAIError } from '@/lib/memory-engine/openai-image';
import { uploadToR2, getR2Url } from '@/lib/r2';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`ai-accent:${session.user.email}:${ip}`, { max: 6, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many accent requests. Please try again later.' },
      { status: 429 },
    );
  }

  let body: {
    siteId?: string;
    occasion?: string;
    venue?: string;
    paletteHex?: string[];
    vibe?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { siteId, occasion, venue, paletteHex, vibe } = body;
  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI accent generation not configured on this server.' }, { status: 500 });
  }

  const prompt = buildPrompt({ occasion, venue, paletteHex, vibe });

  try {
    const result = await openaiGenerateImage({
      apiKey,
      prompt,
      // Wide aspect ratio so the accent fills a hero band without cropping.
      size: '1536x1024',
      quality: 'high',
      format: 'png',
      moderation: 'auto',
    });

    if (!result?.base64) {
      const detail = getLastOpenAIError();
      return NextResponse.json(
        { error: detail ? `AI accent failed: ${detail}` : 'AI could not draft an accent. Try again.' },
        { status: 502 },
      );
    }

    const key = `decor/${siteId}/${Date.now()}-accent.png`;
    await uploadToR2(key, Buffer.from(result.base64, 'base64'), 'image/png');
    const url = getR2Url(key);

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[ai-accent] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Accent generation failed' },
      { status: 500 },
    );
  }
}

function buildPrompt({
  occasion,
  venue,
  paletteHex,
  vibe,
}: {
  occasion?: string;
  venue?: string;
  paletteHex?: string[];
  vibe?: string;
}): string {
  const occ = (occasion ?? 'celebration').replace(/-/g, ' ');
  const paletteLine = paletteHex && paletteHex.length
    ? `Colour palette (use only these hex values, no rainbow): ${paletteHex.slice(0, 5).join(', ')}.`
    : 'Colour palette: warm cream + soft sage + muted gold. Editorial, not saturated.';
  const venueLine = venue ? `The celebration takes place at: ${venue}. Reference its geography or feeling subtly — don't put the venue name in the image.` : '';
  const vibeLine = vibe ? `Vibe/tone: ${vibe}.` : '';

  return [
    `Editorial hero accent illustration for a Pearloom site. Occasion: ${occ}.`,
    'Hand-drawn ink + gouache feel, flat colour, no gradients, no photorealism, no 3D rendering, no stock-illustration look.',
    'Compose loose botanical + symbolic motifs that a stationery designer would draw: sprigs, ribbons, small objects that suit the occasion (e.g. candles for memorials, rings + laurel for weddings, balloons for a baby shower, a disco ball for a sweet-sixteen, keys for a housewarming).',
    'Arrange around the edges so the centre stays clear — this is decoration, NOT a focal image. No text, no typography, no logos, no watermarks.',
    paletteLine,
    venueLine,
    vibeLine,
    'Backdrop: a warm cream paper the same tone as the palette background. Visible paper grain.',
    'Output should feel like a tasteful editorial flourish — never cute, never cartoon, never AI-glossy.',
  ]
    .filter(Boolean)
    .join('\n');
}
