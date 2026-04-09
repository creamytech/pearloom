// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/translate/route.ts
// AI translation for chapter content using Gemini.
// POST { chapters: Chapter[], targetLocale: string, coupleNames: [string, string] }
// Returns { translations: Array<{ title, subtitle, description }> }
// ─────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Chapter } from '@/types';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

export interface ChapterTranslation {
  title: string;
  subtitle: string;
  description: string;
}

const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  pt: 'Portuguese',
  de: 'German',
  ja: 'Japanese',
  zh: 'Chinese (Simplified)',
  he: 'Hebrew',
  ar: 'Arabic',
};

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
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
    const chapters: Chapter[] = body.chapters;
    const targetLocale: string = body.targetLocale;
    const coupleNames: [string, string] = body.coupleNames;

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return Response.json({ error: 'chapters array is required' }, { status: 400 });
    }
    if (!targetLocale) {
      return Response.json({ error: 'targetLocale is required' }, { status: 400 });
    }

    const languageName = LOCALE_NAMES[targetLocale] || targetLocale;
    const [name1, name2] = coupleNames || ['', ''];

    const chaptersJson = chapters.map((c) => ({
      title: c.title,
      subtitle: c.subtitle,
      description: c.description,
    }));

    const prompt = `Translate the following wedding story chapters to ${languageName}.
Preserve the romantic, poetic tone. Keep proper nouns (names like "${name1}" and "${name2}", place names) unchanged.
Return ONLY valid JSON array (no markdown, no explanation) with exactly ${chapters.length} objects, same structure as input:
[{ "title": "...", "subtitle": "...", "description": "..." }]

Chapters to translate:
${JSON.stringify(chaptersJson, null, 2)}`;

    let translations: ChapterTranslation[];
    try {
      const raw = await callGemini(prompt, apiKey);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Not an array');
      translations = parsed;
    } catch {
      console.warn('[translate] Gemini parse failed');
      return Response.json({ error: 'AI translation failed — try again' }, { status: 502 });
    }

    return Response.json({ translations });
  } catch (err) {
    console.error('[translate] Error:', err);
    return Response.json({ error: 'Translation failed' }, { status: 500 });
  }
}
