// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/ai-followup/route.ts
// AI Follow-Up Email Drafter — generates warm RSVP reminder
// emails for pending guests.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

const RATE_LIMIT_FOLLOWUP = { max: 15, windowMs: 60 * 60 * 1000 };

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 768,
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
  const rateCheck = checkRateLimit(`ai-followup:${session.user.email}`, RATE_LIMIT_FOLLOWUP);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before generating more emails.' },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { guestNames, coupleNames, eventDate, occasion, tone } = await req.json();

    if (!guestNames || !Array.isArray(guestNames) || guestNames.length === 0) {
      return NextResponse.json({ error: 'guestNames array is required' }, { status: 400 });
    }
    if (!coupleNames || typeof coupleNames !== 'string') {
      return NextResponse.json({ error: 'coupleNames is required' }, { status: 400 });
    }

    const occasionLabel = occasion === 'wedding' ? 'wedding'
      : occasion === 'anniversary' ? 'anniversary celebration'
      : occasion === 'birthday' ? 'birthday celebration'
      : occasion === 'engagement' ? 'engagement party'
      : 'celebration';

    const toneGuide = tone === 'formal' ? 'Write in a warm but formal tone, using proper language and structure.'
      : tone === 'playful' ? 'Write in a fun, upbeat tone with a touch of humor. Keep it lighthearted.'
      : tone === 'heartfelt' ? 'Write from the heart — genuine, emotional, and personal.'
      : 'Write in a warm, friendly tone that feels natural and inviting.';

    const guestCount = guestNames.length;
    const guestList = guestNames.slice(0, 5).join(', ') + (guestCount > 5 ? ` and ${guestCount - 5} more` : '');

    const prompt = `You are a thoughtful assistant helping a couple send RSVP reminder emails for their ${occasionLabel}.

From: ${coupleNames}
To: ${guestCount} guests who haven't responded yet (${guestList})
${eventDate ? `Event date: ${eventDate}` : ''}
${toneGuide}

Write a group RSVP reminder email. This should:
- Feel personal, not like a mass email
- Gently remind them to RSVP without being pushy
- Express excitement about the upcoming ${occasionLabel}
- Mention that their response helps with planning
- Include a soft call-to-action to RSVP

Return ONLY valid JSON (no markdown, no backticks):
{
  "subject": "A catchy, warm email subject line (under 60 chars)",
  "body": "The full email body text. Use \\n for line breaks between paragraphs. Do NOT include 'Dear [Name]' — start with a warm greeting. End with the couple's names."
}`;

    let parsed: { subject: string; body: string };
    try {
      const raw = await callGemini(prompt, apiKey);
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        subject: `We'd love to hear from you!`,
        body: `Hey there!\n\nWe're getting so excited for our ${occasionLabel} and we noticed we haven't heard from you yet. We'd love to know if you'll be joining us${eventDate ? ` on ${eventDate}` : ''}!\n\nYour RSVP helps us make sure everything is perfect for the big day — from seating to catering. It only takes a minute and means the world to us.\n\nCan't wait to celebrate with you!\n\nWith love,\n${coupleNames}`,
      };
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[ai-followup] Error:', err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
