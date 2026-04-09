// ─────────────────────────────────────────────────────────────
// Pearloom / api/suggest-content/route.ts
// Uses Gemini to generate bespoke AI suggestions for incomplete
// site fields — taglines, venue notes, travel tips, etc.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

export const dynamic = 'force-dynamic';

// Rate limit: max 30 AI suggestions per user per hour
const suggestRateMap = new Map<string, { count: number; resetAt: number }>();
function isSuggestRateLimited(email: string): boolean {
  const now = Date.now();
  const entry = suggestRateMap.get(email);
  if (!entry || now > entry.resetAt) {
    suggestRateMap.set(email, { count: 1, resetAt: now + 60 * 60 * 1000 });
    if (suggestRateMap.size > 5000) {
      for (const [k, v] of suggestRateMap) { if (now > v.resetAt) suggestRateMap.delete(k); }
    }
    return false;
  }
  entry.count++;
  return entry.count > 30;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (isSuggestRateLimited(session.user.email || 'unknown')) {
    return NextResponse.json({ error: 'Too many requests — please wait before generating more suggestions' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const {
      field,         // which field to suggest: 'tagline' | 'rsvpIntro' | 'closingLine' | 'venueNote' | 'travelTip' | 'hashtags'
      vibeString,    // couple's original vibe prompt
      coupleNames,   // [string, string]
      context,       // optional: any extra context (venue name, date, etc.)
    }: {
      field: string;
      vibeString: string;
      coupleNames: [string, string];
      context?: string;
    } = body;

    if (!field || !vibeString || !coupleNames?.length) {
      return NextResponse.json({ error: 'field, vibeString, and coupleNames are required' }, { status: 400 });
    }

    const [name1, name2] = coupleNames;
    const ctxNote = context ? `\nExtra context: ${context}` : '';

    const prompts: Record<string, string> = {
      tagline: `Write a single 5-8 word poetic hero tagline for ${name1} & ${name2}'s wedding website. Their vibe: "${vibeString}". Examples: "Two hearts, one beautiful adventure", "A love story written in golden light". Return ONLY the tagline text, nothing else.${ctxNote}`,

      rsvpIntro: `Write a warm, personal 1-2 sentence RSVP section intro for ${name1} & ${name2}'s wedding. Their vibe: "${vibeString}". It should feel intimate and joyful, like a personal note from the couple. Return ONLY the text.${ctxNote}`,

      closingLine: `Write a 10-15 word poetic closing line for the footer of ${name1} & ${name2}'s wedding website. Their vibe: "${vibeString}". Should feel like a whispered promise. Return ONLY the text.${ctxNote}`,

      venueNote: `Write a 1-2 sentence romantic description of the wedding venue for ${name1} & ${name2}. Their vibe: "${vibeString}". Make it evocative and poetic — make guests excited to arrive. Return ONLY the text.${ctxNote}`,

      travelTip: `Write a friendly, warm 2-3 sentence travel tip note for out-of-town guests attending ${name1} & ${name2}'s wedding. Their vibe: "${vibeString}". Should feel personal and welcoming. Return ONLY the text.${ctxNote}`,

      hashtags: `Generate 4 wedding hashtag suggestions for ${name1} & ${name2}. Their vibe: "${vibeString}". Make them clever, romantic, and memorable. One per line, include the # symbol. Return ONLY the hashtags.${ctxNote}`,

      dressCode: `Write a poetic 1-sentence dress code suggestion for ${name1} & ${name2}'s wedding. Their vibe: "${vibeString}". Make it feel inviting, not stuffy. Return ONLY the text.${ctxNote}`,
    };

    const prompt = prompts[field] || `Generate a short, poetic suggestion for the "${field}" field for ${name1} & ${name2}'s wedding site. Vibe: "${vibeString}". Return ONLY the suggestion text.`;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 256 } }),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}`);
    const geminiData = await res.json();
    const suggestion = (geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

    return NextResponse.json({ suggestion });
  } catch (err) {
    console.error('[suggest-content] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Suggestion generation failed' },
      { status: 500 }
    );
  }
}
