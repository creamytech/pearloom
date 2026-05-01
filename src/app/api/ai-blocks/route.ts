// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Pearloom / app/api/ai-blocks/route.ts
// AI Block Generator â€” creates rich site sections from a prompt
// Supports: venue, events, registry, travel, faqs
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { checkPlanAccess } from '@/lib/plan-gate';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

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

  // Plan gate: AI block generator is an Atelier (pro) feature
  const planAccess = await checkPlanAccess('pro');
  if (!planAccess.allowed) {
    return NextResponse.json({
      error: 'plan_required',
      requiredPlan: planAccess.requiredPlan,
      currentPlan: planAccess.currentPlan,
      upgradeUrl: planAccess.upgradeUrl,
      message: 'Upgrade to Atelier to generate AI blocks.',
    }, { status: 402 });
  }

  // Rate limit by user email
  const rateCheck = checkRateLimit(`ai-blocks:${session.user.email}`, RATE_LIMITS.aiBlocks);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before generating more blocks.' },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { blockType, prompt, context } = await req.json();

    if (!blockType || !BLOCK_SCHEMAS[blockType]) {
      return NextResponse.json({ error: `Unknown block type: ${blockType}` }, { status: 400 });
    }

    // Validate prompt length to prevent abuse
    if (prompt && typeof prompt === 'string' && prompt.length > 2000) {
      return NextResponse.json({ error: 'Prompt too long (max 2000 characters)' }, { status: 400 });
    }

    const schema = BLOCK_SCHEMAS[blockType];

    const occasion = context?.occasion || 'wedding';
    const occasionLabel = occasion === 'wedding' ? 'wedding'
      : occasion === 'anniversary' ? 'anniversary celebration'
      : occasion === 'birthday' ? 'birthday celebration'
      : occasion === 'engagement' ? 'engagement party'
      : 'celebration';

    // Detect destination/travel elements in the vibe for travel block suggestions
    const vibe = (context?.vibe || '').toLowerCase();
    const isDestination = ['destination', 'abroad', 'international', 'fly', 'flight', 'overseas', 'tropical',
      'italy', 'france', 'mexico', 'bali', 'hawaii', 'tuscany', 'paris', 'amalfi', 'santorini',
      'travel', 'journey', 'voyage'].some(kw => vibe.includes(kw));

    // Build occasion-specific guidance for the AI
    const occasionGuidance: Record<string, string> = {
      wedding: blockType === 'registry'
        ? 'This is a wedding registry. Focus on home setup, experiences, and honeymoon. Make the message celebrate the start of their shared life.'
        : blockType === 'travel' && isDestination
          ? 'This is a DESTINATION wedding — guests are traveling from afar. Include flight booking tips, area attractions, and a warm note about making it a trip. Add at least 2-3 hotel options and 1-2 airport options relevant to the destination vibe.'
          : blockType === 'faqs'
            ? 'Generate 5-7 FAQs that are genuinely useful for wedding guests. Include dress code, parking, children policy, RSVP deadline, and gift questions.'
            : '',
      anniversary: blockType === 'registry'
        ? 'This is an anniversary celebration. Suggest meaningful experiences over material goods — travel funds, spa experiences, restaurant gift cards, or a memory book service.'
        : blockType === 'faqs'
          ? 'Generate FAQs for an anniversary party — what to expect, gift suggestions, whether to bring children, parking and logistics.'
          : blockType === 'events'
            ? 'Generate events for an anniversary celebration — a dinner, a champagne toast, and a milestone tribute moment. Tone should feel like a celebration of years together.'
            : '',
      birthday: blockType === 'events'
        ? 'Generate events for a birthday celebration — arrival cocktails, dinner/gathering, and cake/toast moment. Keep the tone joyful and celebratory.'
        : blockType === 'registry'
          ? 'This is a birthday gift guide. Suggest experiences, hobbies, or wishlist items. Keep it personal and warm.'
          : '',
      engagement: blockType === 'events'
        ? 'Generate events for an engagement party — welcome cocktails, dinner announcement, and a champagne toast. Tone should be romantic and celebratory.'
        : '',
    };

    const specificGuidance = occasionGuidance[occasion] || '';

    // Inject manifest poetry/story details if available
    const poetryContext = context?.poetry ? [
      context.poetry.heroTagline ? `Site tagline: "${context.poetry.heroTagline}"` : '',
      context.poetry.rsvpIntro && blockType === 'faqs' ? `RSVP intro tone: "${context.poetry.rsvpIntro}"` : '',
    ].filter(Boolean).join('\n') : '';

    const systemContext = [
      context?.names ? `Names: ${context.names[0]} & ${context.names[1]}` : '',
      `Occasion: ${occasionLabel}`,
      context?.vibe ? `Vibe: "${context.vibe}"` : '',
      context?.venue ? `Venue: ${context.venue}` : '',
      context?.date ? `Event Date: ${context.date}` : '',
      poetryContext,
      specificGuidance,
    ].filter(Boolean).join('\n');

    const fullPrompt = `You are an AI event planner for Pearloom, a premium celebration website platform.
Generate a ${blockType} block for a ${occasionLabel} website.

${systemContext}

User request: "${prompt || `Generate a beautiful, personalized ${blockType} section for this ${occasionLabel}`}"

IMPORTANT: Make this feel genuinely specific to ${context?.names ? `${context.names[0]} & ${context.names[1]}` : 'this couple/honoree'} — not a generic template. Reference their vibe, occasion, and any details provided.

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

