// ─────────────────────────────────────────────────────────────
// Pearloom / api/photos/stylize/route.ts
//
// Photo-to-style transformation via OpenAI GPT Image 2 (primary,
// released 2026-04-21) with Gemini Nano Banana as a graceful
// fallback. Takes a couple's uploaded photo + a preset style id
// (paper-craft, watercolor, embroidery, botanical) and returns
// a new R2-hosted URL for the stylized image.
//
// Designed for the Save-the-Date "Photo" variant: one click
// turns the hero into a shareable editorial artefact while
// keeping the couple recognisable. gpt-image-2 preserves faces
// more faithfully than Nano Banana on photo edits — that's why
// we default to it now.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { uploadToR2 } from '@/lib/r2';
import { persistUserMedia } from '@/lib/user-media';
import { generateImage } from '@/lib/memory-engine/image-router';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

// ── Style presets ────────────────────────────────────────────
// Each prompt preserves the couple's identity (faces, pose,
// clothing silhouettes) while restyling the scene. Keep them
// dense and directive — the image model follows specifics.
const STYLES = {
  'paper-craft': {
    label: 'Paper craft',
    prompt: `Transform this photograph into a meticulous layered paper-craft diorama. Preserve the exact faces, expressions, pose, and clothing silhouettes of the people — they must remain unmistakably the same individuals. Render every element (subjects, clothes, background, foliage, props) as cut-paper layers with visible soft drop shadows between the layers, gentle paper grain, and subtle scissor-cut edges. Warm natural daylight. Muted pastel palette with cream, sage, dusty rose, and ivory. No text, no watermarks, no borders. Square framing, centred composition.`,
  },
  watercolor: {
    label: 'Watercolor',
    prompt: `Transform this photograph into a romantic hand-painted watercolor portrait. Preserve the exact faces, expressions, pose, and clothing silhouettes — they must remain unmistakably the same individuals. Render with loose wet-on-wet washes, soft bleeding colour edges, visible paper texture, and delicate ink line work for defining features. Soft natural light. Palette: warm creams, blush, sepia, muted sage, faded indigo. Leave some negative space around the subjects as if painted on an illustration-board. No text, no watermarks.`,
  },
  embroidery: {
    label: 'Embroidery',
    prompt: `Transform this photograph into a detailed textile-embroidery rendering on off-white linen. Preserve the exact faces, expressions, pose, and clothing silhouettes — they must remain unmistakably the same individuals. Render every element as rows of tiny coloured thread stitches (satin stitch for skin and fabric, French knots for floral accents, running stitch for outlines). Visible linen weave behind. Palette: earthen threads — terracotta, sage, mustard, rose, ivory, indigo. No text, no watermarks, no hoop or frame.`,
  },
  botanical: {
    label: 'Botanical etching',
    prompt: `Transform this photograph into a fine botanical copper-plate etching in the style of a 19th-century natural-history illustration. Preserve the exact faces, expressions, pose, and clothing silhouettes — they must remain unmistakably the same individuals. Render with crisp inked crosshatching, stippling for tones, and delicate line detail. Surround and interweave the subjects with abundant hand-drawn botanicals — leaves, ferns, blossoms, vines — in the same etched line style. Ink on ivory paper. Monochrome sepia ink, no colour. No text, no watermarks, no decorative frame.`,
  },
} as const satisfies Record<string, { label: string; prompt: string }>;

type StyleId = keyof typeof STYLES;

const MAX_SOURCE_BYTES = 15 * 1024 * 1024; // 15 MB

interface StylizePayload {
  photoUrl?: string;
  style?: StyleId;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`stylize:${session.user.email}:${ip}`, {
    max: 12,
    windowMs: 5 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many style renders in a row — try again in a minute.' },
      { status: 429 },
    );
  }

  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_AI_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Image styling is not configured on this server.' },
      { status: 500 },
    );
  }

  let body: StylizePayload = {};
  try {
    body = (await req.json()) as StylizePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { photoUrl, style } = body;
  if (!photoUrl || typeof photoUrl !== 'string') {
    return NextResponse.json({ error: 'photoUrl is required' }, { status: 400 });
  }
  if (!style || !(style in STYLES)) {
    return NextResponse.json(
      { error: `Unknown style. Valid: ${Object.keys(STYLES).join(', ')}` },
      { status: 400 },
    );
  }

  // ── Fetch source photo ─────────────────────────────────────
  let sourceRes: Response;
  try {
    sourceRes = await fetch(photoUrl);
  } catch (err) {
    console.error('[stylize] source fetch failed:', err);
    return NextResponse.json({ error: 'Could not reach source photo.' }, { status: 400 });
  }
  if (!sourceRes.ok) {
    return NextResponse.json(
      { error: `Source photo returned ${sourceRes.status}.` },
      { status: 400 },
    );
  }
  const sourceMime = sourceRes.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg';
  if (!sourceMime.startsWith('image/')) {
    return NextResponse.json({ error: 'Source URL is not an image.' }, { status: 400 });
  }
  const sourceBuf = Buffer.from(await sourceRes.arrayBuffer());
  if (sourceBuf.length === 0) {
    return NextResponse.json({ error: 'Source photo is empty.' }, { status: 400 });
  }
  if (sourceBuf.length > MAX_SOURCE_BYTES) {
    return NextResponse.json(
      { error: `Source photo is too large (max ${MAX_SOURCE_BYTES / (1024 * 1024)} MB).` },
      { status: 400 },
    );
  }

  // ── Image-gen call (gpt-image-2 preferred, Gemini fallback) ─
  const preset = STYLES[style];
  let result;
  try {
    result = await generateImage({
      apiKey,
      prompt: preset.prompt,
      inputImage: { mimeType: sourceMime, base64: sourceBuf.toString('base64') },
      purpose: 'stylize',
      quality: 'high',
      size: '1024x1024',
      // `low` moderation keeps the edit flexible on wedding portraits
      // (rehearsal-dinner dress, beach attire) where `auto` was over-eager.
      moderation: 'low',
    });
  } catch (err) {
    console.error('[stylize] image-gen call failed:', err);
    return NextResponse.json(
      { error: 'Style renderer is busy. Try again in a moment.' },
      { status: 502 },
    );
  }
  if (!result) {
    return NextResponse.json(
      { error: 'The style renderer couldn\u2019t use this photo. Try a clearer shot.' },
      { status: 502 },
    );
  }

  // ── Upload to R2 ───────────────────────────────────────────
  const userSlug = session.user.email.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  const ext = result.mimeType.includes('png') ? 'png' : 'jpg';
  const key = `stylized/${userSlug}/${Date.now().toString(36)}-${style}.${ext}`;
  const outBuf = Buffer.from(result.base64, 'base64');

  try {
    const url = await uploadToR2(key, outBuf, result.mimeType);

    // Persist the stylised photo into the user's library.
    void persistUserMedia([{
      owner_email: session.user!.email!,
      url,
      source: 'ai-stylize',
      mime_type: result.mimeType,
      filename: `stylized-${style}-${Date.now()}.${ext}`,
      caption: `Stylised: ${preset.prompt.slice(0, 80)}`,
    }]);

    return NextResponse.json({ url, style });
  } catch (err) {
    console.error('[stylize] R2 upload failed:', err);
    return NextResponse.json(
      { error: 'Stylized image couldn\u2019t be saved. Try again.' },
      { status: 500 },
    );
  }
}
