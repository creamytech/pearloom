// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/ai-meals/route.ts
// AI Meal Description Generator — creates appetizing meal copy
// and full menu suggestions for RSVP meal options
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 1024,
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
  const rateCheck = checkRateLimit(`ai-meals:${session.user.email}`, RATE_LIMITS.aiBlocks);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before generating more.' },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { generateMenu, mealName, occasion, vibe, dietaryTags, guestCount } = body;

    // ── Mode 1: Generate a full menu ──
    if (generateMenu) {
      const occasionLabel = occasion === 'wedding' ? 'wedding reception'
        : occasion === 'anniversary' ? 'anniversary dinner'
        : occasion === 'birthday' ? 'birthday celebration'
        : occasion === 'engagement' ? 'engagement party'
        : 'celebration';

      const vibeContext = vibe ? `Vibe/style: "${vibe}".` : '';
      const guestContext = guestCount ? `Expected guests: ~${guestCount}.` : '';

      const prompt = `You are a culinary consultant for Pearloom, a premium celebration website platform.

Generate a curated menu of 3-5 meal options for a ${occasionLabel}.
${vibeContext}
${guestContext}

Each meal should have variety — include at least one vegetarian/vegan option. The names should sound elegant but approachable.

Return ONLY valid JSON (no markdown, no backticks) matching this schema:
[
  {
    "name": "Meal Name (e.g. 'Herb-Crusted Chicken with Roasted Vegetables')",
    "description": "1-2 appetizing sentences that make guests excited about this dish. Use sensory language.",
    "dietaryTags": ["vegetarian", "vegan", "gluten-free", "dairy-free", "nut-free", "halal", "kosher"]
  }
]

Only include dietaryTags that actually apply to each dish. Make descriptions warm and inviting — these appear on a wedding/event RSVP form.`;

      let parsed: unknown;
      try {
        const raw = await callGemini(prompt, apiKey);
        parsed = JSON.parse(raw);
      } catch {
        console.warn('[ai-meals] Gemini parse failed for menu, using fallback');
        parsed = [
          { name: 'Herb-Crusted Chicken', description: 'Tender chicken breast with a golden herb crust, served alongside roasted seasonal vegetables and creamy mashed potatoes.', dietaryTags: ['gluten-free'] },
          { name: 'Pan-Seared Salmon', description: 'Fresh Atlantic salmon seared to perfection, resting on a bed of lemon-dill risotto with grilled asparagus.', dietaryTags: ['gluten-free'] },
          { name: 'Garden Risotto', description: 'A creamy arborio rice risotto with roasted mushrooms, fresh herbs, and shaved parmesan — a celebration of seasonal produce.', dietaryTags: ['vegetarian', 'gluten-free'] },
        ];
      }

      return NextResponse.json({ meals: Array.isArray(parsed) ? parsed : [parsed] });
    }

    // ── Mode 2: Generate description for a single meal ──
    if (!mealName || typeof mealName !== 'string') {
      return NextResponse.json(
        { error: 'Provide either { generateMenu: true } or { mealName: "..." }' },
        { status: 400 }
      );
    }

    if (mealName.length > 200) {
      return NextResponse.json({ error: 'Meal name too long (max 200 characters)' }, { status: 400 });
    }

    const occasionLabel = occasion || 'celebration';
    const vibeNote = vibe ? ` The event vibe is "${vibe}".` : '';
    const dietaryNote = dietaryTags?.length ? ` This dish is: ${dietaryTags.join(', ')}.` : '';

    const prompt = `You are a food writer for Pearloom, a premium celebration website.

Write a 1-2 sentence appetizing description for this dish that will appear on an RSVP form for a ${occasionLabel}:
Dish name: "${mealName}"${vibeNote}${dietaryNote}

The description should make guests excited to select this option. Use sensory, evocative language. Be concise but vivid.

Return ONLY the description text — no quotes, no JSON, just the 1-2 sentences.`;

    let description: string;
    try {
      description = await callGemini(prompt, apiKey);
      // Clean up any accidental quotes
      description = description.replace(/^["']|["']$/g, '').trim();
    } catch {
      console.warn('[ai-meals] Gemini failed for single meal, using fallback');
      description = `A beautifully prepared ${mealName.toLowerCase()}, crafted with seasonal ingredients and served with care.`;
    }

    return NextResponse.json({ description });
  } catch (err) {
    console.error('[ai-meals] Error:', err);
    return NextResponse.json({ error: 'Meal generation failed' }, { status: 500 });
  }
}
