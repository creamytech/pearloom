// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/story-advisor/route.ts
// AI story arc advisor — analyzes photo clusters and suggests
// narrative improvements before site generation.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  const email = (session as { user?: { email?: string } }).user?.email || 'unknown';
  const rateCheck = checkRateLimit(`story-advisor:${email}`, { max: 10, windowMs: 60 * 60 * 1000 });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { clusters } = await req.json() as {
      clusters: Array<{
        startDate: string;
        endDate: string;
        location?: { label: string } | null;
        photos: Array<{ filename: string; creationTime: string }>;
        note?: string;
      }>;
    };

    if (!clusters?.length) {
      return NextResponse.json({ error: 'No clusters provided' }, { status: 400 });
    }

    // Build a concise summary for the AI
    const clusterSummary = clusters.map((c, i) => {
      const parts = [`Cluster ${i + 1}: ${c.photos.length} photos`];
      parts.push(`Dates: ${new Date(c.startDate).toLocaleDateString()} - ${new Date(c.endDate).toLocaleDateString()}`);
      if (c.location?.label) parts.push(`Location: ${c.location.label}`);
      if (c.note) parts.push(`Note: ${c.note}`);
      return parts.join(', ');
    }).join('\n');

    const totalPhotos = clusters.reduce((sum, c) => sum + c.photos.length, 0);
    const hasLocations = clusters.filter(c => c.location?.label).length;
    const dateSpan = (() => {
      const dates = clusters.flatMap(c => [new Date(c.startDate).getTime(), new Date(c.endDate).getTime()]);
      const days = Math.ceil((Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24));
      return days;
    })();

    const prompt = `You are a storytelling advisor for a wedding/love story website. Analyze these ${clusters.length} photo clusters (${totalPhotos} photos total, spanning ${dateSpan} days, ${hasLocations}/${clusters.length} with locations) and provide narrative advice.

${clusterSummary}

Respond with ONLY a JSON object:
{
  "arcQuality": "strong" | "good" | "needs-work",
  "arcSummary": "1-2 sentence assessment of the story arc",
  "strengths": ["1-2 things that are great about this photo collection"],
  "suggestions": ["1-3 specific, actionable suggestions to improve the story"],
  "optimalOrder": "chronological" | "narrative" (whether the current chronological order works or a different narrative order would be better),
  "orderNote": "brief note if narrative order is suggested, explaining why"
}

Be encouraging but honest. Focus on variety (travel + everyday + celebrations), emotional arc, and geographic diversity.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 400,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'AI unavailable' }, { status: 502 });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        arcQuality: 'good',
        arcSummary: 'Your photo collection looks great!',
        strengths: ['Nice variety of moments'],
        suggestions: ['Consider adding location labels to all clusters for richer stories'],
        optimalOrder: 'chronological',
      });
    }
  } catch (error) {
    console.error('[story-advisor] Error:', error);
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}
