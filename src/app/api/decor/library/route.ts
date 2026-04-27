// ─────────────────────────────────────────────────────────────
// Pearloom / api/decor/library/route.ts
//
// POST /api/decor/library
//   body: { siteId, occasion, venue?, paletteHex?, vibe?, slots? }
//   returns: { library: DecorLibrary }
//
// Generates the full decor library in four parallel GPT Image 2
// calls:
//   1. divider          → 1600×320 ornamental band (1:5 aspect)
//   2. sectionStamps    → 3×2 grid of six circular stamps,
//                          sliced client-side into 6 PNGs
//   3. confetti         → 1024×1024 burst
//   4. footerBouquet    → 1024×1536 centred closing flourish
//
// Results upload to R2 and come back as permanent URLs. The
// `stickers` URL is intentionally omitted — stickers are
// per-prompt via /api/decor/sticker.
//
// Rate-limited 3/hour/user since each call is a full library.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { openaiGenerateImage, getLastOpenAIError } from '@/lib/memory-engine/openai-image';
import { uploadToR2, getR2Url } from '@/lib/r2';
import { persistUserMedia } from '@/lib/user-media';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  dividerPrompt,
  sectionStampsPrompt,
  confettiPrompt,
  footerBouquetPrompt,
  type DecorContext,
} from '@/lib/decor/prompts';
import { removeWhiteBackground } from '@/lib/decor/remove-background';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

type SlotName = 'divider' | 'sectionStamps' | 'confetti' | 'footerBouquet';
const ALL_SLOTS: SlotName[] = ['divider', 'sectionStamps', 'confetti', 'footerBouquet'];

const SECTION_KEYS = ['story', 'schedule', 'travel', 'registry', 'gallery', 'rsvp'] as const;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`decor-library:${session.user.email}:${ip}`, {
    max: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Library generation is limited to 3 per hour. Try again later.' },
      { status: 429 },
    );
  }

  let body: {
    siteId?: string;
    occasion?: string;
    venue?: string;
    paletteHex?: string[];
    vibe?: string;
    slots?: SlotName[];
    /** Per-slot custom prompt overrides. Only the slots being
     *  generated this call need to be present. */
    customPrompts?: Partial<Record<SlotName, string>>;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { siteId, occasion, venue, paletteHex, vibe, customPrompts } = body;
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI decor generation not configured on this server.' },
      { status: 500 },
    );
  }

  const ctx: DecorContext = {
    occasion: occasion ?? 'wedding',
    paletteHex: paletteHex ?? [],
    venue,
    vibe,
  };

  const slotsRequested: SlotName[] =
    body.slots && body.slots.length ? body.slots.filter((s) => ALL_SLOTS.includes(s)) : ALL_SLOTS;

  try {
    // Run all requested slots in parallel. Each slot handler returns
    // a partial DecorLibrary + the prompt actually used.
    const results = await Promise.allSettled(
      slotsRequested.map(async (slot) => {
        const slotCtx: DecorContext = { ...ctx, customPrompt: customPrompts?.[slot] };
        switch (slot) {
          case 'divider': {
            const r = await generateDivider(apiKey, slotCtx, siteId);
            return { divider: r.url, prompts: { divider: r.prompt } };
          }
          case 'sectionStamps': {
            const r = await generateSectionStamps(apiKey, slotCtx, siteId);
            return { sectionStamps: r.stamps, prompts: { sectionStamps: r.prompt } };
          }
          case 'confetti': {
            const r = await generateConfetti(apiKey, slotCtx, siteId);
            return { confetti: r.url, prompts: { confetti: r.prompt } };
          }
          case 'footerBouquet': {
            const r = await generateFooterBouquet(apiKey, slotCtx, siteId);
            return { footerBouquet: r.url, prompts: { footerBouquet: r.prompt } };
          }
          default:
            return {};
        }
      }),
    );

    const library: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    const prompts: Record<string, string> = {};
    const failures: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        const v = r.value as { prompts?: Record<string, string> } & Record<string, unknown>;
        if (v.prompts) Object.assign(prompts, v.prompts);
        const { prompts: _p, ...rest } = v;
        void _p;
        Object.assign(library, rest);
      } else {
        failures.push(`${slotsRequested[i]}: ${r.reason instanceof Error ? r.reason.message : 'failed'}`);
      }
    });

    // Persist every generated asset into the user's media library
    // so it shows up in the editor's Library tab. Per-slot rows
    // are tagged with their source so the library can group them.
    const ownerEmail = session.user!.email!;
    const mediaRows: Parameters<typeof persistUserMedia>[0] = [];
    if (typeof library.divider === 'string') {
      mediaRows.push({ owner_email: ownerEmail, url: library.divider, source: 'ai-decor:divider', source_site_id: siteId, mime_type: 'image/png' });
    }
    if (typeof library.confetti === 'string') {
      mediaRows.push({ owner_email: ownerEmail, url: library.confetti, source: 'ai-decor:confetti', source_site_id: siteId, mime_type: 'image/png' });
    }
    if (typeof library.footerBouquet === 'string') {
      mediaRows.push({ owner_email: ownerEmail, url: library.footerBouquet, source: 'ai-decor:bouquet', source_site_id: siteId, mime_type: 'image/png' });
    }
    if (library.sectionStamps && typeof library.sectionStamps === 'object') {
      for (const [k, v] of Object.entries(library.sectionStamps as Record<string, unknown>)) {
        if (typeof v === 'string') {
          mediaRows.push({
            owner_email: ownerEmail,
            url: v,
            source: 'ai-decor:stamp',
            source_site_id: siteId,
            mime_type: 'image/png',
            filename: `section-stamp-${k}.png`,
          });
        }
      }
    }
    void persistUserMedia(mediaRows);

    return NextResponse.json({ library, prompts, failures, customPrompts: customPrompts ?? null });
  } catch (err) {
    console.error('[decor/library] unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Library generation failed' },
      { status: 500 },
    );
  }
}

