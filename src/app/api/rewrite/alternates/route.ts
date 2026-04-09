import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const maxDuration = 60;

const GEMINI_FLASH = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

interface AlternateConfig {
  temperature: number;
  label: string;
  energy: string;
}

const CONFIGS: AlternateConfig[] = [
  { temperature: 0.6, label: 'understated & intimate', energy: 'Understated' },
  { temperature: 0.9, label: 'warm & expressive',      energy: 'Warm' },
  { temperature: 1.2, label: 'bold & poetic',           energy: 'Bold' },
];

async function callGemini(
  apiKey: string,
  prompt: string,
  temperature: number,
): Promise<string | null> {
  try {
    const res = await fetch(`${GEMINI_FLASH}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: 512 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), { status: 500 });
  }

  const { title, description, mood, vibeString, occasion } = await req.json();

  const results = await Promise.all(
    CONFIGS.map(async ({ temperature, label, energy }) => {
      const prompt = `Rewrite the following ${occasion || 'wedding'} chapter description in a ${label} style.
Write in first person plural using "we", "our", and "us". Return ONLY the rewritten description — plain prose, 3-4 sentences, no JSON, no quotes, no labels, no preamble.
Energy: ${energy}

Chapter title: "${title || ''}"
Current description: "${description || ''}"
Mood: ${mood || 'romantic'}
Style/vibe: ${vibeString || ''}

Avoid these words entirely: journey, adventure, soulmate, fairy tale, magical, storybook.
Write something intimate, specific, and cinematic.`;

      const text = await callGemini(apiKey, prompt, temperature);
      return text ? text.trim() : null;
    }),
  );

  const alternates = results.filter((r): r is string => r !== null);

  if (alternates.length === 0) {
    return new Response(JSON.stringify({ error: 'All Gemini calls failed' }), { status: 502 });
  }

  return new Response(JSON.stringify({ alternates }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
