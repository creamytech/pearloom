// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/ai-chat/route.ts
// Floating AI editor chat — couples describe changes, Gemini
// returns structured actions to update chapters or manifest.
// POST { message, manifest, activeChapterId }
// ─────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

const SYSTEM_PROMPT = `You are an AI assistant helping a couple build their wedding website on Pearloom.
You can:
1. Rewrite a specific chapter (return action: "update_chapter" with the chapter id and updated fields)
2. Update site-wide content like tagline, closing line (return action: "update_manifest")
3. Answer questions or give suggestions (return action: "message")

Always be warm, poetic, and encouraging.
Return ONLY valid JSON: { action, data, reply }
Where reply is a short friendly message to show the user (1-2 sentences).
For update_chapter: data = { id: string, title?, subtitle?, description?, mood? }
For update_manifest: data = { path: "poetry.heroTagline" | "poetry.closingLine" | "logistics.venue", value: string }
For message: data = null`;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 768,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data: GeminiResponse = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  // Strip markdown code fences if present
  return raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const message: string = body.message;
    const manifest: StoryManifest = body.manifest;
    const activeChapterId: string | null = body.activeChapterId ?? null;

    if (!message?.trim()) {
      return Response.json({ error: 'message is required' }, { status: 400 });
    }

    // Build a concise context snapshot for Gemini
    const activeChapter = manifest?.chapters?.find(c => c.id === activeChapterId) ?? null;
    const chapterSummaries = (manifest?.chapters ?? [])
      .map(c => `  • [${c.id}] "${c.title}" — ${c.description?.slice(0, 80) ?? '(no description)'}`)
      .join('\n');

    const contextBlock = `
Current site context:
- Couple: ${manifest?.coupleId ?? 'unknown'}
- Tagline: ${manifest?.poetry?.heroTagline ?? '(none set)'}
- Closing line: ${manifest?.poetry?.closingLine ?? '(none set)'}
- Venue: ${manifest?.logistics?.venue ?? '(none set)'}
- Active chapter: ${activeChapter ? `[${activeChapter.id}] "${activeChapter.title}"` : '(none)'}
- All chapters:
${chapterSummaries || '  (none)'}
`.trim();

    const fullPrompt = `${SYSTEM_PROMPT}

${contextBlock}

User request: "${message}"`;

    const raw = await callGemini(fullPrompt, apiKey);

    let parsed: { action: string; data: unknown; reply: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Gemini sometimes wraps in prose — extract first JSON object
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        return Response.json({
          action: 'message',
          data: null,
          reply: raw.slice(0, 280) || 'I had trouble understanding that. Could you rephrase?',
        });
      }
      parsed = JSON.parse(match[0]);
    }

    return Response.json({
      action: parsed.action ?? 'message',
      data: parsed.data ?? null,
      reply: parsed.reply ?? 'Done!',
    });
  } catch (err) {
    console.error('[ai-chat] Error:', err);
    return Response.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 }
    );
  }
}
