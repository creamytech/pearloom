// ─────────────────────────────────────────────────────────────
// Pearloom / api/story-draft/route.ts
//
// POST /api/story-draft
//   body: {
//     names?: [string, string];
//     occasion?: string;
//     venue?: string;
//     place?: string;
//     date?: string;
//     chips?: string[];          // host's highlight chips for hints
//     factSheet?: { howWeMet?, why?, favorite?, story?, anchors? }
//                                  // the wizard's fact sheet — the richest
//                                  // source; when present the draft is
//                                  // GROUNDED in it, never invented
//     photoCaptions?: string[];   // captions the host wrote on photos
//     existing?: string;          // current body — if set, the route REwrites
//                                  it instead of starting from scratch
//   }
//   returns: { draft: string }
//
// Drafts the "Your story" body from couple context. Used by the
// StoryPanel "Draft for me" button — wakes up an empty body
// (or rewrites a stub) into a warm 2-3 sentence story for the
// site's story section. The wizard rides howWeMet / why /
// favorite / the spoken story onto manifest.factSheet exactly so
// this pass can use the host's own words.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, checkPearGate } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 25;

interface Body {
  names?: [string, string];
  occasion?: string;
  venue?: string;
  place?: string;
  date?: string;
  chips?: string[];
  factSheet?: {
    howWeMet?: string;
    why?: string;
    favorite?: string;
    story?: string;
    anchors?: string[];
  };
  photoCaptions?: string[];
  existing?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const { blocked } = await checkPearGate(session.user.email);
  if (blocked) return blocked;

  const rate = checkRateLimit(`story-draft:${session.user.email}:${getClientIp(req)}`, {
    max: 10,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many drafts — wait a moment.' }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    /* Graceful degrade — return empty so the UI can fall through. */
    return NextResponse.json({ draft: '' });
  }

  const names = Array.isArray(body.names) ? body.names.filter(Boolean).join(' & ') : '';
  const chips = Array.isArray(body.chips) ? body.chips.filter(Boolean).slice(0, 6) : [];
  const fs = body.factSheet ?? {};
  const clamp = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : '');
  const facts: string[] = [];
  if (clamp(fs.howWeMet, 500)) facts.push(`How it started (host's words): ${clamp(fs.howWeMet, 500)}`);
  if (clamp(fs.why, 500)) facts.push(`Why this celebration (host's words): ${clamp(fs.why, 500)}`);
  if (clamp(fs.favorite, 500)) facts.push(`A favourite memory (host's words): ${clamp(fs.favorite, 500)}`);
  if (clamp(fs.story, 1200)) facts.push(`The host told the story aloud — transcript: ${clamp(fs.story, 1200)}`);
  if (Array.isArray(fs.anchors) && fs.anchors.length > 0) {
    facts.push(`Hard facts that must survive verbatim: ${fs.anchors.filter(Boolean).slice(0, 8).join(' · ')}`);
  }
  const captions = Array.isArray(body.photoCaptions)
    ? body.photoCaptions.filter((c) => typeof c === 'string' && c.trim()).slice(0, 8)
    : [];
  const hasFacts = facts.length > 0;

  const ctxLines: string[] = [];
  if (names) ctxLines.push(`Subject: ${names}`);
  if (body.occasion) ctxLines.push(`Occasion: ${body.occasion}`);
  if (body.venue || body.place) ctxLines.push(`Where: ${[body.venue, body.place].filter(Boolean).join(', ')}`);
  if (body.date) ctxLines.push(`When: ${body.date}`);
  if (facts.length > 0) ctxLines.push(...facts);
  if (captions.length > 0) ctxLines.push(`Photo captions the host wrote: ${captions.join(' · ')}`);
  if (chips.length > 0) ctxLines.push(`Hints from the host: ${chips.join(' · ')}`);
  if (body.existing && body.existing.trim()) ctxLines.push(`Existing draft (refine, don't restart):\n${body.existing.trim().slice(0, 600)}`);

  const isRefining = !!(body.existing && body.existing.trim().length >= 20);

  try {
    const { generate, textFrom } = await import('@/lib/claude/client');
    const msg = await generate({
      tier: 'haiku',
      system: [
        'You draft the "Our story" body for a celebration website.',
        '',
        'Rules:',
        '- 2 to 3 sentences, 35-90 words total.',
        '- Warm, specific, present-tense or simple past.',
        '- Anchor in one concrete detail (a place, a year, an object, a moment).',
        hasFacts
          ? '- The host gave you their own words (fact sheet / transcript / captions). Draft FROM those — every detail must trace back to something they said. Never invent facts when real ones exist.'
          : '- The host gave no facts — invent gentle, generic anchors that could be true of anyone.',
        '- Use the host\'s hints (chips) as the source of detail when present.',
        '- Never use clichés ("love at first sight", "two halves", "soulmates", "happily ever after", "tying the knot", "two souls").',
        '- Voice: editorial. Quiet, confident. Not breathless.',
        '- No greeting, no header, no quotes around the output — return ONLY the body text.',
        '- For non-wedding occasions (memorial / birthday / bachelor / etc), match the tone (somber / playful / etc).',
        isRefining
          ? '- Refine the host\'s existing draft. Preserve their voice + specific names/places. Tighten + warm — do not rewrite from scratch.'
          : '- Draft from scratch using whatever context is given. Invent gentle defaults for unknown fields.',
      ].join('\n'),
      messages: [
        {
          role: 'user',
          content: ctxLines.length > 0
            ? `Draft the story body using this context:\n\n${ctxLines.join('\n')}`
            : 'Draft a gentle, generic 2-sentence story body for a celebration website with no specifics.',
        },
      ],
      maxTokens: 320,
      temperature: 0.78,
    });
    const draft = textFrom(msg).trim().replace(/^["“]|["”]$/g, '');
    return NextResponse.json({ draft });
  } catch (err) {
    console.warn('[story-draft] claude error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ draft: '' });
  }
}
