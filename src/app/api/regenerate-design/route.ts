// ─────────────────────────────────────────────────────────────
// Pearloom / api/regenerate-design/route.ts
// Re-runs VibeSkin generation without touching the story.
// Couples can iterate on their site's visual identity from the
// editor Design tab without regenerating the whole story.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateVibeSkin, extractCoupleProfile } from '@/lib/vibe-engine';
import type { VibeSkinContext } from '@/lib/vibe-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const {
      vibeString,
      coupleNames,
      chapters,
      inspirationUrls,
    }: {
      vibeString: string;
      coupleNames: [string, string];
      chapters?: Array<{ title: string; subtitle: string; mood: string; location?: { label: string } | null; description: string }>;
      inspirationUrls?: string[];
    } = body;

    if (!vibeString || !coupleNames?.length) {
      return NextResponse.json({ error: 'vibeString and coupleNames are required' }, { status: 400 });
    }

    // Extract couple profile for bespoke illustration
    let coupleProfile;
    if (chapters?.length) {
      try {
        coupleProfile = await extractCoupleProfile(
          vibeString,
          chapters.map(c => ({ title: c.title, description: c.description, mood: c.mood })),
          apiKey
        );
      } catch {
        // Non-fatal — VibeSkin will still generate without it
      }
    }

    const context: VibeSkinContext = {
      chapters,
      inspirationUrls,
      coupleProfile,
    };

    const vibeSkin = await generateVibeSkin(vibeString, apiKey, coupleNames, context);

    return NextResponse.json({ vibeSkin });
  } catch (err) {
    console.error('[regenerate-design] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Design generation failed' },
      { status: 500 }
    );
  }
}
