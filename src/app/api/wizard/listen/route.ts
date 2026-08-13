// ─────────────────────────────────────────────────────────────
// POST /api/wizard/listen — Pear listens to the host's story.
//
// The wizard's "tell me about it" step sends the host's own
// telling of their event (typed or transcribed). One structured
// pass extracts the facts a form would have asked for — names,
// date-ish, place — plus the gold a form never catches: ANCHORS,
// the named personal specifics (the dog, the bar in Lisbon,
// grandma's lemon cake) that make the generated site read like
// someone who was there wrote it.
//
// body: { story: string, occasion?: string }
// 200:  { ok: true, names: string[], eventDate?: string,
//         location?: string, vibeWords: string[],
//         anchors: string[], occasionGuess?: string }
// Keyless / model-down: { ok: false } — the wizard falls back to
// its manual fields; listening is an upgrade, never a gate.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { overBudget, chargeAi, centsForUsage, approxTokens, budgetKey } from '@/lib/ai-budget';

export const dynamic = 'force-dynamic';

const SCHEMA = {
  type: 'object' as const,
  properties: {
    names: {
      type: 'array',
      items: { type: 'string' },
      description: 'First names of the honoree(s)/couple, max 2, in the order told. Empty if not stated.',
    },
    eventDate: {
      type: 'string',
      description: 'The event date as told, normalized to YYYY-MM-DD when a full date is given; otherwise the raw phrase ("next June", "Oct 2027"). Empty if not stated.',
    },
    location: {
      type: 'string',
      description: 'City / region / venue phrase as told ("Casa Chorro, San Miguel"). Empty if not stated.',
    },
    vibeWords: {
      type: 'array',
      items: { type: 'string' },
      description: '2-4 lowercase mood words the telling implies (e.g. "candlelit", "backyard", "black-tie"). Derived from HOW they talk, not just what they say.',
    },
    anchors: {
      type: 'array',
      items: { type: 'string' },
      description: 'The gold: 3-8 short, named, personal specifics worth weaving into the site copy verbatim — pets by name, the place they met, a tradition, a person being honored, an inside joke. Each one sentence, in the host\'s framing. NEVER generic ("they love each other" is not an anchor; "they close every dance floor to Mr. Brightside" is).',
    },
    occasionGuess: {
      type: 'string',
      description: 'Best-guess occasion id if the story implies one (wedding, anniversary, memorial, baby-shower, reunion, birthday…). Empty if unclear.',
    },
  },
  required: ['names', 'vibeWords', 'anchors'],
};

interface Listened {
  names?: string[];
  eventDate?: string;
  location?: string;
  vibeWords?: string[];
  anchors?: string[];
  occasionGuess?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ip = getClientIp(req);
  const rate = checkRateLimit(`wizard-listen:${session.user.email}:${ip}`, { max: 12, windowMs: 5 * 60 * 1000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Pear needs a breath — try again in a moment.' }, { status: 429 });
  }

  let body: { story?: unknown; occasion?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const story = String(body.story ?? '').trim().slice(0, 4000);
  const occasion = String(body.occasion ?? '').trim().slice(0, 40);
  if (story.length < 12) {
    return NextResponse.json({ error: 'Tell Pear a little more first.' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // Listening is an upgrade, never a gate.
    return NextResponse.json({ ok: false });
  }

  // Daily AI dollar cap (src/lib/ai-budget.ts). Keyed by account
  // email. Fails open — only blocks on a confirmed over-budget read.
  const budget = budgetKey(session.user.email, ip);
  if (await overBudget(budget)) {
    return NextResponse.json(
      { error: "You've reached today's AI limit — try again tomorrow." },
      { status: 429 }
    );
  }

  try {
    const { generateJson } = await import('@/lib/claude/structured');
    const { cached, CLAUDE_SONNET } = await import('@/lib/claude/client');
    const result = await generateJson<Listened>({
      tier: 'sonnet',
      maxTokens: 1000,
      temperature: 0.2,
      system: [
        cached(
          'You are Pear, Pearloom\'s in-house planner, listening to a host describe the event they\'re planning. Extract ONLY what they actually said or clearly implied — never invent. Anchors are the named personal specifics that would make a website copy feel unmistakably theirs; quality over quantity.',
          '1h',
        ),
      ],
      messages: [
        {
          role: 'user',
          content: [
            occasion ? `The host already picked the occasion: ${occasion}.` : '',
            'Their story, in their own words:',
            '',
            story,
          ].filter(Boolean).join('\n'),
        },
      ],
      schema: SCHEMA,
      schemaName: 'emit_listened',
      schemaDescription: 'The facts and anchors heard in the host\'s story.',
    });
    // Charge the estimated cost once the model call succeeded.
    void chargeAi(
      budget,
      centsForUsage({
        provider: 'claude',
        model: CLAUDE_SONNET,
        inputTokens: approxTokens(story),
        outputTokens: approxTokens(JSON.stringify(result)),
        ms: 0,
      })
    );
    return NextResponse.json({
      ok: true,
      names: (result.names ?? []).map((n) => String(n).trim()).filter(Boolean).slice(0, 2),
      eventDate: String(result.eventDate ?? '').trim() || undefined,
      location: String(result.location ?? '').trim() || undefined,
      vibeWords: (result.vibeWords ?? []).map((v) => String(v).trim().toLowerCase()).filter(Boolean).slice(0, 4),
      anchors: (result.anchors ?? []).map((a) => String(a).trim()).filter(Boolean).slice(0, 8),
      occasionGuess: String(result.occasionGuess ?? '').trim() || undefined,
    });
  } catch (err) {
    console.warn('[wizard-listen] extraction failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false });
  }
}
