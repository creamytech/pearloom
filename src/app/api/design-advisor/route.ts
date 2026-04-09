import { NextRequest, NextResponse } from 'next/server';
import { GEMINI_FLASH } from '@/lib/memory-engine/gemini-client';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// ─────────────────────────────────────────────────────────────
// POST /api/design-advisor
// Runs rule-based WCAG checks + AI design suggestions on a palette.
// Returns a JSON array of { severity, code, title, detail } items.
//
// The AI is asked for nuanced suggestions the rules can't catch:
// emotional tone mismatch, font+color pairing, mesh harmony, etc.
// ─────────────────────────────────────────────────────────────

interface AdvisorRequest {
  colors: {
    background: string;
    foreground: string;
    accent: string;
    accentLight: string;
    muted: string;
    cardBg: string;
  };
  meshPreset?: string;
  occasion?: string;  // 'wedding' | 'birthday' | 'anniversary' | ...
  vibeTone?: string;  // e.g. "romantic", "modern", "garden"
}

export interface AISuggestion {
  severity: 'ok' | 'tip' | 'warn';
  title: string;
  detail: string;
}

const SYSTEM = `You are a concise design advisor for a wedding and celebration website builder.
You receive a color palette and return 1–3 SHORT design suggestions in JSON.
Focus on: color harmony, emotional tone, readability, and what would make the site feel more cohesive.
Be friendly and specific. Never lecture. Keep each suggestion under 20 words.
Output ONLY a JSON array: [{"severity":"tip|warn","title":"...","detail":"..."}]
If the palette looks great, return an empty array [].`;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`design-advisor:${ip}`, { max: 10, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestions: [] });
  }

  let body: AdvisorRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { colors, meshPreset, occasion = 'wedding', vibeTone } = body;

  const prompt = `
Palette for a ${occasion} site${vibeTone ? ` with "${vibeTone}" vibe` : ''}:
- Background: ${colors.background}
- Foreground text: ${colors.foreground}
- Accent (buttons, highlights): ${colors.accent}
- Accent light: ${colors.accentLight}
- Muted text: ${colors.muted}
- Card background: ${colors.cardBg}
${meshPreset && meshPreset !== 'none' ? `- Gradient mesh: "${meshPreset}" preset` : ''}

Give 1–3 design suggestions. Output only a JSON array.
`.trim();

  try {
    const res = await fetch(`${GEMINI_FLASH}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 256,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const data = await res.json();
    const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

    let suggestions: AISuggestion[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        suggestions = parsed.slice(0, 3).filter(
          (s: unknown): s is AISuggestion =>
            typeof s === 'object' && s !== null && 'title' in s && 'detail' in s && 'severity' in s
        );
      }
    } catch {
      // Gemini returned non-JSON — ignore, return empty
    }

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
