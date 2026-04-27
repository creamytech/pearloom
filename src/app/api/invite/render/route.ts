// ─────────────────────────────────────────────────────────────
// Pearloom / api/invite/render — bespoke hero artwork via the
// InviteArchetype recipes.
//
// Async pattern: writing a render_jobs row, scheduling the actual
// painter call via Next.js after() so it runs after the response
// returns, and returning { jobId } immediately. The client polls
// /api/invite/render/[jobId] until status flips. This is what
// keeps "Pear timed out before the painter finished" from
// happening — the gateway only sees a fast response, the painter
// keeps painting up to maxDuration in the background.
//
// Authenticated + rate-limited because every call burns an OpenAI
// image credit.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getArchetype } from '@/lib/invite-engine/archetypes';
import { renderArchetype } from '@/lib/invite-engine/render';
import { hasOpenAIImageKey, getLastOpenAIError } from '@/lib/memory-engine/openai-image';
import type { InviteContext, PaletteHex } from '@/lib/invite-engine/designer-prompts';
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

  // ── Async path ────────────────────────────────────────────
  // When render_jobs is available, return a jobId immediately
  // and let after() run the painter past the gateway timeout.
  if (renderJobsAvailable()) {
    const job = await createJob({
      ownerEmail: session.user.email,
      siteSlug: body.siteSlug,
      surface: 'invite',
      payload: { archetypeId: body.archetypeId, hasInspiration: !!body.inspiration, hasPortrait: !!body.portrait },
    });

    if (job) {
      after(async () => {
        try {
          await markRunning(job.id);
          const url = await runRender(body, archetype);
          await markComplete(job.id, { url, mime: 'image/png' });
        } catch (err) {
          const detail = err instanceof Error ? err.message : 'unknown error';
          console.error('[invite/render][async]', detail);
          await markFailed(job.id, detail);
        }
      });

      return NextResponse.json({ ok: true, jobId: job.id, async: true });
    }
    // If the row write itself failed, fall through to the sync
    // path so we still attempt the render — better to time out
    // than to silently 500 when a host clicked Paint.
  }

  // ── Sync path (fallback) ───────────────────────────────────
  // Used when render_jobs isn't reachable (no Supabase env, local
  // dev, etc.). Holds the connection like the old route did.
  try {
    const url = await runRender(body, archetype);
    return NextResponse.json({ ok: true, url, mimeType: 'image/png', provider: 'openai' });
  } catch (err) {
    console.error('[invite/render][sync]', err);
    const detail = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: `Renderer hit a snag: ${detail}` }, { status: 502 });
  }
}

/** Shared painter call. Throws on failure so both paths can
 *  consistently bubble the error up. */
async function runRender(
  body: Body,
  archetype: ReturnType<typeof getArchetype>,
): Promise<string> {
  if (!archetype) throw new Error('Archetype lost before render.');
  const hasInspiration = Boolean(body.inspiration?.base64);
  const ctx: InviteContext = {
    names: body.names,
    date: body.date,
    venue: body.venue,
    city: body.city,
    occasionLabel: body.occasionLabel ?? 'celebration',
    palette: body.palette,
    hasPortrait: Boolean(body.portrait),
    hint: typeof body.hint === 'string' && body.hint.trim().length > 0
      ? body.hint.trim().slice(0, 600)
      : undefined,
    hasInspiration,
  };

  const inputImages: Array<{ base64: string; mimeType: string }> = [];
  if (body.portrait?.base64) inputImages.push({ base64: body.portrait.base64, mimeType: body.portrait.mimeType });
  if (body.inspiration?.base64) inputImages.push({ base64: body.inspiration.base64, mimeType: body.inspiration.mimeType });

  const result = await renderArchetype({
    archetype,
    ctx,
    portrait: inputImages[0],
    extraInputImages: inputImages.length > 1 ? inputImages.slice(1) : undefined,
    siteSlug: body.siteSlug,
  });

  if (!result) {
    const upstream = getLastOpenAIError();
    throw new Error(
      upstream
        ? `Painter said: ${upstream}`
        : 'The painter returned nothing — try a different archetype or palette.',
    );
  }
  return result.url;
}
