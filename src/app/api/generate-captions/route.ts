// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/generate-captions/route.ts
// Generates poetic 4-8 word captions for chapter photos via Gemini.
// ─────────────────────────────────────────────────────────────

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`generate-captions:${ip}`, { max: 10, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  let body: {
    photoUrls: string[];
    chapterTitle: string;
    chapterMood: string;
    chapterDescription: string;
    vibeString: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { photoUrls, chapterTitle, chapterMood, chapterDescription } = body;

  if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
    return Response.json({ error: 'photoUrls must be a non-empty array' }, { status: 400 });
  }

  const prompt = `Generate ultra-short poetic photo captions (4-8 words max) for wedding photos from this chapter: '${chapterTitle}' with mood '${chapterMood}'. Context: ${chapterDescription}. Return JSON array of strings, one per photo. Be romantic, specific, poetic. Examples: 'First dance, hearts intertwined', 'Golden hour found us here', 'The moment everything changed'. Only return the JSON array.\n\nGenerate exactly ${photoUrls.length} captions.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 512 },
      }),
    });

    if (!res.ok) throw new Error(`Gemini error ${res.status}`);
    const geminiData = await res.json();
    const text = (geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let captions: string[];
    try {
      captions = JSON.parse(cleaned);
    } catch {
      return Response.json({ error: 'Failed to parse Gemini response as JSON', raw: text }, { status: 500 });
    }

    if (!Array.isArray(captions)) {
      return Response.json({ error: 'Gemini returned unexpected format', raw: text }, { status: 500 });
    }

    // Ensure we have a caption for every photo
    const padded = photoUrls.map((_, i) => captions[i] ?? '');

    return Response.json({ captions: padded });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
