// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/rsvp-insights/route.ts
// Aggregates RSVP data and generates AI-powered insights
// for caterers, planners, and the couple's dashboard.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

const RATE_LIMIT_INSIGHTS = { max: 10, windowMs: 60 * 60 * 1000 };

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  });
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
}

interface GuestRow {
  name: string;
  email: string | null;
  status: string;
  plus_one: boolean;
  plus_one_name: string | null;
  meal_preference: string | null;
  dietary_restrictions: string | null;
  message: string | null;
  responded_at: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit by user email
    const rateCheck = checkRateLimit(`rsvp-insights:${session.user.email}`, RATE_LIMIT_INSIGHTS);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ error: 'siteId query parameter required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify the session user owns the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('creator_email')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }
    if (site.creator_email !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all guests for this site
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('name, email, status, plus_one, plus_one_name, meal_preference, dietary_restrictions, message, responded_at')
      .eq('site_id', siteId)
      .order('responded_at', { ascending: false });

    if (guestsError) {
      console.error('[rsvp-insights] Guests query error:', guestsError);
      return NextResponse.json({ error: 'Failed to load guest data' }, { status: 500 });
    }

    const rows: GuestRow[] = guests || [];

    // ── Headcount ──────────────────────────────────────────────
    const attending = rows.filter(g => g.status === 'attending');
    const declined = rows.filter(g => g.status === 'declined');
    const pending = rows.filter(g => !g.status || g.status === 'pending');
    const plusOneCount = attending.filter(g => g.plus_one).length;

    const headcount = {
      attending: attending.length + plusOneCount,
      declined: declined.length,
      pending: pending.length,
      total: rows.length,
    };

    // ── Dietary summary ────────────────────────────────────────
    const dietarySummary: Record<string, number> = {};
    for (const g of rows) {
      if (g.dietary_restrictions) {
        const key = g.dietary_restrictions.trim().toLowerCase();
        if (key) dietarySummary[key] = (dietarySummary[key] || 0) + 1;
      }
    }

    // ── Meal summary ───────────────────────────────────────────
    const mealSummary: Record<string, number> = {};
    for (const g of rows) {
      if (g.meal_preference) {
        const key = g.meal_preference.trim().toLowerCase();
        if (key) mealSummary[key] = (mealSummary[key] || 0) + 1;
      }
    }

    // ── AI insights via Gemini ─────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
    let aiSummary = '';
    let topMessages: { name: string; message: string }[] = [];

    const guestMessages = rows
      .filter(g => g.message && g.message.trim().length > 0)
      .map(g => ({ name: g.name, message: g.message!.trim() }));

    if (apiKey && rows.length > 0) {
      // Generate caterer-ready summary
      const catererPrompt = `You are an assistant for a wedding planning platform. Given the following RSVP data, write a single concise paragraph suitable to hand to a caterer or event planner.

Headcount: ${headcount.attending} attending (including ${plusOneCount} plus-ones), ${headcount.declined} declined, ${headcount.pending} still pending, ${headcount.total} total invitations.

Dietary restrictions:
${Object.entries(dietarySummary).map(([k, v]) => `- ${k}: ${v}`).join('\n') || 'None reported'}

Meal preferences:
${Object.entries(mealSummary).map(([k, v]) => `- ${k}: ${v}`).join('\n') || 'None reported'}

Write a professional, caterer-ready paragraph summarizing this data. Be specific with numbers. Do not use markdown formatting.`;

      try {
        aiSummary = await callGemini(catererPrompt, apiKey);
      } catch (err) {
        console.error('[rsvp-insights] Gemini caterer summary error:', err);
        aiSummary = `${headcount.attending} guests confirmed (including ${plusOneCount} plus-ones), ${headcount.pending} pending, ${headcount.declined} declined.`;
      }

      // Pick top heartfelt messages
      if (guestMessages.length > 5) {
        const messagesPrompt = `Below are RSVP messages from wedding guests. Pick the 3 most heartfelt, touching, or meaningful messages. Return ONLY a JSON array of objects with "name" and "message" fields, no markdown:

${guestMessages.map((m, i) => `${i + 1}. ${m.name}: "${m.message}"`).join('\n')}`;

        try {
          const raw = await callGemini(messagesPrompt, apiKey);
          const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
          topMessages = JSON.parse(cleaned);
        } catch {
          console.warn('[rsvp-insights] Gemini message pick failed, using first 3');
          topMessages = guestMessages.slice(0, 3);
        }
      } else {
        topMessages = guestMessages;
      }
    } else {
      // No API key or no guests — provide basic summary
      aiSummary = rows.length === 0
        ? 'No RSVPs have been received yet.'
        : `${headcount.attending} guests confirmed, ${headcount.pending} pending, ${headcount.declined} declined.`;
      topMessages = guestMessages.slice(0, 3);
    }

    return NextResponse.json({
      headcount,
      dietarySummary,
      mealSummary,
      aiSummary,
      topMessages,
    });
  } catch (err) {
    console.error('[rsvp-insights] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
