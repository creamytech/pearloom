import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GEMINI_FLASH } from '@/lib/memory-engine/gemini-client';

export const maxDuration = 30;

interface SuggestRequest {
  vibeString: string;
  occasion: string;
  names: [string, string];
}

interface SongSuggestion {
  title: string;
  artist: string;
  mood: string;
  searchUrl: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  let body: SuggestRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { vibeString, occasion, names } = body;

  const prompt = `Suggest 10 songs that perfectly match this couple's vibe for their ${occasion} site.
Vibe: ${vibeString || 'romantic and elegant'}. Names: ${names[0]} & ${names[1]}.
Return JSON: { songs: [{ title, artist, mood }] }
Mix of: romantic slow dances, upbeat celebration, meaningful ballads.
No generic wedding songs (no Perfect by Ed Sheeran, no All of Me). Be specific and surprising.`;

  try {
    const res = await fetch(`${GEMINI_FLASH}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'AI request failed' }, { status: 502 });
    }

    const data = await res.json();
    const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

    let parsed: { songs: Array<{ title: string; artist: string; mood: string }> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
    }

    const songs: SongSuggestion[] = (parsed.songs || []).slice(0, 10).map(
      (s: { title: string; artist: string; mood: string }) => ({
        title: s.title,
        artist: s.artist,
        mood: s.mood,
        searchUrl: `https://open.spotify.com/search/${encodeURIComponent(`${s.title} ${s.artist}`)}`,
      })
    );

    return NextResponse.json({ songs });
  } catch (err) {
    console.error('[spotify/suggest]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
