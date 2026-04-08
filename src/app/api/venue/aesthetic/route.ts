// ─────────────────────────────────────────────────────────────
// Pearloom / api/venue/aesthetic/route.ts
// Given a venue name + address, uses Gemini to infer its visual
// character — architecture style, dominant colors, natural
// surroundings, and mood words.
//
// Called client-side when the couple selects their venue during
// wizard setup. Result is injected into vibeString so the AI
// generation pipeline can echo the venue's visual DNA back
// through palette choices, chapter prose, and art direction.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { GEMINI_LITE, geminiRetryFetch } from '@/lib/memory-engine/gemini-client';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`venue-aesthetic:${ip}`, { max: 10, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini not configured' }, { status: 500 });
  }

  const { venueName, address } = await req.json() as {
    venueName?: string;
    address?: string;
  };

  if (!venueName) {
    return NextResponse.json({ error: 'venueName required' }, { status: 400 });
  }

  const locationCtx = address ? ` located at ${address}` : '';

  const prompt = `You are a visual design director specializing in wedding aesthetics.

A wedding is being held at "${venueName}"${locationCtx}.

Based on the venue name and location, infer its visual character. Consider:
- The geographical region and its natural colors (e.g. Tuscany = warm terracotta, cypress green; Pacific Northwest = mossy greens, misty grey; Napa = golden vineyards, oak brown)
- The architectural style (rustic barn, grand ballroom, modern loft, garden estate, Mediterranean villa, beach club, etc.)
- Natural surroundings (forest, ocean, vineyard, desert, mountain, lakeside, urban skyline)
- The likely mood and atmosphere (intimate, grand, romantic, casual, bohemian, black tie)
- Season-appropriate colors if venue has strong seasonal identity

Return ONLY valid JSON (no markdown):
{
  "style": "<3-5 word architectural/venue style label, e.g. 'rustic barn with string lights', 'oceanfront modern pavilion', 'Tuscan garden estate'>",
  "surroundings": "<brief description of natural setting and geography>",
  "dominantColors": ["<hex>", "<hex>", "<hex>"],
  "colorWords": "<3-6 evocative color/texture words, comma-separated, e.g. 'warm terracotta, aged stone, olive grove, golden hour'>",
  "moodWords": "<3-5 mood/atmosphere words, e.g. 'rustic, candlelit, intimate, earthy'>",
  "aestheticSummary": "<2-3 sentences. Describe the venue's visual aesthetic as if briefing a creative director. Be specific to geography and setting.>"
}`;

  try {
    const res = await geminiRetryFetch(
      `${GEMINI_LITE}?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    if (!res.ok) throw new Error(`Gemini ${res.status}`);

    const data = await res.json();
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}').trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
      .replace(/,\s*([}\]])/g, '$1');

    const result = JSON.parse(raw) as {
      style?: string;
      surroundings?: string;
      dominantColors?: string[];
      colorWords?: string;
      moodWords?: string;
      aestheticSummary?: string;
    };

    // Build the injection string that goes into vibeString
    const parts: string[] = [];
    if (result.style)           parts.push(`Style: ${result.style}`);
    if (result.surroundings)    parts.push(`Setting: ${result.surroundings}`);
    if (result.colorWords)      parts.push(`Visual palette: ${result.colorWords}`);
    if (result.moodWords)       parts.push(`Atmosphere: ${result.moodWords}`);
    if (result.aestheticSummary) parts.push(result.aestheticSummary);

    return NextResponse.json({
      style:           result.style || '',
      surroundings:    result.surroundings || '',
      dominantColors:  result.dominantColors || [],
      colorWords:      result.colorWords || '',
      moodWords:       result.moodWords || '',
      aestheticSummary: result.aestheticSummary || '',
      // Pre-formatted for direct injection into vibeString
      vibeInjection: parts.join('. '),
    });
  } catch (err) {
    console.error('[venue/aesthetic] Error:', err);
    // Non-fatal — site generation continues without venue aesthetic
    return NextResponse.json({ vibeInjection: '', style: '', surroundings: '', dominantColors: [], colorWords: '', moodWords: '', aestheticSummary: '' });
  }
}
