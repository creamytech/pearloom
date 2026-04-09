// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/ai-thankyou/route.ts
// AI Thank-You Note Generator — creates warm, personalized
// thank-you messages for guests based on their gifts.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

const RATE_LIMIT_THANKYOU = { max: 30, windowMs: 60 * 60 * 1000 };

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit by user email
  const rateCheck = checkRateLimit(`ai-thankyou:${session.user.email}`, RATE_LIMIT_THANKYOU);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before generating more notes.' },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { guestName, giftDescription, coupleNames, occasion, vibe } = await req.json();

    if (!guestName || typeof guestName !== 'string') {
      return NextResponse.json({ error: 'guestName is required' }, { status: 400 });
    }
    if (!coupleNames || typeof coupleNames !== 'string') {
      return NextResponse.json({ error: 'coupleNames is required' }, { status: 400 });
    }

    const occasionLabel = occasion === 'wedding' ? 'wedding'
      : occasion === 'anniversary' ? 'anniversary celebration'
      : occasion === 'birthday' ? 'birthday celebration'
      : occasion === 'engagement' ? 'engagement party'
      : 'celebration';

    const prompt = `You are a warm, thoughtful assistant helping a couple write thank-you notes after their ${occasionLabel}.

Write a personalized thank-you note from ${coupleNames} to ${guestName}.
${giftDescription ? `They gave: ${giftDescription}` : 'No specific gift mentioned — thank them for attending and their presence.'}
${vibe ? `Couple's vibe/style: "${vibe}"` : ''}

Guidelines:
- 3-4 sentences, warm and genuine
- Reference the specific gift if mentioned, or their presence at the event
- Match the couple's vibe if provided (casual, formal, playful, etc.)
- End with warmth — looking forward to seeing them, or gratitude
- Do NOT use generic phrases like "it means the world" — be specific and heartfelt
- Do NOT include a greeting or sign-off (just the body text)

Return ONLY the plain text note (no JSON, no quotes, no formatting):`;

    let note: string;
    try {
      note = await callGemini(prompt, apiKey);
      // Strip any accidental JSON wrapping
      if (note.startsWith('"') && note.endsWith('"')) {
        note = JSON.parse(note);
      }
    } catch {
      note = giftDescription
        ? `Thank you so much for the ${giftDescription} — we absolutely love it! It was wonderful having you celebrate with us, and your thoughtfulness made the day even more special. We can't wait to see you again soon.`
        : `Thank you so much for being there to celebrate with us — your presence truly made the day special. We loved every moment of having you there, and the memories we made together are ones we'll cherish forever. We can't wait to see you again soon.`;
    }

    return NextResponse.json({ note });
  } catch (err) {
    console.error('[ai-thankyou] Error:', err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
