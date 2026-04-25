// ─────────────────────────────────────────────────────────────
// Pearloom / api/pear/speech/route.ts
//
// POST /api/pear/speech  body: { text, kind?: 'vows'|'toast'|'speech' }
//   → analyzes a draft toast/speech via Claude Haiku
//   → returns scoring (length, sentiment arc, specificity, banned
//     phrases) + 3-5 surgical suggestions
//
// Faster than ChatGPT for this specific task because the prompt is
// targeted and the response is a small JSON shape — no roundtrip
// through generic chat.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generate, parseJsonFromText } from '@/lib/claude/client';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { buildPearContext } from '@/lib/pear/context';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Kind = 'vows' | 'toast' | 'speech';

interface SpeechAnalysis {
  /** Estimated read-aloud time in seconds. */
  duration_seconds: number;
  /** 1-100 score for length appropriateness (target by kind). */
  length_score: number;
  /** 1-100 score for specificity — concrete details vs. cliches. */
  specificity_score: number;
  /** 1-100 score for sentiment arc (rises in middle, lands warm). */
  arc_score: number;
  /** Banned/cliche phrases found in the draft, with counts. */
  cliches: Array<{ phrase: string; count: number }>;
  /** 3-5 surgical suggestions, ordered most-impactful first. */
  suggestions: string[];
  /** One-paragraph summary the user can read in 5 seconds. */
  summary: string;
}

const TARGETS: Record<Kind, { secondsLow: number; secondsHigh: number }> = {
  vows: { secondsLow: 60, secondsHigh: 120 },
  toast: { secondsLow: 90, secondsHigh: 180 },
  speech: { secondsLow: 120, secondsHigh: 300 },
};

const BANNED_HINTS = [
  'love of my life', 'beautiful memories', 'new chapter', 'soul mate',
  'my better half', 'words can\'t describe', 'speechless', 'forever and always',
  'over the moon', 'truly truly', 'simply put', 'last but not least',
];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`speech-analyze:${session.user.email}:${ip}`, {
    max: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many speech analyses — try again later.' }, { status: 429 });
  }

  let body: { text?: string; kind?: Kind; siteId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const text = (body.text ?? '').trim();
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });
  if (text.length > 12_000) {
    return NextResponse.json({ error: 'Speech too long — paste up to 12,000 chars.' }, { status: 400 });
  }

  const kind: Kind = (['vows', 'toast', 'speech'] as Kind[]).includes(body.kind as Kind)
    ? (body.kind as Kind)
    : 'toast';
  const target = TARGETS[kind];

  // Pre-compute objective metrics in JS so the LLM doesn't have to
  // count words and we get reliable numbers.
  const words = text.split(/\s+/).filter(Boolean).length;
  const durationSeconds = Math.round((words / 130) * 60); // ~130 WPM read-aloud rate
  const cliches = BANNED_HINTS.map((phrase) => {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const m = text.match(re);
    return { phrase, count: m ? m.length : 0 };
  }).filter((c) => c.count > 0);

  // Pull host voice + memory so suggestions read in the host's
  // actual cadence and reference their concrete details.
  const ctx = await buildPearContext({
    userEmail: session.user.email,
    siteId: body.siteId,
    memoryLimit: 6,
    voiceLimit: 1,
  });

  const sys = [
    "You are Pearloom's speech editor. You read drafts of vows, toasts, or welcome speeches and return a compact JSON analysis. You are warm but blunt. Never sycophantic.",
    "Suggestions must be SURGICAL — point at a specific line and propose a specific change. No general advice like 'add more emotion'.",
    'Length scoring: target ranges per kind are passed as system context. Score 100 = perfectly in range; 50 = ~30s off; 0 = >2 min off.',
    'Specificity: prefer concrete details (proper nouns, places, exact moments) over abstractions ("love", "always", "forever").',
    'Arc: a strong toast rises through a middle (anecdote, twist) and lands soft + warm. Penalize draft if it stays at one emotional pitch throughout.',
    ctx.promptBlock,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const msg = await generate({
      tier: 'haiku',
      temperature: 0.4,
      maxTokens: 900,
      system: sys,
      messages: [
        {
          role: 'user',
          content:
            `Analyze this ${kind} draft. Target read-aloud time: ${target.secondsLow}-${target.secondsHigh}s. Estimated current read-aloud time: ${durationSeconds}s (computed). Word count: ${words}.\n\nDRAFT:\n"""${text}"""\n\nReturn ONLY this JSON shape, no preface, no markdown fences:\n{\n  "duration_seconds": number,\n  "length_score": number,\n  "specificity_score": number,\n  "arc_score": number,\n  "cliches": [{"phrase": string, "count": number}],\n  "suggestions": [string, string, string],\n  "summary": string\n}`,
        },
        { role: 'assistant', content: '{' },
      ],
    });
    const raw = '{' + ((msg.content[0] as { text?: string })?.text ?? '').trim();
    const parsed = parseJsonFromText<Partial<SpeechAnalysis>>(raw);

    // Override the model's duration/cliches with our objective values.
    const result: SpeechAnalysis = {
      duration_seconds: durationSeconds,
      length_score: clamp(parsed.length_score ?? 50, 0, 100),
      specificity_score: clamp(parsed.specificity_score ?? 50, 0, 100),
      arc_score: clamp(parsed.arc_score ?? 50, 0, 100),
      cliches,
      suggestions: (parsed.suggestions ?? []).slice(0, 5).filter((s): s is string => typeof s === 'string'),
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Pear analyzed your draft.',
    };

    return NextResponse.json({ analysis: result });
  } catch (err) {
    console.error('[pear/speech]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Speech analysis failed' },
      { status: 500 },
    );
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
