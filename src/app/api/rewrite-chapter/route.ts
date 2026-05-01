// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/rewrite-chapter/route.ts
// AI Chapter Rewrite — rewrites a chapter in the couple's voice
// POST { chapter, voiceSamples?, tone? }
// ─────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Chapter } from '@/types';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

type Tone = 'polish' | 'poetic' | 'playful' | 'intimate';

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 512,
      },
    }),
  });
  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  return raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const chapter: Chapter = body.chapter;
    const voiceSamples: string[] | undefined = body.voiceSamples;
    const tone: Tone = body.tone || 'polish';

    if (!chapter) {
      return Response.json({ error: 'chapter is required' }, { status: 400 });
    }

    const prompt = `You are rewriting a wedding story chapter in the couple's voice.

Current chapter:
Title: "${chapter.title}"
Subtitle: "${chapter.subtitle}"
Description: "${chapter.description}"
Mood: "${chapter.mood}"
${chapter.location ? `Location: ${chapter.location.label}` : ''}

${voiceSamples?.length ? `Voice samples from the couple:\n${voiceSamples.slice(0, 3).join('\n---\n')}` : ''}

Tone requested: ${tone}
- polish: refine and elevate what's there, keep meaning
- poetic: more lyrical, imagery-rich
- playful: lighter, warmer, some wit
- intimate: raw, personal, unpolished-feeling

Return ONLY valid JSON: { "title": "...", "subtitle": "...", "description": "..." }
Keep title under 6 words. Subtitle: 1 poetic sentence. Description: 3-4 sentences.`;

    let result: { title: string; subtitle: string; description: string };
    try {
      const raw = await callGemini(prompt, apiKey);
      result = JSON.parse(raw);
    } catch {
      console.warn('[rewrite-chapter] Gemini parse failed, returning original');
      return Response.json({ error: 'AI generation failed — try again' }, { status: 502 });
    }

    if (!result.title && !result.description) {
      return Response.json({ error: 'AI returned empty content' }, { status: 502 });
    }

    return Response.json({
      title: result.title || chapter.title,
      subtitle: result.subtitle || chapter.subtitle,
      description: result.description || chapter.description,
    });
  } catch (err) {
    console.error('[rewrite-chapter] Error:', err);
    return Response.json({ error: 'Rewrite failed' }, { status: 500 });
  }
}
