// ─────────────────────────────────────────────────────────────
// Pearloom / api/inline-rewrite/route.ts
//
// POST /api/inline-rewrite
//   body: { text: string, context?: string }
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
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 25;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const rate = checkRateLimit(`inline-rewrite:${session.user.email}:${getClientIp(req)}`, {
    max: 30,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many rewrites — wait a moment.' }, { status: 429 });
  }

  let body: { text?: unknown; context?: unknown };
  try {
    body = (await req.json()) as { text?: unknown; context?: unknown };
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Graceful degrade — return the original text so the UI still
    // closes the busy state without crashing.
    return NextResponse.json({ rewritten: text });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system:
          'You rewrite event-website microcopy with warmth and editorial precision. Preserve the original meaning. Keep length within ±20%. Do not add quote marks, headers, or explanation — return ONLY the rewritten text.',
        messages: [
          {
            role: 'user',
            content: `Rewrite this snippet to be tighter and warmer for a wedding/celebration site:\n\n${text}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.warn('[inline-rewrite] anthropic error:', res.status, err.slice(0, 200));
      return NextResponse.json({ rewritten: text });
    }
    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    const block = (data.content ?? []).find((b) => b.type === 'text');
    const out = (block?.text ?? '').trim();
    return NextResponse.json({ rewritten: out || text });
  } catch (err) {
    console.warn('[inline-rewrite] failed:', err);
    return NextResponse.json({ rewritten: text });
  }
}
