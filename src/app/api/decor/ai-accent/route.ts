// ─────────────────────────────────────────────────────────────
// Pearloom / api/decor/ai-accent/route.ts
//
// POST /api/decor/ai-accent
//   body: { siteId, occasion, venue?, paletteHex?, vibe? }
//   returns: { url, isolated, warning? }
//
// Calls gpt-image-2 with the shared `heroAccentPrompt` (single
// motif, palette-locked, pure white background contract). The
// post-processor flood-fills the white edges so the resulting PNG
// has clean alpha and composites into the hero without a square
// halo. Uploads to R2 and returns the CDN URL — the editor writes
// it onto `manifest.aiAccentUrl`.
//
// Rate-limited per user (6 / hour).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { openaiGenerateImage, getLastOpenAIError } from '@/lib/memory-engine/openai-image';
import { uploadToR2, getR2Url } from '@/lib/r2';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { heroAccentPrompt } from '@/lib/decor/prompts';
import { removeWhiteBackground } from '@/lib/decor/remove-background';

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
    customPrompt?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { siteId, occasion, venue, paletteHex, vibe, customPrompt } = body;
  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI accent generation not configured on this server.' }, { status: 500 });
  }

  const prompt = heroAccentPrompt({
    occasion: occasion ?? 'wedding',
    paletteHex: paletteHex ?? [],
    venue,
    vibe,
    customPrompt,
  });

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

    const rawBuffer = Buffer.from(result.base64, 'base64');
    const cutout = await removeWhiteBackground(rawBuffer);

    const key = `decor/${siteId}/${Date.now()}-accent.png`;
    await uploadToR2(key, cutout.buffer, 'image/png');
    const url = getR2Url(key);

    return NextResponse.json({
      url,
      isolated: cutout.isolated,
      prompt,
      customPrompt: customPrompt && customPrompt.trim() ? customPrompt.trim() : null,
      ...(cutout.isolated ? {} : { warning: 'Couldn\'t fully isolate the accent — try regenerating.' }),
    });
  } catch (err) {
    console.error('[ai-accent] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Accent generation failed' },
      { status: 500 },
    );
  }
}
