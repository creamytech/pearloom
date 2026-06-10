// ─────────────────────────────────────────────────────────────
// POST /api/decor/generate-from-text
//
// Decor-Library Generate-from-text Claude wrapper. Takes a free-
// text sentence describing the event and returns a structured
// DecorPreset ({ motifId, dividerId, patternId, accentColor,
// rationale }).
//
// Adapts the prototype's GenerateCard (themes.jsx §1129) which
// called `window.claude.complete(prompt)` directly in the browser.
// Production runs the model server-side via the Claude SDK so the
// API key never leaves the host, the call is rate-limited, and the
// response is forced into a structured tool_use shape (no prose
// drift, no markdown fences).
//
// The deterministic `generateDecorFromText()` in
// src/lib/decor/generate-from-text.ts is the fallback — the route
// catches all errors, rate-limit hits, and missing API keys and
// returns the heuristic result with `source: 'heuristic'` so the
// client can decide whether to surface the LLM rationale or the
// keyword-match rationale.
//
// Distinct from /api/look/from-story (whole-site Edition + texture
// + voice picker) and from /api/decor/library (image generation
// via OpenAI Image 2). This route does TEXT classification only —
// no images, no R2 uploads, no model spend beyond Haiku tokens.
//
// Auth: session-required (calling Claude burns tokens — guests
//       shouldn't get to fan this out).
// Rate: 5 / 10min per user+IP. Same vocabulary as the prototype's
//       implicit "Pear is designing…" cooldown.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { cached } from '@/lib/claude/client';
import {
  generateDecorFromText,
  type DecorPreset,
  type DecorPatternId,
  type DecorMotifId,
  type DecorDividerId,
} from '@/lib/decor/generate-from-text';

interface DecorResponse extends DecorPreset {
  /** Whether the result came from Claude or the deterministic fallback. */
  source: 'claude' | 'heuristic';
}

/** Pin the enums so Claude can't return free-form strings. */
const PATTERN_IDS: DecorPatternId[] = [
  'none', 'gingham', 'stripe', 'cabana', 'diagonal', 'dots', 'grid',
  'deco', 'scallop', 'wave', 'confetti', 'terrazzo', 'celestial',
];
const MOTIF_IDS: DecorMotifId[] = [
  'blob', 'stamp', 'squiggle', 'sparkle', 'heart', 'postIt', 'polaroid',
];
const DIVIDER_IDS: DecorDividerId[] = ['subtle', 'standard', 'tall'];

/* Shared system prompt — wrapped in cached() so re-runs within
   5 minutes (a host iterating on their sentence) hit prompt cache
   and return cheaper + faster. */
const SYSTEM_PROMPT = `You are Pear, an editorial decor director for Pearloom — a craft house for memory.

A host has described their celebration in one or two sentences. Pick a coherent **decor preset** for their site (pattern + motif + divider + accent color). Return JSON only — no prose, no markdown fences.

Pearloom's decor axes:

PATTERN (the decorative print sitting BEHIND every section — tinted by the accent color):
- none — clean, no print. Memorials, minimalist sites.
- gingham — repeating crosshatch. Picnics, farmhouse, garden parties, rustic.
- stripe — vertical awning bands. Linen-folder formality, Mediterranean.
- cabana — wide stripes. Beach, seaside, coastal.
- diagonal — 45° bands. Modern, editorial, energetic.
- dots — playful polka. Baby showers, kids' birthdays, whimsical.
- grid — hairline graph paper. Minimal, architectural, urban.
- deco — accent + gold diagonals. Gatsby, glamorous, evening, 20s.
- scallop — half-arcs. Hairline elegance, vintage.
- wave — half-arcs at bottom. Maritime, sailing, ocean.
- confetti — three-color scatter. Birthdays, parties, celebration.
- terrazzo — four-tone speckle. Tuscany, tile, mosaic, Mediterranean.
- celestial — gold + white stars. Evenings, midnight, starry, magical.

MOTIF (the hand-drawn ornament repeated as page decoration):
- blob — soft watercolor shapes. Organic, painterly, modern.
- stamp — postcard/passport seal. Travel, destination weddings, crests.
- squiggle — wiggly line. Playful, lively, kids' events.
- sparkle — small starbursts. Magical, evening, celestial.
- heart — small heart shapes. Romantic, tender, love.
- postIt — handwritten notes. Casual, kitchen-table, intimate.
- polaroid — instant-photo frames. Scrapbook, snapshots, photo-first.

DIVIDER (the band between sections):
- subtle — barely-there hairline. Memorials, minimal, quiet.
- standard — default editorial weight. Most events.
- tall — full editorial divider. Cinematic, magazine, grand.

ACCENT COLOR (the brand color the pattern tints from). Return a 6-digit hex (with #). Suggested ranges:
- olive/sage greens (#5C6B3F, #6B7A4A): gardens, vineyards, Tuscan, forest.
- terracotta/peach (#C6703D): desert, sunset, warm, amber.
- plum/merlot (#7A2D2D): wine, autumn, burgundy.
- navy/midnight (#1E3A5F): evening, gala, black-tie.
- gold/champagne (#C19A4B): deco, glamour, sparkle.
- mauve/blush (#9C7B6E): dusty rose, soft romance.
- coastal blue (#4A6B8F): seaside, ocean, maritime.

Return ONLY a JSON object with exactly these fields:
{
  "patternId": one of [${PATTERN_IDS.map((s) => `"${s}"`).join(', ')}],
  "motifId": one of [${MOTIF_IDS.map((s) => `"${s}"`).join(', ')}],
  "dividerId": one of [${DIVIDER_IDS.map((s) => `"${s}"`).join(', ')}],
  "accentColor": "#RRGGBB",
  "rationale": "One sentence: which words from the description drove which choice."
}`;

