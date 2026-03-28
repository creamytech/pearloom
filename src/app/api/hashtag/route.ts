// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/hashtag/route.ts
// AI-powered wedding hashtag generator using Gemini.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  let body: {
    names: [string, string];
    vibeString: string;
    location?: string;
    date?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { names, vibeString, location, date } = body;

  if (!Array.isArray(names) || names.length < 2 || !names[0] || !names[1]) {
    return NextResponse.json({ error: 'names (array of two strings) is required' }, { status: 400 });
  }

  if (!vibeString?.trim()) {
    return NextResponse.json({ error: 'vibeString is required' }, { status: 400 });
  }

  const [name1, name2] = [String(names[0]).trim(), String(names[1]).trim()];

  const prompt = `Generate 10 unique, creative wedding hashtags for ${name1} and ${name2}.
Wedding vibe: "${vibeString}"
${location ? `Location: ${location}` : ''}
${date ? `Date: ${date}` : ''}

Rules:
- Combine their names creatively (portmanteau, alliteration, rhyme)
- Make some punny, some romantic, some playful
- Keep them under 30 characters
- No spaces (CamelCase or concatenated)
- Mix styles: #ForeverNameName, #NameAndNameWedding, #NameNameForever, etc.
- Return ONLY valid hashtags starting with #, one per line, no other text`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 400,
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[api/hashtag] Gemini error:', res.status, errBody);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const data = await res.json();
    const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse out valid hashtags (#Word...) — one per line
    const hashtags = raw
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.startsWith('#'))
      .map((line: string) => {
        // Take only the hashtag token (no trailing punctuation / spaces)
        const match = line.match(/^(#[A-Za-z0-9]+)/);
        return match ? match[1] : null;
      })
      .filter((h): h is string => Boolean(h))
      .slice(0, 10);

    // Fallback: generate deterministic suggestions if Gemini returned nothing parseable
    if (hashtags.length === 0) {
      const n1 = name1.replace(/\s+/g, '');
      const n2 = name2.replace(/\s+/g, '');
      const fallback = [
        `#Forever${n1}And${n2}`,
        `#${n1}And${n2}Wedding`,
        `#${n1}${n2}Forever`,
        `#${n1}Weds${n2}`,
        `#${n2}And${n1}Tie`,
        `#${n1}${n2}2025`,
        `#Happily${n1}And${n2}`,
        `#${n1}${n2}HappilyEverAfter`,
        `#The${n1}${n2}Wedding`,
        `#${n1}${n2}InLove`,
      ];
      return NextResponse.json({ hashtags: fallback });
    }

    return NextResponse.json({ hashtags });
  } catch (err) {
    console.error('[api/hashtag] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
