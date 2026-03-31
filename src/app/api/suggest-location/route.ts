// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/suggest-location/route.ts
// Uses Gemini to suggest a location for a photo cluster based
// on photo metadata (dates, filenames, camera info, context).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  try {
    const { photos } = await req.json() as {
      photos: Array<{
        filename: string;
        creationTime: string;
        cameraMake?: string;
        cameraModel?: string;
        description?: string;
      }>;
    };

    if (!photos?.length) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }

    // Build a concise metadata summary for the AI
    const photoSummary = photos.slice(0, 10).map(p => {
      const parts = [`File: ${p.filename}`, `Date: ${p.creationTime}`];
      if (p.cameraMake) parts.push(`Camera: ${p.cameraMake} ${p.cameraModel ?? ''}`);
      if (p.description) parts.push(`Description: ${p.description}`);
      return parts.join(', ');
    }).join('\n');

    const dateRange = (() => {
      const dates = photos.map(p => new Date(p.creationTime).getTime()).sort((a, b) => a - b);
      const start = new Date(dates[0]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const end = new Date(dates[dates.length - 1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      return start === end ? start : `${start} – ${end}`;
    })();

    const prompt = `You are analyzing a group of ${photos.length} photos taken during ${dateRange}.

Based on the photo metadata below, suggest the most likely location where these photos were taken. Consider:
- Filenames often contain location hints (e.g., "IMG_paris_2024.jpg", "beach_sunset.jpg")
- Photo descriptions if available
- Date patterns (holiday seasons, events)
- Camera type (phone cameras suggest casual travel, pro cameras suggest events)

Photo metadata:
${photoSummary}

Respond with ONLY a JSON object in this exact format:
{"location": "City, Country", "confidence": "high"|"medium"|"low", "reason": "brief explanation"}

If you truly cannot determine a location from the metadata, respond with:
{"location": "", "confidence": "low", "reason": "insufficient metadata"}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.error('[suggest-location] Gemini error:', res.status);
      return NextResponse.json({ location: '', confidence: 'low', reason: 'AI unavailable' });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({
        location: parsed.location || '',
        confidence: parsed.confidence || 'low',
        reason: parsed.reason || '',
      });
    } catch {
      return NextResponse.json({ location: '', confidence: 'low', reason: 'Failed to parse AI response' });
    }
  } catch (error) {
    console.error('[suggest-location] Error:', error);
    return NextResponse.json({ location: '', confidence: 'low', reason: 'Request failed' });
  }
}
