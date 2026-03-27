// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Pearloom / app/api/ai-blocks/route.ts
// AI Block Generator â€” creates rich site sections from a prompt
// Supports: venue, events, registry, travel, faqs
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

const BLOCK_SCHEMAS: Record<string, { schema: string; fallback: unknown }> = {
  events: {
    schema: `Array of wedding event objects:
[
  {
    "id": "ceremony",
    "name": "Ceremony",
    "date": "2025-06-14",
    "time": "5:00 PM",
    "endTime": "5:45 PM",
    "venue": "Venue Name",
    "address": "Full address",
    "description": "Short warm description of this part of the day",
    "dressCode": "Black Tie Optional",
    "mapUrl": "https://maps.google.com/?q=..."
  }
]
Return 2-4 events covering the full day (ceremony, cocktail hour, reception, afterparty if appropriate).`,
    fallback: [
      { id: 'ceremony', name: 'Ceremony', date: '2025-06-14', time: '5:00 PM', endTime: '5:45 PM', venue: 'The Grand Estate', address: '123 Garden Lane', description: 'Exchange of vows in an intimate garden setting.', dressCode: 'Black Tie Optional', mapUrl: '' },
      { id: 'reception', name: 'Reception', date: '2025-06-14', time: '6:30 PM', endTime: '11:00 PM', venue: 'The Grand Ballroom', address: '123 Garden Lane', description: 'Dinner, dancing, and celebrating love all night.', dressCode: 'Black Tie Optional', mapUrl: '' },
    ],
  },

  venue: {
    schema: `A venue logistics object:
{
  "date": "June 14, 2025",
  "time": "5:00 PM",
  "venue": "The Grand Estate",
  "address": "123 Garden Lane, Newport, RI",
  "rsvpDeadline": "May 1, 2025",
  "parkingInfo": "Complimentary valet parking available",
  "shuttleInfo": "Shuttle service from [Hotel Name] at 4:30 PM"
}`,
    fallback: {
      date: 'June 14, 2025',
      time: '5:00 PM',
      venue: 'The Grand Estate',
      address: '123 Garden Lane',
      rsvpDeadline: 'May 1, 2025',
    },
  },

  registry: {
    schema: `A registry config object:
{
  "enabled": true,
  "message": "Your presence is the greatest gift. If you'd like to celebrate us further, we've curated a few ideas.",
  "cashFundUrl": "https://www.honeyfund.com/...",
  "cashFundMessage": "Contribute to our honeymoon adventures in Italy ðŸ‡®ðŸ‡¹",
  "entries": [
    { "name": "Zola", "url": "https://www.zola.com/registry/...", "note": "Our main registry â€” kitchenware, home, and experiences" },
    { "name": "Amazon", "url": "https://www.amazon.com/wedding/...", "note": "Everyday essentials and fun extras" }
  ]
}
Use realistic placeholder URLs. Make the message warm and personal based on the vibe.`,
    fallback: {
      enabled: true,
      message: "Your presence is the greatest gift. If you'd like to celebrate us, we've curated a few ideas.",
      cashFundUrl: 'https://www.honeyfund.com/',
      cashFundMessage: 'Contribute to our honeymoon fund',
      entries: [
        { name: 'Zola', url: 'https://www.zola.com/registry/', note: 'Our main registry' },
      ],
    },
  },

  travel: {
    schema: `A travel info object:
{
  "airports": ["JFK - John F. Kennedy International (45 min)", "LGA - LaGuardia Airport (35 min)"],
  "parkingInfo": "Complimentary parking is available on-site.",
  "directions": "Take I-95 North to Exit 12, then follow Garden Lane for 2 miles.",
  "hotels": [
    {
      "name": "The Marriott Newport",
      "address": "25 Americas Cup Ave, Newport, RI",
      "bookingUrl": "https://www.marriott.com/...",
      "groupRate": "$179/night with code SMITH2025",
      "notes": "Our recommended hotel â€” 10 min from the venue"
    },
    {
      "name": "Hampton Inn Newport",
      "address": "317 W Main Rd, Newport, RI",
      "bookingUrl": "https://www.hilton.com/...",
      "groupRate": "$149/night with code SMITH25",
      "notes": "Budget-friendly option, 15 min from venue"
    }
  ]
}`,
    fallback: {
      airports: ['JFK - John F. Kennedy (45 min)'],
      parkingInfo: 'Complimentary parking available on-site.',
      directions: 'Directions will be provided closer to the date.',
      hotels: [
        { name: 'The Grand Hotel', address: '1 Main Street', bookingUrl: '', groupRate: '', notes: 'Our recommended hotel' },
      ],
    },
  },

  faqs: {
    schema: `Array of FAQ items:
[
  { "id": "faq-1", "question": "What is the dress code?", "answer": "We'd love for you to join us in black tie attire. Semi-formal is also welcome.", "order": 0 },
  { "id": "faq-2", "question": "Are children welcome?", "answer": "We love your little ones, but our celebration is designed as an adults-only evening.", "order": 1 }
]
Return 5-7 FAQs that are genuinely useful for guests attending a wedding. Make them warm and personal.`,
    fallback: [
      { id: 'faq-1', question: 'What is the dress code?', answer: 'We invite you to dress in semi-formal attire. Think cocktail dresses or suits.', order: 0 },
      { id: 'faq-2', question: 'Will there be parking?', answer: 'Complimentary parking is available on-site.', order: 1 },
      { id: 'faq-3', question: 'Is there a shuttle service?', answer: 'Yes! A shuttle will run between the hotel and venue throughout the evening.', order: 2 },
    ],
  },
};

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { blockType, prompt, context } = await req.json();

    if (!blockType || !BLOCK_SCHEMAS[blockType]) {
      return NextResponse.json({ error: `Unknown block type: ${blockType}` }, { status: 400 });
    }

    const schema = BLOCK_SCHEMAS[blockType];

    const systemContext = [
      context?.names ? `Couple: ${context.names[0]} & ${context.names[1]}` : '',
      context?.vibe ? `Vibe: "${context.vibe}"` : '',
      context?.venue ? `Venue: ${context.venue}` : '',
      context?.date ? `Wedding Date: ${context.date}` : '',
    ].filter(Boolean).join('\n');

    const fullPrompt = `You are an AI wedding planner for Pearloom, a premium wedding website platform.
Generate a ${blockType} block for a wedding website.

${systemContext}

User request: "${prompt || `Generate a beautiful ${blockType} section`}"

Return ONLY valid JSON matching this schema (no markdown, no backticks):
${schema.schema}`;

    let parsed: unknown;
    try {
      const raw = await callGemini(fullPrompt, apiKey);
      parsed = JSON.parse(raw);
    } catch {
      console.warn(`[ai-blocks] Gemini parse failed for ${blockType}, using fallback`);
      parsed = schema.fallback;
    }

    return NextResponse.json({ blockType, data: parsed });
  } catch (err) {
    console.error('[ai-blocks] Error:', err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}

