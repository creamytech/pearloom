// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/quiz/route.ts
// "How We Met" quiz generation — generates 5 trivia questions
// from the couple's story chapters using Gemini AI.
// POST { chapters: Chapter[], coupleNames: [string, string] }
// Returns { questions: QuizQuestion[] }
// ─────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import type { Chapter } from '@/types';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  emoji: string;
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1024,
      },
    }),
  });
  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  return raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const chapters: Chapter[] = body.chapters;
    const coupleNames: [string, string] = body.coupleNames;

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return Response.json({ error: 'chapters array is required' }, { status: 400 });
    }
    if (!coupleNames || coupleNames.length < 2) {
      return Response.json({ error: 'coupleNames is required' }, { status: 400 });
    }

    const [name1, name2] = coupleNames;

    const prompt = `You are creating a fun trivia quiz about ${name1} & ${name2}'s love story for their wedding guests.

Based on these chapters of their story:
${chapters.map((c, i) => `${i + 1}. "${c.title}" — ${c.description}${c.mood ? ` (mood: ${c.mood})` : ''}${c.location ? ` (location: ${c.location.label})` : ''}`).join('\n')}

Generate 5 multiple-choice trivia questions. Mix easy and fun questions.
Examples: "Where did they go on their first date?", "What city did they move to together?", "What was the mood of their first summer together?"

Return ONLY valid JSON array (no markdown, no explanation):
[{ "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "emoji": "💑" }]
Make sure correctIndex matches the actual correct answer from their story.
Keep options plausible but make the correct one clearly right from context.
Use varied emojis that match each question's theme.`;

    let questions: QuizQuestion[];
    try {
      const raw = await callGemini(prompt, apiKey);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Not an array');
      questions = parsed.slice(0, 5);
    } catch {
      console.warn('[quiz] Gemini parse failed');
      return Response.json({ error: 'AI generation failed — try again' }, { status: 502 });
    }

    return Response.json({ questions });
  } catch (err) {
    console.error('[quiz] Error:', err);
    return Response.json({ error: 'Quiz generation failed' }, { status: 500 });
  }
}
