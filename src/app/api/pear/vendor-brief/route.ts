// ─────────────────────────────────────────────────────────────
// Pearloom / api/pear/vendor-brief/route.ts
//
// POST /api/pear/vendor-brief
//   body: { siteId, vendorCategory, manifest }
//   → Pear drafts a vendor brief in the host's voice (pulled from
//     Pear voice samples + memories) ready to copy into an email or
//     paste to a vendor's inquiry form.
//
// Returns: { brief: string, subject: string, questions: string[] }
//
// One Claude call. The host reviews, copies to clipboard, sends.
// We're not auto-sending email yet — that's a separate pipeline.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generate, parseJsonFromText } from '@/lib/claude/client';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { buildPearContext } from '@/lib/pear/context';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Brief {
  subject: string;
  brief: string;
  questions: string[];
}

const CATEGORIES: Record<string, { focus: string; mustAsk: string[] }> = {
  florist: {
    focus: 'Floral design — palette match, season availability, ceremony arrangement, reception centerpieces.',
    mustAsk: ['Do you take on weddings of our size?', 'What\'s your minimum spend?', 'Can you source seasonal stems?'],
  },
  caterer: {
    focus: 'Menu — match dietary needs, drink package, staffing ratio, pricing per head.',
    mustAsk: ['Tasting included?', 'Are gratuity + service in the per-head?', 'How do you handle dietary restrictions?'],
  },
  photographer: {
    focus: 'Coverage — engagement + wedding day + delivery timeline. Style match.',
    mustAsk: ['Hours of coverage?', 'Second shooter?', 'Delivery turnaround for full gallery?'],
  },
  dj: {
    focus: 'Music + emcee — must-play / do-not-play list, ceremony PA, timeline.',
    mustAsk: ['Do you provide ceremony PA?', 'How do you handle do-not-play lists?', 'Continuous music or breaks?'],
  },
  planner: {
    focus: 'Coordination — full plan vs day-of, hours, vendor ecosystem, payment cadence.',
    mustAsk: ['Day-of vs full coordination?', 'How many weddings per weekend?', 'Backup planner if you fall ill?'],
  },
  venue: {
    focus: 'Venue logistics — site fee, capacity, exclusivity, getting-ready spaces, weather plan.',
    mustAsk: ['What\'s your weather plan?', 'Do we need to use your in-house caterer?', 'When can we set up?'],
  },
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(req);
  const rl = checkRateLimit(`vendor-brief:${session.user.email}:${ip}`, {
    max: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many vendor briefs — try later.' }, { status: 429 });
  }

  let body: { siteId?: string; vendorCategory?: string; manifest?: StoryManifest } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const cat = (body.vendorCategory ?? '').toLowerCase();
  if (!CATEGORIES[cat]) return NextResponse.json({ error: 'Unknown vendor category' }, { status: 400 });
  if (!body.manifest) return NextResponse.json({ error: 'manifest required' }, { status: 400 });

  const m = body.manifest;
  const ctx = await buildPearContext({ userEmail: session.user.email, siteId: body.siteId, memoryLimit: 10, voiceLimit: 1 });
  const occ = (m as unknown as { occasion?: string }).occasion ?? 'wedding';
  const date = m.logistics?.date ?? 'TBD';
  const venue = m.logistics?.venue ?? 'TBD';
  const guestCountRaw = (m as unknown as { guestCount?: number | string }).guestCount;
  const guestCount = typeof guestCountRaw === 'number' ? guestCountRaw : guestCountRaw ?? 'TBD';
  const palette = (m as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors;

  const meta = CATEGORIES[cat];
  const prompt = [
    `Draft a ${cat} vendor inquiry email for a ${occ}.`,
    `Event date: ${date}. Venue: ${venue}. Guest count: ${guestCount}.`,
    palette ? `Palette: ${Object.values(palette).filter(Boolean).slice(0, 4).join(', ')}.` : '',
    `Vendor focus: ${meta.focus}`,
    `Required questions to include: ${meta.mustAsk.join(' · ')}`,
    'The email should sound like the host wrote it themselves — match their voice + cadence + word choices.',
    'Format: warm but to-the-point. 4–7 sentences for the body. Include a short subject line.',
    'Then list 3-5 specific questions tailored to this couple\'s situation.',
    ctx.promptBlock,
  ].filter(Boolean).join('\n\n');

  try {
    const msg = await generate({
      tier: 'sonnet',
      temperature: 0.5,
      maxTokens: 900,
      system: 'You write vendor inquiry emails for Pearloom hosts. You write in the host\'s voice — never generic. You don\'t include placeholders like [your name] — leave the sign-off empty for the host to add.',
      messages: [
        { role: 'user', content: prompt + '\n\nReturn ONLY this JSON shape, no preface, no markdown fences:\n{\n  "subject": string,\n  "brief": string,\n  "questions": [string, string, string]\n}' },
        { role: 'assistant', content: '{' },
      ],
    });
    const raw = '{' + ((msg.content[0] as { text?: string })?.text ?? '').trim();
    const parsed = parseJsonFromText<Partial<Brief>>(raw);
    const out: Brief = {
      subject: typeof parsed.subject === 'string' ? parsed.subject : `${occ} on ${date} — ${cat} inquiry`,
      brief: typeof parsed.brief === 'string' ? parsed.brief : '',
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.filter((q): q is string => typeof q === 'string').slice(0, 6)
        : meta.mustAsk,
    };
    if (!out.brief) {
      return NextResponse.json({ error: 'Pear couldn\'t draft a brief — try again.' }, { status: 502 });
    }
    return NextResponse.json({ brief: out });
  } catch (err) {
    console.error('[vendor-brief]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Brief failed' }, { status: 500 });
  }
}
