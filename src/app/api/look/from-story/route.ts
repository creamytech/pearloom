// ─────────────────────────────────────────────────────────────
// POST /api/look/from-story
//
// Look-Engine Generate-from-story Claude wrapper. Takes a free-
// text sentence describing the event and returns a structured
// SuggestedLook ({ occasion, edition, texture, voiceOverride,
// density, textureIntensity, rationale }).
//
// Per the Editor Redesign brief §5: "replace generateFromStory()
// keyword matching with an LLM call returning a structured JSON
// (use function-calling / JSON schema). Keep the heuristic
// version as a deterministic fallback."
//
// This route IS the LLM upgrade. The deterministic
// `generateLookFromStory()` in src/lib/look-engine/ is the
// fallback — the route catches all errors, rate-limit hits, and
// missing API keys and returns the heuristic result with
// `source: 'heuristic'` so the client can decide whether to
// surface the LLM rationale or the keyword-match rationale.
//
// Auth: session-required (calling Claude burns tokens — guests
//       shouldn't get to fan this out). Same pattern as other
//       /api/* Claude endpoints.
// Rate: 10 / 10min per user+IP. Generous enough for real
//       editor use; tight enough to deter abuse.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  generate,
  textFrom,
  parseJsonFromText,
  cached,
  CLAUDE_HAIKU,
} from '@/lib/claude/client';
import {
  generateLookFromStory,
  type SuggestedLook,
} from '@/lib/look-engine/generate-from-story';
import { overBudget, chargeAi, centsForUsage, approxTokens, budgetKey } from '@/lib/ai-budget';

interface LookResponse extends SuggestedLook {
  /** Whether the result came from Claude or the deterministic fallback. */
  source: 'claude' | 'heuristic';
}

/* Shared system prompt — wrapped in cached() so re-runs within
   5 minutes (a host iterating on their sentence) hit prompt cache
   and return cheaper + faster. */
const SYSTEM_PROMPT = `You are Pear, an editorial designer for Pearloom — a craft house for memory.

A host has described their celebration in one or two sentences. Pick a coherent visual "look" for their site. Return JSON only — no prose, no markdown fences.

Pearloom's axes:

OCCASION (the event type): wedding, anniversary, engagement, birthday, story, bachelor-party, bachelorette-party, bridal-shower, bridal-luncheon, rehearsal-dinner, welcome-party, brunch, vow-renewal, baby-shower, gender-reveal, sip-and-see, housewarming, first-birthday, sweet-sixteen, milestone-birthday, retirement, graduation, bar-mitzvah, bat-mitzvah, quinceanera, baptism, first-communion, confirmation, memorial, funeral, reunion

EDITION (the layout persona):
- almanac: bound book. Bookish chapters + classic centered layouts. Default for weddings, anniversaries, vow-renewals, garden / wildflower events.
- cinema: letterboxed film magazine. Photo-first dark mood. Best for evening/black-tie/glamour/milestone birthdays.
- postcard-box: tilted polaroid cards on cream gauze. Best for bachelor/ette, bridal/baby showers, reunions, coastal/seaside events.
- linen-folder: hotel stationery formal. Best for rehearsal dinners, bar/bat mitzvah, quinceañera, baptism, retirement, Greek/Mediterranean/linen aesthetics.
- quiet: whitespace and restraint. Best for memorials, funerals, minimal / modern / city / urban / editorial aesthetics.

TEXTURE (the material): smooth, watercolor, linen, letterpress, vellum, newsprint

VOICE OVERRIDE (3 values): classic, playful, poetic
- classic = formal, warm, the default. Always pick this for somber events (memorial, funeral).
- playful = fun, in-on-the-joke. For bachelor/ette parties, casual events.
- poetic = lyrical, dreamy, romantic, tender.

DENSITY (vertical rhythm): cozy (tight, intimate), comfortable (default), spacious (airy, modern).

TEXTURE INTENSITY (0–1.5): 0.5 = subtle/understated, 1.0 = natural, 1.4 = rich/bold.

Return ONLY a JSON object with exactly these fields:
{
  "occasion": "...",
  "edition": "...",
  "texture": "...",
  "voiceOverride": "...",
  "density": "...",
  "textureIntensity": 1.0,
  "rationale": "One sentence: why this combination matches the sentence. Be specific about which words drove which choice."
}`;

