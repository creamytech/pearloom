import { NextRequest, NextResponse } from 'next/server';
import { GEMINI_FLASH, geminiRetryFetch } from '@/lib/memory-engine/gemini-client';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// ─────────────────────────────────────────────────────────────
// POST /api/pear-caption
// Pear-drafts a short editorial caption (4–10 words) for a
// gallery photo. The host can accept, reject, or regenerate.
// Voice: observational, never "amazing", never "love this".
// ─────────────────────────────────────────────────────────────

interface CaptionRequest {
  photoUrl: string;
  /** Optional context — chapter title, alt text, mood — that
   *  Pear can lean on. The model never *needs* it; passing it
   *  makes the result land closer to the host's voice. */
  context?: {
    chapterTitle?: string;
    chapterMood?: string;
    altText?: string;
    occasion?: string;
  };
}

const SYSTEM = `You are Pear, a calm editorial copywriter.
Write ONE caption for a wedding/celebration photo.
Length: 4 to 10 words. No quotes. No emoji.
Voice: observational, specific. Avoid "love this", "amazing",
"perfect moment", "blessed", "the best day". Avoid hashtags.
If the context names a place or person, weave it in naturally.

Return JUST the caption text. No JSON, no quotes.`;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`pear-caption:${ip}`, { max: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Slow down a tick' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ caption: 'A quiet moment, kept.' });
  }

  let body: CaptionRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (!body.photoUrl || typeof body.photoUrl !== 'string') {
    return NextResponse.json({ error: 'photoUrl required' }, { status: 400 });
  }

  const ctx = body.context ?? {};
  const ctxLine = [
    ctx.occasion && `Occasion: ${ctx.occasion}`,
    ctx.chapterTitle && `Chapter: ${ctx.chapterTitle}`,
    ctx.chapterMood && `Mood: ${ctx.chapterMood}`,
    ctx.altText && `Existing alt: ${ctx.altText}`,
  ].filter(Boolean).join('\n') || '(no context provided)';

  try {
    const res = await geminiRetryFetch(`${GEMINI_FLASH}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{
          parts: [
            { text: `Photo URL: ${body.photoUrl}\n\nContext:\n${ctxLine}\n\nWrite the caption now.` },
          ],
        }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 60,
        },
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ caption: 'A quiet moment, kept.' });
    }
    const data = await res.json();
    const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    // Strip surrounding quotes/backticks the model sometimes adds.
    const cleaned = raw.replace(/^[`"'\s]+|[`"'\s]+$/g, '').slice(0, 120);
    return NextResponse.json({ caption: cleaned || 'A quiet moment, kept.' });
  } catch {
    return NextResponse.json({ caption: 'A quiet moment, kept.' });
  }
}
