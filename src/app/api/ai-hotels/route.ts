// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/ai-hotels/route.ts
// AI Hotel Finder — suggests nearby hotels for the venue
// Uses Gemini to generate contextual hotel recommendations
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1536,
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
  const rateCheck = checkRateLimit(`ai-hotels:${session.user.email}`, RATE_LIMITS.aiBlocks);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before searching again.' },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { venueAddress, venueCity, eventDate, guestCount, budget } = await req.json();

    if (!venueAddress && !venueCity) {
      return NextResponse.json(
        { error: 'Please provide a venue address or city' },
        { status: 400 }
      );
    }

    // Validate input lengths to prevent abuse
    if (venueAddress && typeof venueAddress === 'string' && venueAddress.length > 500) {
      return NextResponse.json({ error: 'Venue address too long (max 500 characters)' }, { status: 400 });
    }

    const locationContext = venueAddress || venueCity;
    const guestContext = guestCount ? `Expected guest count: ~${guestCount} guests.` : '';
    const budgetContext = budget ? `Budget preference: ${budget}.` : '';
    const dateContext = eventDate ? `Event date: ${eventDate}.` : '';

    const prompt = `You are a helpful wedding/event hotel concierge for Pearloom, a premium celebration website platform.

Suggest 3-5 hotels near this venue for event guests:
Location: ${locationContext}
${dateContext}
${guestContext}
${budgetContext}

For each hotel, provide realistic recommendations that a real guest would find useful. Include a mix of price tiers if no budget preference was specified.

Return ONLY valid JSON (no markdown, no backticks) matching this schema:
[
  {
    "name": "Hotel Name",
    "address": "Full street address",
    "distance": "Approximate distance from venue (e.g. '0.5 miles', '10 min drive')",
    "priceTier": "budget" | "mid" | "luxury",
    "description": "1-2 sentences about why this hotel is a good fit for wedding/event guests",
    "groupRateTip": "A helpful tip about securing group rates (e.g. 'Call the sales department and mention your wedding block — most Marriotts offer 10-15% off for 10+ rooms')",
    "bookingUrl": "https://www.hotelwebsite.com/... (realistic booking URL)",
    "amenities": ["Free Breakfast", "Pool", "Shuttle Service", "Pet Friendly"] (3-5 key amenities)
  }
]

Make the descriptions warm and helpful, like a knowledgeable friend giving hotel advice. Include practical tips about proximity to the venue, shuttle options, and any wedding-specific perks.`;

    let parsed: unknown;
    try {
      const raw = await callGemini(prompt, apiKey);
      parsed = JSON.parse(raw);
    } catch {
      console.warn('[ai-hotels] Gemini parse failed, using fallback');
      parsed = [
        {
          name: 'Nearby Hotel',
          address: locationContext,
          distance: '5 min drive',
          priceTier: 'mid',
          description: 'A comfortable hotel near the venue, perfect for wedding guests.',
          groupRateTip: 'Call ahead and ask about group rates for wedding blocks — most hotels offer 10-15% off for 10+ rooms.',
          bookingUrl: 'https://www.booking.com',
          amenities: ['Free WiFi', 'Parking', 'Restaurant'],
        },
      ];
    }

    return NextResponse.json({ hotels: Array.isArray(parsed) ? parsed : [parsed] });
  } catch (err) {
    console.error('[ai-hotels] Error:', err);
    return NextResponse.json({ error: 'Hotel search failed' }, { status: 500 });
  }
}
