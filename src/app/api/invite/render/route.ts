// ─────────────────────────────────────────────────────────────
// Pearloom / api/invite/render — bespoke hero artwork via the
// InviteArchetype recipes. Authenticated + rate-limited because
// every call burns an OpenAI image credit.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getArchetype } from '@/lib/invite-engine/archetypes';
import { renderArchetype } from '@/lib/invite-engine/render';
import { hasOpenAIImageKey, getLastOpenAIError } from '@/lib/memory-engine/openai-image';
import type { InviteContext, PaletteHex } from '@/lib/invite-engine/designer-prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface Body {
  archetypeId: string;
  siteSlug: string;
  names: string;
  date: string;
  venue?: string;
  city?: string;
  occasionLabel?: string;
  palette: PaletteHex;
  /** Optional base64 couple portrait + mime. Edits endpoint. */
  portrait?: { base64: string; mimeType: string };
  /** Optional inspiration image — passed alongside the portrait
   *  so the painter mimics composition, palette, mood. */
  inspiration?: { base64: string; mimeType: string };
  /** Optional free-form host hint that gets concatenated into the
   *  archetype's prompt (e.g. "feels like Tuscany, gold leaf"). */
  hint?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`invite-render:${session.user.email}:${ip}`, { max: 8, windowMs: 5 * 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many renders in a short period. Try again shortly.' },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.archetypeId || !body.siteSlug || !body.names || !body.date || !body.palette) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const archetype = getArchetype(body.archetypeId);
  if (!archetype) return NextResponse.json({ error: 'Unknown archetype.' }, { status: 400 });

  // Verify at least one image provider is configured before we tell
  // the user "Pear is painting…" — otherwise we burn 30s on an
  // inevitable null result and surface a generic 502. Better to fail
  // loud and clear at the door.
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

  const hasInspiration = Boolean(body.inspiration?.base64);
  const ctx: InviteContext = {
    names: body.names,
    date: body.date,
    venue: body.venue,
    city: body.city,
    occasionLabel: body.occasionLabel ?? 'celebration',
    palette: body.palette,
    hasPortrait: Boolean(body.portrait),
    // Tack the host's free-form hint onto the prompt context so the
    // archetype builder can weave it into the system instructions.
    hint: typeof body.hint === 'string' && body.hint.trim().length > 0
      ? body.hint.trim().slice(0, 600)
      : undefined,
    hasInspiration,
  };

  let result;
  try {
    // Build the inputImages array from portrait + inspiration. OpenAI
    // gpt-image-2 supports up to 10 input images on the edits route.
    const inputImages: Array<{ base64: string; mimeType: string }> = [];
    if (body.portrait?.base64) inputImages.push({ base64: body.portrait.base64, mimeType: body.portrait.mimeType });
    if (body.inspiration?.base64) inputImages.push({ base64: body.inspiration.base64, mimeType: body.inspiration.mimeType });
    result = await renderArchetype({
      archetype,
      ctx,
      portrait: inputImages[0],
      extraInputImages: inputImages.length > 1 ? inputImages.slice(1) : undefined,
      siteSlug: body.siteSlug,
    });
  } catch (err) {
    console.error('[invite/render] failed:', err);
    const detail = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json(
      { error: `Renderer hit a snag: ${detail}` },
      { status: 502 },
    );
  }

  if (!result) {
    // Surface the real OpenAI error if we have one — way more
    // actionable than the generic "couldn't finish that one."
    const upstream = getLastOpenAIError();
    const detail = upstream
      ? `Painter said: ${upstream}`
      : 'The painter returned nothing — try a different archetype or palette.';
    return NextResponse.json({ error: detail }, { status: 502 });
  }
  return NextResponse.json({ ok: true, ...result });
}
