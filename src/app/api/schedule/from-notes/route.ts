// ─────────────────────────────────────────────────────────────
// Pearloom / api/schedule/from-notes/route.ts
// POST — parse free-text host notes into a list of timeline events.
// Body: { notes: string }
// Returns: { events: Array<{ name, time, venue }> }
// Uses Claude Haiku + forced tool_use for reliable structured output.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { generateJson } from '@/lib/claude/structured';
import { CLAUDE_HAIKU } from '@/lib/claude/client';
import { overBudget, chargeAi, centsForUsage, approxTokens, budgetKey } from '@/lib/ai-budget';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const allowed = await checkRateLimit(`schedule-notes:${session.user.email}`, { max: 30, windowMs: 3600_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many drafts in the last hour. Try again in a bit.' }, { status: 429 });
    }

    const body = await req.json() as { notes?: string };
    const notes = (body.notes ?? '').trim();
    if (!notes) return NextResponse.json({ error: 'notes required' }, { status: 400 });
    if (notes.length > 2000) {
      return NextResponse.json({ error: 'Notes too long. Keep it under 2000 characters.' }, { status: 400 });
    }

    // Daily AI dollar cap (src/lib/ai-budget.ts). Keyed by account
    // email. Fails open — only blocks on a confirmed over-budget read.
    const budget = budgetKey(session.user.email, '');
    if (await overBudget(budget)) {
      return NextResponse.json(
        { error: "You've reached today's AI limit. Try again tomorrow." },
        { status: 429 }
      );
    }

    const result = await generateJson<{ events: Array<{ name: string; time: string; venue?: string }> }>({
      tier: 'haiku',
      schemaName: 'extract_schedule',
      schemaDescription: 'Extract chronologically-ordered timeline events from informal host notes.',
      schema: {
        type: 'object',
        required: ['events'],
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'time'],
              properties: {
                name: { type: 'string', description: 'Short event name, 1-3 words, e.g. "Ceremony", "Dinner", "Dancing".' },
                time: { type: 'string', description: 'Time-of-day in 12h format, e.g. "4:30 pm". Empty string if unknown.' },
                venue: { type: 'string', description: 'Short venue/location label if mentioned, e.g. "Olive grove". Optional.' },
              },
            },
          },
        },
      },
      system: 'You convert informal event-planning notes into a chronologically-ordered timeline. Keep event names short (1-3 words) — guests scan them. Use 12h time format ("4:30 pm"). Skip generic filler like "guests arrive" — pick the actual moments. Return at most 8 events.',
      messages: [
        { role: 'user', content: `Parse these notes into a clean timeline:\n\n${notes}` },
      ],
    });

    // Charge the estimated cost once the model call succeeded.
    void chargeAi(
      budget,
      centsForUsage({
        provider: 'claude',
        model: CLAUDE_HAIKU,
        inputTokens: approxTokens(notes),
        outputTokens: approxTokens(JSON.stringify(result)),
        ms: 0,
      })
    );

    return NextResponse.json({
      events: (result.events ?? []).slice(0, 12).map((e) => ({
        name: (e.name ?? '').trim() || 'Moment',
        time: (e.time ?? '').trim(),
        venue: (e.venue ?? '').trim(),
      })),
    });
  } catch (err) {
    console.error('[schedule/from-notes] failed:', err);
    return NextResponse.json({ error: 'Couldn’t draft a schedule. Try again or add moments manually.' }, { status: 500 });
  }
}
