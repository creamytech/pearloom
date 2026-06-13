// ─────────────────────────────────────────────────────────────
// /api/guests/draft-nudge — Pear writes a reminder email.
//
// Used by the "X opened the invite but haven't replied" nudge
// in DashGuests. Hosts open the modal, Pear drafts a 3-4
// sentence reminder grounded in the manifest (couple, date,
// venue, RSVP deadline) so the host can send it as-is or tweak.
//
// No site state is mutated here. The Pear gate + 30/h rate
// limit applies — drafts are cheap but a host hammering the
// button burns quota.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, checkPearGate } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

const RATE_LIMIT = { max: 30, windowMs: 60 * 60 * 1000 };

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { blocked } = await checkPearGate(session.user.email);
  if (blocked) return blocked;

  const rl = checkRateLimit(`draft-nudge:${session.user.email}`, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many drafts — try again in an hour.' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Pear isn\'t connected to a model on this server.' }, { status: 503 });
  }

  let body: { siteId?: string; pendingCount?: number } = {};
  try { body = await req.json(); } catch { /* tolerate empty body */ }
  const siteIdRaw = body.siteId;
  if (!siteIdRaw) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  const pendingCount = Math.max(1, Number(body.pendingCount ?? 1));

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  // Resolve siteId → row + ownership check.
  const siteQuery = UUID_RX.test(siteIdRaw)
    ? sb.from('sites').select('id, subdomain, ai_manifest, site_config, creator_email').eq('id', siteIdRaw)
    : sb.from('sites').select('id, subdomain, ai_manifest, site_config, creator_email').eq('subdomain', siteIdRaw);
  const { data: site } = await siteQuery.maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = (site as { creator_email?: string }).creator_email?.toLowerCase();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const manifest = (site as { ai_manifest?: { logistics?: { date?: string; venue?: string; rsvpDeadline?: string }; names?: [string, string]; occasion?: string } }).ai_manifest ?? {};
  const names = (manifest.names ?? []).filter(Boolean);
  const couple = names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] ?? 'us');
  const occasion = manifest.occasion ?? 'celebration';
  const venue = manifest.logistics?.venue ?? '';
  const rsvpDeadline = manifest.logistics?.rsvpDeadline ?? '';
  const eventDate = manifest.logistics?.date ?? '';

  const prompt = `You're Pear, helping a host write a friendly reminder email to guests who opened the invite but haven't RSVP'd yet.

Context:
- Couple/host: ${couple}
- Occasion: ${occasion}
- Event date: ${eventDate || '(not set)'}
- Venue: ${venue || '(not set)'}
- RSVP deadline: ${rsvpDeadline || '(not set)'}
- Pending count: ${pendingCount} ${pendingCount === 1 ? 'guest' : 'guests'}

Write a short, warm reminder body (NOT including subject, greeting, or signature):
- 3-4 sentences max
- First-person plural ("we", "our")
- Reference the venue or date if known — generic reads as form-letter
- Mention the deadline if set
- End with a clear "tap to RSVP" nudge
- No "kindly respond" stiffness, no "we'd love" cliché
- Lower-case sentences only when the host's vibe is casual; sentence case otherwise

Output ONLY the body text, no quotes, no markdown.`;

  const upstream = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
    }),
  });
  if (!upstream.ok) {
    return NextResponse.json({ error: `Pear couldn't draft (${upstream.status})` }, { status: 502 });
  }
  const data = await upstream.json();
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  let cleaned = raw.trim().replace(/^["']|["']$/g, '');
  if (!cleaned) {
    cleaned = `Just a quick note — we'd love to know if you can join us for ${eventDate || 'the day'}${
      venue ? ` at ${venue}` : ''
    }. Tap the link to let us know either way${rsvpDeadline ? ` by ${rsvpDeadline}` : ''}.`;
  }
  return NextResponse.json({ body: cleaned });
}
