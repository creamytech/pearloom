// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/pear-sms/route.ts
//
// POST: generate a one-sentence SMS per guest from the manifest
// (venue, time, city-specific drive tip if known) + guest RSVP.
// Writes one row per guest in `pear_sms_drafts`.
//
// GET ?siteId=xxx — list drafts.
// PATCH { id, sentAt } — mark a draft as sent (when host clicks Copy/Send).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSiteConfig } from '@/lib/db';
import { GEMINI_PRO, geminiRetryFetch } from '@/lib/memory-engine/gemini-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface GuestRow {
  id: string;
  display_name: string;
  phone?: string | null;
  home_city?: string | null;
  relationship_to_host?: string | null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const { data, error } = await supabase
    .from('pear_sms_drafts')
    .select('id, guest_id, guest_name, body, sent_at, created_at')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Include each guest's phone number via a second read.
  const { data: guestPhones } = await supabase
    .from('pearloom_guests')
    .select('id, phone')
    .eq('site_id', siteId);
  const phoneMap = new Map<string, string | null>();
  for (const g of guestPhones ?? []) phoneMap.set(g.id, g.phone ?? null);

  const drafts = (data ?? []).map((d) => ({ ...d, phone: phoneMap.get(d.guest_id) ?? null }));
  return NextResponse.json({ drafts });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  const body = await req.json().catch(() => null);
  const id: string | null = body?.id ?? null;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const sentAt = body?.sentAt === null ? null : new Date().toISOString();
  const { error } = await supabase.from('pear_sms_drafts').update({ sent_at: sentAt }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI unavailable' }, { status: 503 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const body = await req.json().catch(() => null);
  const siteId: string | null = body?.siteId ?? null;
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const cfg = await getSiteConfig(siteId).catch(() => null);
  if (!cfg?.manifest) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const { data: guestsRaw } = await supabase
    .from('pearloom_guests')
    .select('id, display_name, phone, home_city, relationship_to_host')
    .eq('site_id', siteId);
  const guests = (guestsRaw ?? []) as GuestRow[];
  if (!guests.length) return NextResponse.json({ error: 'No guests on this site yet' }, { status: 400 });

  const names = Array.isArray(cfg.names) && cfg.names.length >= 2 ? cfg.names : ['', ''];
  const occasion = (cfg.manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
  const venue = cfg.manifest?.logistics?.venue ?? '';
  const dateIso = cfg.manifest?.logistics?.date ?? '';
  const time = cfg.manifest?.logistics?.time ?? '';

  const guestsText = guests
    .map(
      (g) =>
        `- ${g.display_name} (id:${g.id})${g.home_city ? ` · from ${g.home_city}` : ''}${g.relationship_to_host ? ` · ${g.relationship_to_host}` : ''}`,
    )
    .join('\n');

  const prompt = `You're Pear — warm, specific, SMS-short.
${names.filter(Boolean).join(' & ')} are hosting a ${occasion} ${dateIso ? `on ${dateIso}` : ''} ${time ? `at ${time}` : ''} ${venue ? `at ${venue}` : ''}.

For EACH guest below, write one short SMS (120–180 chars) they'd receive the day before. Include:
- their first name
- one personal detail inferred from their city or relationship if useful
- the essential time + place
- end with a warm single line

No emojis. No ALL CAPS. No "can't wait!". Vary the wording per guest.

Guests:
${guestsText}

Return ONLY valid JSON, no markdown:
[{ "guestId": "uuid", "body": "…" }, …]`;

  const res = await geminiRetryFetch(`${GEMINI_PRO}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.75, maxOutputTokens: 3000 },
    }),
  });
  if (!res.ok) return NextResponse.json({ error: `Gemini ${res.status}` }, { status: 502 });
  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  let parsed: Array<{ guestId: string; body: string }>;
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('[pear-sms]', err);
    return NextResponse.json({ error: 'AI parse failed' }, { status: 502 });
  }

  const byId = new Map(guests.map((g) => [g.id, g]));
  const rows = parsed
    .map((r) => {
      const g = byId.get(r.guestId);
      if (!g) return null;
      const text = (r.body ?? '').trim().slice(0, 300);
      if (!text) return null;
      return {
        site_id: siteId,
        guest_id: g.id,
        guest_name: g.display_name,
        body: text,
      };
    })
    .filter(Boolean) as Array<{ site_id: string; guest_id: string; guest_name: string; body: string }>;

  if (!rows.length) return NextResponse.json({ error: 'No drafts generated' }, { status: 502 });

  // Replace prior drafts for this site.
  await supabase.from('pear_sms_drafts').delete().eq('site_id', siteId);
  const { error: insErr } = await supabase.from('pear_sms_drafts').insert(rows);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: rows.length });
}
