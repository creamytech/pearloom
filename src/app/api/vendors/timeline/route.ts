// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/vendors/timeline/route.ts
// Generates a day-of wedding timeline using Gemini Flash,
// based on booked vendors and the wedding date.
// ─────────────────────────────────────────────────────────────

export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface Vendor {
  id: string;
  name: string;
  category: string;
  status: string;
  amountCents?: number;
}

interface TimelineItem {
  time: string;
  description: string;
  vendor?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { vendors, eventDate, coupleNames } = body as {
      vendors: Vendor[];
      eventDate: string;
      coupleNames: [string, string];
    };

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
    }

    const bookedVendors = (vendors || []).filter(
      (v) => v.status === 'booked' || v.status === 'paid'
    );
    const vendorList = bookedVendors
      .map((v) => `- ${v.name} (${v.category.replace(/_/g, ' ')})`)
      .join('\n');

    const prompt = `Create a detailed day-of timeline for ${coupleNames[0]} & ${coupleNames[1]}'s wedding on ${eventDate}.
Vendors booked:
${vendorList || '(No specific vendors listed)'}

Return ONLY valid JSON with no markdown, no explanation:
{ "timeline": [{ "time": "9:00 AM", "description": "Hair & makeup begins", "vendor": "Beauty Co" }] }

Include 8-15 timeline items covering the full wedding day from morning prep through the end of the reception. Use the vendor names where relevant. Keep descriptions warm and practical.`;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    const rawText = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    const cleaned = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

    let parsed: { timeline: TimelineItem[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback timeline
      parsed = {
        timeline: [
          { time: '9:00 AM', description: 'Hair & makeup begins for the wedding party' },
          { time: '12:00 PM', description: 'Lunch break for bridal party' },
          { time: '2:00 PM', description: 'Photographer arrives for bridal portraits' },
          { time: '4:00 PM', description: 'Guests begin arriving at the venue' },
          { time: '4:30 PM', description: 'Ceremony begins' },
          { time: '5:15 PM', description: 'Ceremony concludes — cocktail hour begins' },
          { time: '6:30 PM', description: 'Guests invited to reception hall for dinner' },
          { time: '7:00 PM', description: 'First dance and parent dances' },
          { time: '7:30 PM', description: 'Dinner service begins' },
          { time: '9:00 PM', description: 'Cake cutting' },
          { time: '9:30 PM', description: 'Dancing and celebration continue' },
          { time: '11:00 PM', description: 'Last dance and farewell to guests' },
        ],
      };
    }

    return NextResponse.json({ timeline: parsed.timeline || [] });
  } catch (err) {
    console.error('[vendors/timeline]', err);
    return NextResponse.json({ error: 'Failed to generate timeline' }, { status: 500 });
  }
}
