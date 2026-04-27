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
import { hasOpenAIImageKey } from '@/lib/memory-engine/openai-image';
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

  const ctx: InviteContext = {
    names: body.names,
    date: body.date,
    venue: body.venue,
    city: body.city,
    occasionLabel: body.occasionLabel ?? 'celebration',
    palette: body.palette,
    hasPortrait: Boolean(body.portrait),
  };

  let result;
  try {
    result = await renderArchetype({
      archetype,
      ctx,
      portrait: body.portrait
        ? { base64: body.portrait.base64, mimeType: body.portrait.mimeType }
        : undefined,
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
    return NextResponse.json(
      { error: 'Pear couldn\'t finish that one — the painter timed out or rejected the prompt. Try a different archetype.' },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, ...result });
}
