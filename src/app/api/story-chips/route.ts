// ─────────────────────────────────────────────────────────────
// Pearloom / api/story-chips/route.ts
//
// POST /api/story-chips
//   body: {
//     body?: string;          // host-authored story body
//     names?: [string, string];
//     occasion?: string;
//     venue?: string;
//     place?: string;
//     date?: string;          // the event date
//     chapters?: Array<{
//       title?: string;
//       description?: string;
//       mood?: string;
//       location?: string;    // pre-formatted location name
//       date?: string;
//       imageCount?: number;
//     }>;
//   }
//   returns: { chips: string[] }
//
// Surfaces 6-8 short highlight chips (≤4 words each) the host can
// one-tap into their story section. Pulled from the story body
// + chapter titles + photo moods + couple context. Claude Haiku.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, checkPearGate } from '@/lib/rate-limit';
import { overBudget, chargeAi, centsForUsage, approxTokens, budgetKey } from '@/lib/ai-budget';

export const dynamic = 'force-dynamic';
export const maxDuration = 25;

interface ChapterCtx {
  title?: string;
  description?: string;
  mood?: string;
  location?: string;
  date?: string;
  imageCount?: number;
}

interface Body {
  body?: string;
  names?: [string, string];
  occasion?: string;
  venue?: string;
  place?: string;
  date?: string;
  chapters?: ChapterCtx[];
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  /* Plan-tier gate — same as inline-rewrite. Chip suggestions are
     a Claude call per click; without this gate a free user could
     mash the button. */
  const { blocked } = await checkPearGate(session.user.email);
  if (blocked) return blocked;

  /* Lighter rate limit than inline-rewrite (5/5min) since chip
     suggestions are an explicit click, not selection-driven. */
  const rate = checkRateLimit(`story-chips:${session.user.email}:${getClientIp(req)}`, {
    max: 12,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many chip requests. Wait a moment.' }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const storyBody = (body.body ?? '').trim().slice(0, 3000);
  const chapters = Array.isArray(body.chapters) ? body.chapters.slice(0, 8) : [];
  const names = Array.isArray(body.names) ? body.names.filter(Boolean).join(' & ') : '';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    /* Graceful degrade — return an empty array so the UI's
       fallback (derived chips, see StoryPanel) still shows. */
    return NextResponse.json({ chips: [] });
  }

  // Daily AI dollar cap (src/lib/ai-budget.ts). Keyed by account
  // email. Fails open — only blocks on a confirmed over-budget read.
  const budget = budgetKey(session.user.email, getClientIp(req));
  if (await overBudget(budget)) {
    return NextResponse.json(
      { error: "You've reached today's AI limit. Try again tomorrow." },
      { status: 429 }
    );
  }

  /* Build the Claude context. Skip empty fields so the prompt
     stays focused — empty strings + undefined just bloat tokens. */
  const ctxLines: string[] = [];
  if (names) ctxLines.push(`Subject: ${names}`);
  if (body.occasion) ctxLines.push(`Occasion: ${body.occasion}`);
  if (body.venue || body.place) ctxLines.push(`Location: ${[body.venue, body.place].filter(Boolean).join(', ')}`);
  if (body.date) ctxLines.push(`Date: ${body.date}`);
  if (storyBody) ctxLines.push(`Story:\n${storyBody}`);
  if (chapters.length > 0) {
    const lines = chapters.map((c, i) => {
      const parts: string[] = [];
      if (c.title) parts.push(`title="${c.title}"`);
      if (c.mood) parts.push(`mood="${c.mood}"`);
      if (c.location) parts.push(`place="${c.location}"`);
      if (c.date) parts.push(`when="${c.date}"`);
      if (typeof c.imageCount === 'number' && c.imageCount > 0) parts.push(`photos=${c.imageCount}`);
      if (c.description) parts.push(`description="${c.description.slice(0, 220)}"`);
      return `  ${i + 1}. ${parts.join(' · ')}`;
    });
    ctxLines.push(`Chapters / photos:\n${lines.join('\n')}`);
  }

  try {
    const { generate, textFrom, CLAUDE_HAIKU } = await import('@/lib/claude/client');
    const msg = await generate({
      tier: 'haiku',
      system: [
        'You suggest highlight "chips" for a celebration website\'s story section.',
        'A chip is a 1-4 word noun phrase the visitor can read at a glance:',
        '  "Together since 2017" · "Santorini, Greece" · "Golden hour"',
        '  "10 years strong" · "Found at a bookstore" · "Olive grove"',
        '',
        'Rules:',
        '- Return EXACTLY 8 chips, one per line, no numbering, no quotes, no trailing periods.',
        '- Each chip is at most 4 words.',
        '- Pull from the source material: dates, places, moods, named locations, sensory details.',
        '- Vary kinds: one date/year, one place, one sensory/aesthetic, one mood, one milestone, one quirky specific, one venue, one anniversary.',
        '- No clichés ("love is love", "happily ever after", "tying the knot").',
        '- No prose, no explanation, no headers — just 8 lines, one chip each.',
      ].join('\n'),
      messages: [
        {
          role: 'user',
          content: `Suggest 8 highlight chips for this story section.\n\n${ctxLines.join('\n\n') || 'No specifics provided — invent gentle defaults.'}`,
        },
      ],
      maxTokens: 220,
      temperature: 0.75,
    });
    const raw = textFrom(msg).trim();
    // Charge the real token cost from the returned Message's usage
    // (falls back to a length estimate if usage is absent).
    void chargeAi(
      budget,
      centsForUsage({
        provider: 'claude',
        model: CLAUDE_HAIKU,
        inputTokens: msg.usage?.input_tokens ?? approxTokens(ctxLines.join('\n')),
        outputTokens: msg.usage?.output_tokens ?? approxTokens(raw),
        cacheReadTokens: msg.usage?.cache_read_input_tokens ?? 0,
        cacheWriteTokens: msg.usage?.cache_creation_input_tokens ?? 0,
        ms: 0,
      })
    );
    /* Split on newlines, strip leading bullets / numerals / quotes,
       trim, dedupe (case-insensitive), and cap at 8. */
    const seen = new Set<string>();
    const chips: string[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const cleaned = line
        .replace(/^\s*[-*•]\s+/, '')
        .replace(/^\s*\d+[.)]\s+/, '')
        .replace(/^["“]|["”]$/g, '')
        .replace(/\.$/, '')
        .trim();
      if (!cleaned) continue;
      if (cleaned.length > 48) continue; // pathological too-long lines
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      chips.push(cleaned);
      if (chips.length >= 8) break;
    }
    return NextResponse.json({ chips });
  } catch (err) {
    console.warn('[story-chips] claude error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ chips: [] });
  }
}
