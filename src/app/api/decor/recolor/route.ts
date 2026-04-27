// ─────────────────────────────────────────────────────────────
// Pearloom / api/decor/recolor — repaint an existing AI art
// asset with a new palette while preserving composition.
//
// POST { sourceUrl, palette: { ink, accent, soft } }
//   Fetches the source PNG (R2 / public URL) and feeds it into
//   gpt-image-2's edit endpoint with a prompt that asks the
//   painter to keep the composition + lines + subject identical
//   and only swap the colors.
//
//   We also run the existing white-background flood-fill so the
//   output keeps clean alpha, then upload to R2 + return the
//   new URL.
//
// Without OPENAI_API_KEY: returns 503 with a clear "painter is
// offline" message.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateImage } from '@/lib/memory-engine/image-router';
import { getLastOpenAIError, hasOpenAIImageKey } from '@/lib/memory-engine/openai-image';
import { uploadToR2, getR2Url } from '@/lib/r2';
import { removeWhiteBackground } from '@/lib/decor/remove-background';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

interface Body {
  sourceUrl: string;
  palette: { ink: string; accent: string; soft?: string };
  /** Decor kind so we tag the R2 key meaningfully. */
  kind?: 'stamp' | 'divider' | 'bouquet' | 'flourish' | 'confetti' | 'sticker';
}

async function fetchAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mimeType = res.headers.get('content-type') ?? 'image/png';
    return { base64: buf.toString('base64'), mimeType };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!body.sourceUrl || !body.palette?.ink || !body.palette?.accent) {
    return NextResponse.json({ error: 'sourceUrl + palette.ink + palette.accent required.' }, { status: 400 });
  }
  if (!hasOpenAIImageKey()) {
    return NextResponse.json(
      { error: 'Pear\'s painter is offline — image editing isn\'t configured on this server.' },
      { status: 503 },
    );
  }

  const source = await fetchAsBase64(body.sourceUrl);
  if (!source) {
    return NextResponse.json({ error: 'Could not load the source image to recolor.' }, { status: 400 });
  }

  const prompt =
    `Recolor this isolated illustration to use only these tones: ` +
    `ink ${body.palette.ink}, accent ${body.palette.accent}` +
    (body.palette.soft ? `, soft tone ${body.palette.soft}` : '') +
    `. Keep the composition, line work, and subject IDENTICAL — change colours only. ` +
    `The background must remain pure white (#FFFFFF) so it can be removed in post. ` +
    `Painterly, hand-drawn, uniform line weight. No text, no signatures.`;

  const result = await generateImage({
    prompt,
    inputImage: { base64: source.base64, mimeType: source.mimeType },
    purpose: 'invite',
    quality: 'high',
    size: '1024x1024',
    moderation: 'low',
    // Recolor preserves the source's transparent backdrop. Was
    // hard-removed via flood-fill before gpt-image-2 supported it.
    background: 'transparent',
  });

  if (!result) {
    const upstream = getLastOpenAIError();
    return NextResponse.json(
      { error: upstream ? `Painter said: ${upstream}` : 'Recolor failed.' },
      { status: 502 },
    );
  }

  // Re-run white background removal so the recolored asset has
  // clean alpha just like a fresh decor library generation.
  const rawPng = Buffer.from(result.base64, 'base64');
  const removed = await removeWhiteBackground(rawPng).catch(() => null);
  const finalBuffer = removed?.buffer ?? rawPng;

  const slug = (body.kind ?? 'decor').replace(/[^a-z0-9-]/gi, '-');
  const key = `decor-recolor/${slug}-${Date.now().toString(36)}.png`;
  try {
    await uploadToR2(key, finalBuffer, 'image/png');
  } catch (err) {
    console.error('[decor/recolor] R2 upload failed:', err);
    return NextResponse.json({ error: 'Could not stage the recolored asset.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    url: getR2Url(key),
  });
}
