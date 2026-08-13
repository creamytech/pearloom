// ─────────────────────────────────────────────────────────────
// POST /api/doorway/extract — "give us what you already have."
//
// The express entrance. A visitor pastes a link to the wedding
// site they already started (Zola / The Knot / Joy / Minted /
// Squarespace), or the text of a save-the-date, or their planner's
// note — and we press a real preview from it instead of asking
// nine questions first.
//
//   POST { url }   — fetch it (SSRF-guarded) and read it
//   POST { text }  — read what they pasted
//     → { ok, prefill, filled, empty, source }
//
// AUTH POSTURE — deliberately ANONYMOUS.
// The whole point is that a stranger sees their own names on a
// real preview BEFORE being asked to sign up (docs/REVIEW-SYNTHESIS
// §1.5: auth belongs at save/publish, never at the door). Guards
// that make that safe without a session:
//   • Rate limited per IP.
//   • The fetch goes through lib/safe-fetch — scheme allowlist,
//     private-host + resolved-private-IP rejection, re-vetted
//     redirects, byte cap, deadline. This is the one SSRF surface
//     that matters here and it is not re-implemented locally.
//   • The AI pass is OPTIONAL, budget-capped, and skipped entirely
//     when the deterministic parse already answered. Most calls
//     spend nothing.
//   • Nothing is written. No row, no draft, no site.
//
// HONESTY: everything returned is editable prefill the host
// confirms in the wizard. A wrong guess costs a keystroke, never a
// surprise on a published site.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { safeFetchText } from '@/lib/safe-fetch';
import {
  extractDeterministic,
  mergeModelSuggestions,
  htmlToText,
  htmlTitle,
  type DoorwayPrefill,
  type ExtractionResult,
} from '@/lib/doorway/extract';
import { overBudget, chargeAi, centsForUsage, approxTokens, budgetKey } from '@/lib/ai-budget';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const MAX_TEXT = 40_000;
const CANT_READ = 'Couldn’t read that. You can enter the details yourself instead.';

/** Fields worth an AI pass. Anything else the wizard asks for. */
const MODEL_SCHEMA = {
  type: 'object' as const,
  properties: {
    names: {
      type: 'array',
      items: { type: 'string' },
      description: 'The two hosts/honorees, if clearly present. Omit when unsure.',
    },
    eventDate: {
      type: 'string',
      description: 'ISO yyyy-mm-dd. Omit unless the date is unambiguous.',
    },
    venueName: { type: 'string', description: 'The venue name, if named.' },
    location: { type: 'string', description: 'City and state/country, if named.' },
  },
  required: [] as string[],
};

/** Ask a model ONLY for the blanks. Returns null on any failure —
 *  the doorway must never fail because the model did. */
async function modelFill(
  text: string,
  missing: string[],
  budget: string,
): Promise<Partial<DoorwayPrefill> | null> {
  if (missing.length === 0) return null;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (await overBudget(budget)) return null;

  try {
    const { generateJson } = await import('@/lib/claude/structured');
    const prompt = [
      'Read this event page or note and extract ONLY the fields listed.',
      'If a field is not clearly stated, OMIT it — a wrong guess is worse',
      'than a blank. Never infer a date from an ambiguous numeric format.',
      '',
      `Fields still needed: ${missing.join(', ')}`,
      '',
      '--- CONTENT ---',
      text.slice(0, 12_000),
    ].join('\n');

    const out = await generateJson<Partial<DoorwayPrefill>>({
      tier: 'haiku',
      system: 'You extract event facts. You omit anything uncertain.',
      messages: [{ role: 'user', content: prompt }],
      schema: MODEL_SCHEMA,
      schemaName: 'emit_event_facts',
      maxTokens: 400,
    });

    void chargeAi(
      budget,
      centsForUsage({
        provider: 'claude',
        model: 'claude-haiku-4-5-20251001',
        route: '/api/doorway/extract',
        inputTokens: approxTokens(prompt),
        outputTokens: 200,
        ms: 0,
      }),
    );
    return out ?? null;
  } catch {
    return null; // the deterministic pass still stands
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Anonymous but bounded. The URL branch is the expensive one
  // (outbound fetch), so it gets the tighter budget.
  if (!checkRateLimit(`doorway:${ip}`, { max: 20, windowMs: 10 * 60_000 }).allowed) {
    return NextResponse.json({ ok: false, error: 'Too many tries. Give it a minute.' }, { status: 429 });
  }

  let body: { url?: string; text?: string };
  try {
    body = (await req.json()) as { url?: string; text?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const rawUrl = (body.url ?? '').trim();
  const rawText = (body.text ?? '').trim();
  if (!rawUrl && !rawText) {
    return NextResponse.json({ ok: false, error: 'Paste a link or some details.' }, { status: 400 });
  }
  if (rawUrl.length > 2000) {
    return NextResponse.json({ ok: false, error: CANT_READ }, { status: 400 });
  }

  let text = rawText.slice(0, MAX_TEXT);
  let title: string | undefined;
  let source: 'url' | 'text' = 'text';

  if (rawUrl) {
    source = 'url';
    const html = await safeFetchText(rawUrl);
    if (!html) {
      return NextResponse.json({ ok: false, error: CANT_READ }, { status: 422 });
    }
    title = htmlTitle(html);
    text = htmlToText(html).slice(0, MAX_TEXT);
  }

  // Pass 1 — free, instant, and enough on its own for a well-formed
  // page. `nowYear` is injected so the parser stays pure.
  let result: ExtractionResult = extractDeterministic({
    text,
    title,
    nowYear: new Date().getUTCFullYear(),
  });

  // Pass 2 — only the blanks, only if there's something to read.
  const wanted: (keyof DoorwayPrefill)[] = ['names', 'eventDate', 'venueName', 'location'];
  const missing = wanted.filter((k) => result.prefill[k] == null);
  if (missing.length > 0 && text.length > 40) {
    const suggestion = await modelFill(text, missing, budgetKey(null, ip));
    result = mergeModelSuggestions(result, suggestion);
  }

  return NextResponse.json({
    ok: true,
    source,
    prefill: result.prefill,
    filled: result.filled,
    empty: result.empty,
  });
}
