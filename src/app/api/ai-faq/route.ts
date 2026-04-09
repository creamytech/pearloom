// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/ai-faq/route.ts
// AI FAQ Auto-Answerer — generates contextual FAQs from the
// full site manifest using Gemini.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit by user email
  const rateCheck = checkRateLimit(`ai-faq:${session.user.email}`, RATE_LIMITS.aiBlocks);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before generating more FAQs.' },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { manifest } = await req.json();

    if (!manifest) {
      return NextResponse.json({ error: 'Missing manifest' }, { status: 400 });
    }

    // Extract context from the manifest
    const names = manifest.chapters?.[0]?.title?.split('&').map((n: string) => n.trim()) || [];
    const occasion = manifest.occasion || 'wedding';
    const events = manifest.events || [];
    const logistics = manifest.logistics || {};
    const registry = manifest.registry;
    const travelInfo = manifest.travelInfo;
    const poetry = manifest.poetry;

    // Build rich context for the AI
    const contextParts: string[] = [];

    if (names.length >= 2) {
      contextParts.push(`Couple: ${names[0]} & ${names[1]}`);
    }
    contextParts.push(`Occasion: ${occasion}`);

    if (logistics.venue) contextParts.push(`Venue: ${logistics.venue}`);
    if (logistics.venueAddress) contextParts.push(`Venue Address: ${logistics.venueAddress}`);
    if (logistics.date) contextParts.push(`Date: ${logistics.date}`);
    if (logistics.time) contextParts.push(`Time: ${logistics.time}`);
    if (logistics.dresscode) contextParts.push(`Dress Code: ${logistics.dresscode}`);
    if (logistics.rsvpDeadline) contextParts.push(`RSVP Deadline: ${logistics.rsvpDeadline}`);

    if (events.length > 0) {
      const eventDetails = events.map((e: { name: string; venue?: string; address?: string; time?: string; endTime?: string; dressCode?: string; type?: string }) =>
        `- ${e.name} (${e.type || 'event'}): ${e.venue || 'TBD'}, ${e.address || ''}, ${e.time || ''}${e.endTime ? ` – ${e.endTime}` : ''}${e.dressCode ? `, Dress code: ${e.dressCode}` : ''}`
      ).join('\n');
      contextParts.push(`Events:\n${eventDetails}`);
    }

    if (registry?.enabled) {
      const registryParts: string[] = [];
      if (registry.cashFundUrl) registryParts.push(`Cash fund available`);
      if (registry.entries?.length) registryParts.push(`Registries: ${registry.entries.map((e: { name: string }) => e.name).join(', ')}`);
      if (registryParts.length) contextParts.push(`Registry: ${registryParts.join('. ')}`);
    }

    if (travelInfo) {
      if (travelInfo.airports?.length) contextParts.push(`Nearby airports: ${travelInfo.airports.join(', ')}`);
      if (travelInfo.parkingInfo) contextParts.push(`Parking: ${travelInfo.parkingInfo}`);
      if (travelInfo.hotels?.length) {
        const hotelList = travelInfo.hotels.map((h: { name: string; groupRate?: string }) =>
          `${h.name}${h.groupRate ? ` (${h.groupRate})` : ''}`
        ).join(', ');
        contextParts.push(`Hotels: ${hotelList}`);
      }
    }

    if (poetry?.heroTagline) contextParts.push(`Site tagline: "${poetry.heroTagline}"`);
    if (manifest.vibeString) contextParts.push(`Vibe: "${manifest.vibeString}"`);

    const siteContext = contextParts.join('\n');

    const fullPrompt = `You are an AI assistant for Pearloom, a premium celebration website platform.
Given the following details about a ${occasion}, generate 5-8 frequently asked questions with REAL, SPECIFIC answers based on the actual data provided. Do NOT use generic template answers — reference real venues, dates, times, addresses, and details from the context.

SITE DETAILS:
${siteContext}

RULES:
- Each FAQ must have a specific answer drawn from the provided details
- If venue is known, mention it by name in relevant answers
- If date/time is known, include it in relevant answers
- If dress code is known, answer specifically
- If travel/hotel info is available, reference real hotel names and rates
- If registry info is available, mention the actual registries
- Cover categories: logistics, dress-code, travel, gifts, ceremony, food/drinks, general
- Make answers warm, friendly, and personal — not corporate
- Each answer should be 1-3 sentences

Return ONLY valid JSON (no markdown, no backticks) in this format:
[
  {
    "id": "faq-1",
    "question": "Where is the ceremony?",
    "answer": "The ceremony will be held at [actual venue name] located at [actual address].",
    "category": "logistics"
  }
]

Categories to use: "logistics", "dress-code", "travel", "gifts", "ceremony", "general"`;

    let parsed: unknown;
    try {
      const raw = await callGemini(fullPrompt, apiKey);
      parsed = JSON.parse(raw);
    } catch {
      console.warn('[ai-faq] Gemini parse failed, using fallback');
      // Generate basic fallback FAQs from manifest data
      const fallback = [];
      let idx = 1;

      if (logistics.venue) {
        fallback.push({
          id: `faq-${idx++}`,
          question: 'Where is the celebration?',
          answer: `The celebration will be held at ${logistics.venue}${logistics.venueAddress ? `, located at ${logistics.venueAddress}` : ''}.`,
          category: 'logistics',
        });
      }
      if (logistics.date) {
        fallback.push({
          id: `faq-${idx++}`,
          question: 'When is the event?',
          answer: `The event is on ${logistics.date}${logistics.time ? ` at ${logistics.time}` : ''}.`,
          category: 'logistics',
        });
      }
      if (logistics.dresscode) {
        fallback.push({
          id: `faq-${idx++}`,
          question: 'What is the dress code?',
          answer: `The dress code is ${logistics.dresscode}.`,
          category: 'dress-code',
        });
      }
      fallback.push({
        id: `faq-${idx++}`,
        question: 'Can I bring a plus one?',
        answer: 'Please check your invitation for plus-one details, or reach out to us directly.',
        category: 'general',
      });
      fallback.push({
        id: `faq-${idx++}`,
        question: 'Will there be parking?',
        answer: travelInfo?.parkingInfo || 'Parking details will be shared closer to the event.',
        category: 'travel',
      });

      parsed = fallback;
    }

    // Normalize and add order field
    const faqs = (Array.isArray(parsed) ? parsed : []).map(
      (faq: { id?: string; question: string; answer: string; category?: string }, i: number) => ({
        id: faq.id || `faq-${Date.now()}-${i}`,
        question: faq.question,
        answer: faq.answer,
        category: faq.category || 'general',
        order: i,
      })
    );

    return NextResponse.json({ faqs });
  } catch (err) {
    console.error('[ai-faq] Error:', err);
    return NextResponse.json({ error: 'FAQ generation failed' }, { status: 500 });
  }
}
