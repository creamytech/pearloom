// ─────────────────────────────────────────────────────────────
// Pearloom / api/inline-rewrite/route.ts
//
// POST /api/inline-rewrite
//   body: { text: string, context?: string, instruction?: string,
//           voiceProfile?: { tone?, formality?, phrases?, avoidList? } }
//   returns: { rewritten: string }
//
// Tiny single-call endpoint used by the canvas FloatingFormatToolbar
// when the host highlights text and clicks "rewrite". Claude Haiku
// rewrites the selection to be tighter / warmer, preserving meaning,
// length within ±20%.
//
// Auth-gated and rate-limited so this can't be abused.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, checkPearGate } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 25;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  // Phase 3.3 of AUDIT-2026-05-29 — plan-tier gate. Inline
  // rewrites call Claude on every selection-change; without this
  // gate a free user with the inline toolbar open burns through
  // the Anthropic budget fast.
  const { blocked } = await checkPearGate(session.user.email);
  if (blocked) return blocked;

  const rate = checkRateLimit(`inline-rewrite:${session.user.email}:${getClientIp(req)}`, {
    max: 30,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many rewrites — wait a moment.' }, { status: 429 });
  }

  let body: {
    text?: unknown;
    context?: unknown;
    instruction?: unknown;
    voiceProfile?: { tone?: string; formality?: number; phrases?: string[]; avoidList?: string[] };
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = String(body.text ?? '').trim();
  if (!text || text.length < 2) {
    return NextResponse.json({ error: 'Empty selection' }, { status: 400 });
  }
  if (text.length > 1200) {
    return NextResponse.json({ error: 'Selection too long for inline rewrite (>1200 chars)' }, { status: 400 });
  }

  /* The host's direction — either a tone tag from the preset chips
     ("funnier", "more poetic") or a free-form whisper typed at the
     selection ("like a dinner party, not a gala"). Before this
     param existed the route hardcoded "tighter and warmer", which
     made every tone chip produce the same rewrite. Clamped + quoted
     into the user turn (never the system prompt) so a creative
     instruction can't override the formatting contract. */
  const instruction = String(body.instruction ?? '').trim().slice(0, 280);
  const context = String(body.context ?? '').trim().slice(0, 80);

  /* Optional voice block — editor callers attach the site's Voice
     DNA (manifest.voiceDNA via lib/pear/editor-voice) so rewrites
     sound like the host. Same param name + shape as
     /api/rewrite-text's voiceProfile. Joined into the USER turn:
     the system prompt is prompt-cached and must stay static. */
  const vp = body.voiceProfile && typeof body.voiceProfile === 'object' ? body.voiceProfile : undefined;
  const voiceLines = vp
    ? [
        `The host's voice — write in it:`,
        typeof vp.tone === 'string' && vp.tone.trim() ? `- Tone: ${vp.tone.trim().slice(0, 80)}` : '',
        typeof vp.formality === 'number' ? `- Formality (1=very casual, 5=very formal): ${vp.formality}` : '',
        Array.isArray(vp.phrases) && vp.phrases.length
          ? `- Signature phrases (use naturally when fitting): ${vp.phrases.slice(0, 6).map((p) => `"${String(p).slice(0, 60)}"`).join(', ')}`
          : '',
        Array.isArray(vp.avoidList) && vp.avoidList.length
          ? `- Avoid: ${vp.avoidList.slice(0, 5).map((w) => `"${String(w).slice(0, 40)}"`).join(', ')}`
          : '',
      ].filter(Boolean)
    : [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Graceful degrade — return the original text so the UI still
    // closes the busy state without crashing.
    return NextResponse.json({ rewritten: text });
  }

  try {
    /* Use the centralized claude client so all inline-rewrite
       calls share the same retry + caching behaviour. The raw
       fetch this replaced bypassed model-id central management
       — when client.ts bumps Haiku, this endpoint stays in sync. */
    const { generate, textFrom, cached, CLAUDE_HAIKU } = await import('@/lib/claude/client');
    void CLAUDE_HAIKU; // model id is read via tier alias below
    const msg = await generate({
      tier: 'haiku',
      /* Static system prompt → wrapped in cached() so every
         inline-rewrite call shares one prompt-cache entry (same
         pattern as /api/pear-chat). The per-request selection stays
         in the user message after the breakpoint. */
      system: [
        cached(
          'You rewrite event-website microcopy with warmth and editorial precision. Preserve the original meaning. Keep length within ±20%. Do not add quote marks, headers, or explanation — return ONLY the rewritten text.'
        ),
      ],
      messages: [
        {
          role: 'user',
          content: [
            `Rewrite this ${context || 'snippet'} for a wedding/celebration site.`,
            instruction
              ? `The host's direction: "${instruction}"`
              : 'Direction: tighter and warmer.',
            ...voiceLines,
            '',
            text,
          ].join('\n'),
        },
      ],
      maxTokens: 400,
      temperature: 0.65,
    });
    const rewritten = textFrom(msg).trim();
    if (!rewritten) return NextResponse.json({ rewritten: text });
    return NextResponse.json({ rewritten });
  } catch (err) {
    console.warn('[inline-rewrite] claude error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ rewritten: text });
  }
}
