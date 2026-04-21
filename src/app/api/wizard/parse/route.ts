// ─────────────────────────────────────────────────────────────
// Pearloom / api/wizard/parse/route.ts
//
// Natural-language entry point for the WizardV2 voice-first flow.
// Takes a freeform description like
//
//   "October 28 wedding in Cape Cod for Alex & Jordan, beachy
//   sage and linen vibe, about 80 guests"
//
// and uses Gemini to pull out occasion + names + date + venue
// + vibe in one shot, so power users can skip the step-by-step
// form and jump straight to photos.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const GEMINI_LITE =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

const PROMPT = `You are parsing a user's freeform description of their
celebration so a site-builder wizard can pre-fill its fields.

Read the description and extract the following JSON — include only
the fields you're confident about, otherwise leave them as null.
Never hallucinate values the user didn't imply.

Return ONLY this JSON, no markdown:
{
  "occasion": "wedding" | "anniversary" | "engagement" | "birthday" | "story" | null,
  "name1": "first person's name" | null,
  "name2": "second person's name — wedding/engagement/anniversary only" | null,
  "date": "YYYY-MM-DD" | null,
  "venue": "venue name and optionally location" | null,
  "vibe": "3-8 word vibe description capturing tone + colors" | null
}

Rules:
- date: If the user said "October 28 2026", return "2026-10-28". If
  they said just "October 28", return null — we don't guess the year.
- venue: Include the venue name and city/location if both are given
  ("The Palace Hotel, Cape Cod"). Don't invent one.
- name1/name2: Extract first names only. If the description mentions
  only one person or is a birthday, set name2 to null.
- vibe: A short evocative phrase that captures the emotional tone
  and any colors, materials, or motifs the user mentioned.

User description:`;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = (await req.json()) as { text?: string };
    if (!text || typeof text !== 'string' || text.trim().length < 3) {
      return NextResponse.json(
        { error: 'Please describe your celebration in a few words.' },
        { status: 400 },
      );
    }
    if (text.length > 2000) {
      return NextResponse.json(
        { error: 'Description too long (max 2000 characters).' },
        { status: 400 },
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_KEY ||
      process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Parsing is not configured on this server.' },
        { status: 500 },
      );
    }

    const res = await fetch(`${GEMINI_LITE}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${PROMPT}\n\n${text}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[wizard/parse] Gemini error', res.status, errText);
      return NextResponse.json(
        { error: 'Pear couldn\u2019t read that — try rephrasing?' },
        { status: 502 },
      );
    }

    const data = await res.json();
    const raw: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    let parsed: {
      occasion?: string | null;
      name1?: string | null;
      name2?: string | null;
      date?: string | null;
      venue?: string | null;
      vibe?: string | null;
    };
    try {
      const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[wizard/parse] Failed to parse Gemini JSON:', raw.slice(0, 200));
      return NextResponse.json(
        { error: 'Pear couldn\u2019t read that — try rephrasing?' },
        { status: 502 },
      );
    }

    // Whitelist allowed occasion values
    const VALID_OCCASIONS = new Set([
      'wedding',
      'anniversary',
      'engagement',
      'birthday',
      'story',
    ]);
    const occasion =
      parsed.occasion && VALID_OCCASIONS.has(parsed.occasion)
        ? parsed.occasion
        : null;

    // Basic sanity checks
    const date = parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
      ? parsed.date
      : null;

    const safeStr = (v: string | null | undefined, max = 160) => {
      if (!v || typeof v !== 'string') return null;
      const trimmed = v.trim();
      if (!trimmed) return null;
      return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
    };

    return NextResponse.json({
      occasion,
      name1: safeStr(parsed.name1, 60),
      name2: safeStr(parsed.name2, 60),
      date,
      venue: safeStr(parsed.venue, 160),
      vibe: safeStr(parsed.vibe, 160),
    });
  } catch (err) {
    console.error('[wizard/parse] Exception:', err);
    return NextResponse.json(
      { error: 'Pear couldn\u2019t read that — try rephrasing?' },
      { status: 500 },
    );
  }
}