export async function POST(req: Request) {
  // Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  // Rate limit: 10 per 10 minutes per user+IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`look-from-story:${session.user.email}:${ip}`, {
    max: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    const retryInSec = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: `Too many requests. Try again in ${retryInSec}s.` },
      { status: 429 },
    );
  }

  // Parse body
  let body: { text?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }
  if (text.length > 1000) {
    return NextResponse.json({ error: 'Text too long (1000 char max)' }, { status: 400 });
  }

  /* Deterministic fallback — computed up-front so we have something
     to return on any Claude failure (no API key, network error,
     bad JSON, model schema drift). The client never sees a "the
     LLM is unavailable" error — it always gets a SuggestedLook. */
  const heuristic: SuggestedLook = generateLookFromStory(text);
  const heuristicResponse: LookResponse = { ...heuristic, source: 'heuristic' };

  // No API key → return heuristic immediately, no error.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(heuristicResponse);
  }

  // Daily AI dollar cap (src/lib/ai-budget.ts). Keyed by account
  // email. Fails open — only blocks on a confirmed over-budget read.
  const budget = budgetKey(session.user.email, ip);
  if (await overBudget(budget)) {
    return NextResponse.json(
      { ok: false, error: "You've reached today's AI limit — try again tomorrow." },
      { status: 429 },
    );
  }

  try {
    /* Use forced tool_use (generateJson) so Claude can't return
       prose-wrapped JSON. The schema below mirrors SuggestedLook
       so any field drift fails fast at the tool-call layer and
       we drop to heuristic, never silently render a malformed
       SuggestedLook in the UI. */
    const { generateJson } = await import('@/lib/claude/structured');
    const parsed = await generateJson<SuggestedLook>({
      tier: 'haiku',
      system: [cached(SYSTEM_PROMPT, '5m')],
      messages: [{ role: 'user', content: text }],
      maxTokens: 400,
      temperature: 0.6,
      schemaName: 'emit_suggested_look',
      schemaDescription: 'Emit the inferred site look from a free-text story',
      schema: {
        type: 'object',
        required: ['occasion', 'edition', 'texture', 'voiceOverride', 'density', 'textureIntensity'],
        properties: {
          occasion: { type: 'string' },
          edition: { type: 'string' },
          texture: { type: 'string' },
          voiceOverride: { type: 'string' },
          density: { type: 'string' },
          textureIntensity: { type: 'number', minimum: 0, maximum: 1.5 },
          rationale: { type: 'string' },
        },
      },
    });

    // Charge the estimated cost once the model call succeeded.
    void chargeAi(
      budget,
      centsForUsage({
        provider: 'claude',
        model: CLAUDE_HAIKU,
        inputTokens: approxTokens(`${SYSTEM_PROMPT}${text}`),
        outputTokens: approxTokens(JSON.stringify(parsed)),
        ms: 0,
      })
    );

    /* Defensive validation — the schema gives us almost everything
       but we still want belt-and-braces on the field VALUES
       (string enums Claude could pick from but doesn't HAVE to
       constrain itself to). */
    if (
      !parsed.occasion ||
      !parsed.edition ||
      !parsed.texture ||
      !parsed.voiceOverride ||
      !parsed.density ||
      typeof parsed.textureIntensity !== 'number'
    ) {
      console.warn('[look/from-story] Claude returned malformed structured output; falling back');
      return NextResponse.json(heuristicResponse);
    }
    /* Clamp intensity to valid range. */
    const clampedIntensity = Math.max(0, Math.min(1.5, parsed.textureIntensity));
    return NextResponse.json({
      ...parsed,
      textureIntensity: clampedIntensity,
      rationale: parsed.rationale ?? heuristic.rationale,
      source: 'claude',
    } as LookResponse);
  } catch (err) {
    /* Network error, rate-limit on Anthropic's side, anything —
       silently fall back to heuristic. The host still gets a
       working result; we log for debugging. */
    console.warn('[look/from-story] Claude call failed; falling back:', err);
    return NextResponse.json(heuristicResponse);
  }
}
