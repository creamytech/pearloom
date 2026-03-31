// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/rsvp-reminder/route.ts
// Generates personalized reminder email drafts for pending
// RSVP guests using the couple's voice and event details.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const RATE_LIMIT_REMINDER = { max: 5, windowMs: 60 * 60 * 1000 };

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
        temperature: 0.8,
        maxOutputTokens: 1024,
      },
    }),
  });
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit by user email
    const rateCheck = checkRateLimit(`rsvp-reminder:${session.user.email}`, RATE_LIMIT_REMINDER);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { siteId, guestIds } = body as { siteId?: string; guestIds?: string[] };

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const supabase = getSupabase();

    // Verify the session user owns the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('creator_email, manifest, names')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }
    if (site.creator_email !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract couple names and vibe from manifest
    const names: string[] = (site.names as string[]) || [];
    const manifest = (site.manifest || {}) as Record<string, unknown>;
    const vibeString = (manifest.vibeString as string) || '';
    const poetry = manifest.poetry as Record<string, string> | undefined;
    const logistics = manifest.logistics as Record<string, unknown> | undefined;
    const weddingDate = (logistics?.date as string) || '';
    const venueName = (logistics?.venue as string) || '';

    // Fetch pending guests — optionally filtered by guestIds
    let query = supabase
      .from('guests')
      .select('id, name, email')
      .eq('site_id', siteId)
      .eq('status', 'pending');

    if (guestIds && guestIds.length > 0) {
      query = query.in('id', guestIds);
    }

    const { data: pendingGuests, error: guestsError } = await query;

    if (guestsError) {
      console.error('[rsvp-reminder] Guests query error:', guestsError);
      return NextResponse.json({ error: 'Failed to load pending guests' }, { status: 500 });
    }

    const targets = pendingGuests || [];
    if (targets.length === 0) {
      return NextResponse.json(
        { draft: '', targetCount: 0, message: 'No pending guests found.' },
        { status: 200 }
      );
    }

    // Build a warm, personalized prompt
    const coupleLabel = names.length >= 2
      ? `${names[0]} & ${names[1]}`
      : names[0] || 'the couple';

    const guestNamesList = targets.map(g => g.name).join(', ');

    const prompt = `You are writing a warm, personal RSVP reminder email on behalf of ${coupleLabel} for their wedding.

Couple: ${coupleLabel}
${weddingDate ? `Wedding date: ${weddingDate}` : ''}
${venueName ? `Venue: ${venueName}` : ''}
${vibeString ? `Wedding vibe: "${vibeString}"` : ''}
${poetry?.heroTagline ? `Their tagline: "${poetry.heroTagline}"` : ''}

This email will be sent to ${targets.length} guest(s) who haven't responded yet: ${guestNamesList}.

Write the email template in the couple's voice — warm, personal, and true to their vibe. Use "{guest_name}" as a placeholder for the recipient's name.

Guidelines:
- Keep it short and sweet (3-5 short paragraphs max)
- Lead with excitement, not guilt
- Mention specific details (date, venue) naturally
- Include a gentle call to action to RSVP
- End with warmth and love
- Do NOT include a subject line — just the email body
- Do NOT use markdown formatting — write plain text with line breaks`;

    let draft: string;
    try {
      draft = await callGemini(prompt, apiKey);
    } catch (err) {
      console.error('[rsvp-reminder] Gemini error:', err);
      return NextResponse.json({ error: 'Failed to generate reminder draft' }, { status: 500 });
    }

    return NextResponse.json({
      draft,
      targetCount: targets.length,
    });
  } catch (err) {
    console.error('[rsvp-reminder] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
