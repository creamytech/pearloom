// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/rewrite-text/route.ts
// Inline AI rewrite suggestions for text fields in the editor.
// Uses Gemini gemini-3-flash-preview for low-latency rewrites.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

const VALID_STYLES = ['poetic', 'casual', 'shorter'] as const;
type RewriteStyle = (typeof VALID_STYLES)[number];

const MAX_TEXT_LENGTH = 1000;

const STYLE_INSTRUCTIONS: Record<RewriteStyle, string> = {
  poetic:
    'Rewrite the text in a poetic, lyrical style with elegant and evocative language. Use imagery and rhythm while keeping it natural — not overwrought.',
  casual:
    'Rewrite the text in a warm, conversational, and approachable tone. Make it feel like a friend is speaking — relaxed but heartfelt.',
  shorter:
    'Rewrite the text to be significantly more concise. Preserve the core meaning and warmth but cut unnecessary words and tighten the phrasing.',
};

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 512,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  return raw;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit by user email
  const rateCheck = checkRateLimit(`rewrite-text:${session.user.email}`, RATE_LIMITS.aiRewrite);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before requesting more rewrites.' },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { text, context, style } = body as {
      text: unknown;
      context: unknown;
      style: unknown;
    };

    // Validate text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required and must be a non-empty string' }, { status: 400 });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Validate context
    if (!context || typeof context !== 'string') {
      return NextResponse.json({ error: 'context is required and must be a string' }, { status: 400 });
    }

    // Validate style
    if (!style || !(VALID_STYLES as readonly string[]).includes(style as string)) {
      return NextResponse.json(
        { error: `style must be one of: ${VALID_STYLES.join(', ')}` },
        { status: 400 }
      );
    }

    const prompt = `You are a writing assistant for Pearloom, a premium wedding website platform.

${STYLE_INSTRUCTIONS[style as RewriteStyle]}

Context about this wedding site: ${context}

Text to rewrite:
"${text}"

Rules:
- Maintain the same meaning and key information
- Match the wedding site's tone based on the context provided
- Return ONLY the rewritten text, nothing else — no quotes, no labels, no explanation`;

    const rewrite = await callGemini(prompt, apiKey);

    if (!rewrite) {
      return NextResponse.json({ error: 'Rewrite generation failed' }, { status: 500 });
    }

    return NextResponse.json({ rewrite });
  } catch (err) {
    console.error('[rewrite-text] Error:', err);
    return NextResponse.json({ error: 'Rewrite failed' }, { status: 500 });
  }
}