/** Tight regex — Claude's output must be a 6-digit hex with a leading '#'. */
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function POST(req: Request) {
  // Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  // Rate limit: 5 per 10 minutes per user+IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`decor-from-text:${session.user.email}:${ip}`, {
    max: 5,
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
  let body: { text?: unknown; paletteHex?: unknown; occasion?: unknown };
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

  // Optional palette + occasion context — fed into the user message so
  // Claude can prefer accent colors already present in the host's palette.
  const paletteHex = Array.isArray(body.paletteHex)
    ? body.paletteHex.filter((h): h is string => typeof h === 'string' && HEX_RE.test(h)).slice(0, 8)
    : undefined;
  const occasion = typeof body.occasion === 'string' ? body.occasion.trim().slice(0, 80) : undefined;

  /* Deterministic fallback — computed up-front so we have something
     to return on any Claude failure (no API key, network error,
     bad JSON, model schema drift). The client never sees a "the
     LLM is unavailable" error — it always gets a DecorPreset. */
  const heuristic: DecorPreset = generateDecorFromText(text);
  const heuristicResponse: DecorResponse = { ...heuristic, source: 'heuristic' };

  // No API key → return heuristic immediately, no error.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(heuristicResponse);
  }

  try {
    /* Use forced tool_use (generateJson) so Claude can't return
       prose-wrapped JSON. */
    const { generateJson } = await import('@/lib/claude/structured');

    const userMessage = [
      text,
      occasion ? `\n(Occasion context: ${occasion})` : '',
      paletteHex && paletteHex.length
        ? `\n(Existing palette to coordinate with: ${paletteHex.join(', ')} — prefer accents that harmonize with these.)`
        : '',
    ].join('');

    const parsed = await generateJson<DecorPreset>({
      tier: 'haiku',
      system: [cached(SYSTEM_PROMPT, '5m')],
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 400,
      temperature: 0.6,
      schemaName: 'emit_decor_preset',
      schemaDescription: 'Emit the inferred decor preset from a free-text story',
      schema: {
        type: 'object',
        required: ['patternId', 'motifId', 'dividerId', 'accentColor'],
        properties: {
          patternId: { type: 'string', enum: PATTERN_IDS },
          motifId: { type: 'string', enum: MOTIF_IDS },
          dividerId: { type: 'string', enum: DIVIDER_IDS },
          accentColor: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
          rationale: { type: 'string' },
        },
      },
    });

    /* Defensive validation — schema enums constrain the strings, but
       Claude could still drop a field or return an off-format hex.
       Fall back to heuristic on any drift. */
    if (
      !parsed.patternId ||
      !parsed.motifId ||
      !parsed.dividerId ||
      !parsed.accentColor ||
      !HEX_RE.test(parsed.accentColor) ||
      !PATTERN_IDS.includes(parsed.patternId) ||
      !MOTIF_IDS.includes(parsed.motifId) ||
      !DIVIDER_IDS.includes(parsed.dividerId)
    ) {
      console.warn('[decor/generate-from-text] Claude returned malformed structured output; falling back');
      return NextResponse.json(heuristicResponse);
    }
    return NextResponse.json({
      ...parsed,
      rationale: parsed.rationale ?? heuristic.rationale,
      source: 'claude',
    } as DecorResponse);
  } catch (err) {
    /* Network error, rate-limit on Anthropic's side, anything —
       silently fall back to heuristic. The host still gets a
       working result; we log for debugging. */
    console.warn('[decor/generate-from-text] Claude call failed; falling back:', err);
    return NextResponse.json(heuristicResponse);
  }
}
