// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/ai-travel-guide/route.ts
// AI Travel Guide Generator — creates getting-there tips,
// restaurant/activity suggestions, and weather estimates
// for event guests.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const RATE_LIMIT_TRAVEL_GUIDE = { max: 10, windowMs: 60 * 60 * 1000 };

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
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
  const rateCheck = checkRateLimit(`ai-travel-guide:${session.user.email}`, RATE_LIMIT_TRAVEL_GUIDE);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before generating another travel guide.' },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { venueAddress, venueCity, eventDate, occasion } = await req.json();

    if (!venueCity || typeof venueCity !== 'string') {
      return NextResponse.json({ error: 'venueCity is required' }, { status: 400 });
    }

    const occasionLabel = occasion === 'wedding' ? 'wedding'
      : occasion === 'anniversary' ? 'anniversary celebration'
      : occasion === 'birthday' ? 'birthday celebration'
      : occasion === 'engagement' ? 'engagement party'
      : 'celebration';

    const prompt = `You are a knowledgeable travel concierge for Pearloom, a premium ${occasionLabel} website platform.

Generate a travel guide for guests attending a ${occasionLabel} in ${venueCity}${venueAddress ? ` at ${venueAddress}` : ''}.
${eventDate ? `Event date: ${eventDate}` : ''}

Return ONLY valid JSON (no markdown, no backticks):
{
  "gettingThere": "2-3 sentences about the best airports, driving directions, and general tips for getting to ${venueCity}. Be specific about airport codes and distances.",
  "restaurants": [
    { "name": "Restaurant Name", "type": "Cuisine type (e.g. Italian, Farm-to-Table)", "note": "One-line description of why guests would love it" },
    { "name": "Restaurant Name", "type": "Cuisine type", "note": "One-line description" },
    { "name": "Restaurant Name", "type": "Cuisine type", "note": "One-line description" }
  ],
  "activities": [
    { "name": "Activity or Attraction Name", "description": "One-line description of the experience" },
    { "name": "Activity Name", "description": "One-line description" },
    { "name": "Activity Name", "description": "One-line description" }
  ],
  "weather": {
    "temp": "Temperature range string (e.g. '72-85°F')",
    "description": "Brief weather description for the season (e.g. 'Warm and sunny with occasional afternoon showers')",
    "packingTip": "One practical packing tip for guests"
  }
}

Make the suggestions feel like insider tips from a local, not generic tourist recommendations. Use real, well-known places when possible.`;

    let parsed: {
      gettingThere: string;
      restaurants: Array<{ name: string; type: string; note: string }>;
      activities: Array<{ name: string; description: string }>;
      weather: { temp: string; description: string; packingTip: string };
    };

    try {
      const raw = await callGemini(prompt, apiKey);
      parsed = JSON.parse(raw);
    } catch {
      // Seasonal weather fallback heuristic
      const month = eventDate ? new Date(eventDate).getMonth() : new Date().getMonth();
      const isWinter = month >= 11 || month <= 2;
      const isSummer = month >= 5 && month <= 8;
      const isSpring = month >= 3 && month <= 4;

      parsed = {
        gettingThere: `${venueCity} is accessible by major airports in the area. Check flight options early for the best rates, and consider renting a car for flexibility during your stay.`,
        restaurants: [
          { name: 'Local Farm-to-Table Spot', type: 'American', note: 'Fresh seasonal dishes with locally sourced ingredients' },
          { name: 'Downtown Bistro', type: 'French-American', note: 'Perfect for a pre-event dinner with friends' },
          { name: 'Waterfront Seafood House', type: 'Seafood', note: 'Beautiful views and fresh catches daily' },
        ],
        activities: [
          { name: 'Historic Downtown Walking Tour', description: 'Explore the charming streets and local architecture' },
          { name: 'Local Art Gallery', description: 'Discover the local arts scene and pick up a unique keepsake' },
          { name: 'Scenic Overlook Park', description: 'Great for photos and a peaceful morning walk' },
        ],
        weather: {
          temp: isWinter ? '30-45°F' : isSummer ? '75-90°F' : isSpring ? '55-70°F' : '50-65°F',
          description: isWinter ? 'Cool to cold — dress in warm layers'
            : isSummer ? 'Warm and sunny — stay hydrated'
            : isSpring ? 'Mild and pleasant with occasional showers'
            : 'Crisp autumn air with beautiful foliage',
          packingTip: isWinter ? 'Bring a warm coat and layers'
            : isSummer ? 'Pack sunscreen, sunglasses, and light layers for evening'
            : 'An umbrella and a light jacket will serve you well',
        },
      };
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[ai-travel-guide] Error:', err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