// ── Slot generators ──────────────────────────────────────────────────────

async function generateDivider(apiKey: string, ctx: DecorContext, siteId: string): Promise<{ url: string; prompt: string }> {
  const prompt = dividerPrompt(ctx);
  const result = await openaiGenerateImage({
    apiKey,
    prompt,
    size: '1536x1024',
    quality: 'high',
    format: 'png',
    background: 'transparent',
  });
  if (!result?.base64) throw new Error(`Divider failed: ${getLastOpenAIError() ?? 'no response'}`);
  const buf = Buffer.from(result.base64, 'base64');
  const cropped = await sharp(buf)
    .extract({ left: 0, top: 340, width: 1536, height: 340 })
    .png()
    .toBuffer();

  const cutout = await removeWhiteBackground(cropped);

  const key = `decor/${siteId}/${Date.now()}-divider.png`;
  await uploadToR2(key, cutout.buffer, 'image/png');
  return { url: getR2Url(key), prompt };
}

async function generateSectionStamps(
  apiKey: string,
  ctx: DecorContext,
  siteId: string,
): Promise<{ stamps: Record<string, string>; prompt: string }> {
  // The model's widest supported size is 1536×1024; we lay six stamps
  // out 3×2 into that frame and slice client-side.
  const prompt = sectionStampsPrompt(ctx);
  const result = await openaiGenerateImage({
    apiKey,
    prompt,
    size: '1536x1024',
    quality: 'high',
    format: 'png',
    background: 'transparent',
  });
  if (!result?.base64) throw new Error(`Stamps failed: ${getLastOpenAIError() ?? 'no response'}`);

  const buf = Buffer.from(result.base64, 'base64');
  // 3 cols × 2 rows inside a 1536×1024 sheet → each tile 512×512.
  const tileW = 512;
  const tileH = 512;
  const stamps: Record<string, string> = {};
  const timestamp = Date.now();
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const tile = await sharp(buf)
      .extract({ left: col * tileW, top: row * tileH, width: tileW, height: tileH })
      .resize(512, 512, { fit: 'inside' })
      .png()
      .toBuffer();
    const cutout = await removeWhiteBackground(tile);
    const key = `decor/${siteId}/${timestamp}-stamp-${SECTION_KEYS[i]}.png`;
    await uploadToR2(key, cutout.buffer, 'image/png');
    stamps[SECTION_KEYS[i]] = getR2Url(key);
  }
  return { stamps, prompt };
}

async function generateConfetti(apiKey: string, ctx: DecorContext, siteId: string): Promise<{ url: string; prompt: string }> {
  const prompt = confettiPrompt(ctx);
  const result = await openaiGenerateImage({
    apiKey,
    prompt,
    size: '1024x1024',
    quality: 'high',
    format: 'png',
    background: 'transparent',
  });
  if (!result?.base64) throw new Error(`Confetti failed: ${getLastOpenAIError() ?? 'no response'}`);
  const cutout = await removeWhiteBackground(Buffer.from(result.base64, 'base64'));
  const key = `decor/${siteId}/${Date.now()}-confetti.png`;
  await uploadToR2(key, cutout.buffer, 'image/png');
  return { url: getR2Url(key), prompt };
}

async function generateFooterBouquet(
  apiKey: string,
  ctx: DecorContext,
  siteId: string,
): Promise<{ url: string; prompt: string }> {
  const prompt = footerBouquetPrompt(ctx);
  const result = await openaiGenerateImage({
    apiKey,
    prompt,
    size: '1024x1536',
    quality: 'high',
    format: 'png',
    background: 'transparent',
  });
  if (!result?.base64) throw new Error(`Bouquet failed: ${getLastOpenAIError() ?? 'no response'}`);
  const cutout = await removeWhiteBackground(Buffer.from(result.base64, 'base64'));
  const key = `decor/${siteId}/${Date.now()}-bouquet.png`;
  await uploadToR2(key, cutout.buffer, 'image/png');
  return { url: getR2Url(key), prompt };
}
