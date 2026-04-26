// ─────────────────────────────────────────────────────────────
// Pearloom / api/decor/sticker/route.ts
//
// POST /api/decor/sticker
//   body: { siteId, occasion, paletteHex?, venue?, vibe?, hint? }
//   returns: { url: string }  // single sticker PNG on R2
//
// Generates ONE custom sticker via GPT Image 2 — optional
// free-text `hint` lets the user describe what they want. The
// renderer places it wherever the user drops it on the canvas.
//
// Rate-limited 12/hour/user since individual stickers are lighter.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { openaiGenerateImage, getLastOpenAIError } from '@/lib/memory-engine/openai-image';
import { uploadToR2, getR2Url } from '@/lib/r2';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { stickerPrompt } from '@/lib/decor/prompts';
import { removeWhiteBackground } from '@/lib/decor/remove-background';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`decor-sticker:${session.user.email}:${ip}`, {
    max: 12,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Sticker generation is limited to 12 per hour. Try again later.' },
      { status: 429 },
    );
  }

  let body: {
    siteId?: string;
    occasion?: string;
    paletteHex?: string[];
    venue?: string;
    vibe?: string;
    hint?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { siteId, occasion, paletteHex, venue, vibe, hint } = body;
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI sticker generation not configured on this server.' },
      { status: 500 },
    );
  }

  const prompt = stickerPrompt({
    occasion: occasion ?? 'wedding',
    paletteHex: paletteHex ?? [],
    venue,
    vibe,
    hint,
  });

  try {
    const result = await openaiGenerateImage({
      apiKey,
      prompt,
      size: '1024x1024',
      quality: 'high',
      format: 'png',
    });

    if (!result?.base64) {
      const detail = getLastOpenAIError();
      return NextResponse.json(
        { error: detail ? `Sticker generation failed: ${detail}` : 'Sticker generation returned empty.' },
        { status: 502 },
      );
    }

    // gpt-image-2 returns opaque PNG — flood-fill the white edges to
    // get a clean alpha so the sticker sits on any block without
    // a square halo. removeWhiteBackground falls back to the original
    // if it can't isolate (e.g. prompt drift produced a coloured bg).
    const rawBuffer = Buffer.from(result.base64, 'base64');
    const cutout = await removeWhiteBackground(rawBuffer);

    const key = `decor/${siteId}/stickers/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`;
    await uploadToR2(key, cutout.buffer, 'image/png');
    const url = getR2Url(key);
    return NextResponse.json({
      url,
      isolated: cutout.isolated,
      prompt,
      customPrompt: hint && hint.trim() ? hint.trim() : null,
      ...(cutout.isolated ? {} : { warning: 'Couldn\'t fully isolate the sticker — try a clearer prompt.' }),
    });
  } catch (err) {
    console.error('[decor/sticker] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sticker generation failed' },
      { status: 500 },
    );
  }
}
