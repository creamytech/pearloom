// ─────────────────────────────────────────────────────────────
// Pearloom / api/thank-you/generate/route.ts
// AI Thank-You Notes Generator — generates personalized notes
// for each guest using Gemini Flash with p-limit concurrency.
// POST { guests, coupleNames, voiceSample, occasion }
// Returns { notes: Array<{ guestName, note }> }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pLimit from 'p-limit';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 256,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini error: ${res.status}`);
  }
  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  return raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
}

interface GuestInput {
  name: string;
  gift?: string;
  relationship?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await req.json() as {
      guests: GuestInput[];
      coupleNames: [string, string];
      voiceSample: string;
      occasion: string;
    };

    const { guests, coupleNames, voiceSample, occasion } = body;

    if (!guests || !Array.isArray(guests) || guests.length === 0) {
      return NextResponse.json({ error: 'guests array is required' }, { status: 400 });
    }
    if (!coupleNames || coupleNames.length < 2) {
      return NextResponse.json({ error: 'coupleNames is required' }, { status: 400 });
    }

    const limit = pLimit(4);
    const [name1, name2] = coupleNames;

    const tasks = guests.map(guest =>
      limit(async () => {
        const { name: guestName, gift, relationship } = guest;
        const prompt = `Write a warm, personal thank-you note from ${name1} & ${name2} to ${guestName} for their ${occasion || 'wedding'}.
${gift ? `They gave: ${gift}.` : ''}
${relationship ? `They are: ${relationship}.` : ''}
Voice sample (match this writing style): "${voiceSample.slice(0, 300)}"
Write 3-4 sentences, warm and specific. First person. No generic phrases.`;

        const note = await callGemini(prompt, apiKey);
        return { guestName, note };
      })
    );

    const notes = await Promise.all(tasks);
    return NextResponse.json({ notes });
  } catch (err) {
    console.error('[api/thank-you/generate] error:', err);
    return NextResponse.json({ error: 'Failed to generate notes' }, { status: 500 });
  }
}
