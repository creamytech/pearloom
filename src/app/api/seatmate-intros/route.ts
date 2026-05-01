// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/seatmate-intros/route.ts
//
// POST: for each guest on a site, use AI to write a short intro
// to their seat-mates drawn from guests' notes + relationship data.
// Writes one row per guest in `seatmate_intros`.
//
// Assumes an optional `tables` payload from the host: an array of
// { label, guestIds[] }. If absent, falls back to a single table
// with everyone in it — the intros will be generic but still useful.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
  relationship_to_host?: string | null;
  side?: string | null;
  home_city?: string | null;
  notes?: string | null;
}

interface TablePayload {
  label: string;
  guestIds: string[];
}

async function generateIntrosForTable({
  apiKey,
  tableLabel,
  guests,
}: {
  apiKey: string;
  tableLabel: string;
  guests: GuestRow[];
}): Promise<Array<{ guestId: string; intro: string; seatmates: Array<{ name: string; blurb?: string }> }>> {
  const roster = guests
    .map(
      (g) =>
        `- ${g.display_name} (id:${g.id})${g.relationship_to_host ? ` — ${g.relationship_to_host}` : ''}${g.home_city ? `, from ${g.home_city}` : ''}${g.notes ? `; notes: ${g.notes}` : ''}`,
    )
    .join('\n');

  const prompt = `You're Pear — warm, editorial, brief.
Below is a single table's roster for a celebration.

Roster at ${tableLabel}:
${roster}

For each guest, write ONE intro (1–2 sentences) that tells them who they'll be sitting with. Mention 1–2 specific
shared things Pear can infer (same city, both college friends of the couple, both work in [x]). Keep the tone warm,
no exclamation marks, no clichés.

Also return seatmates: up to 3 name-and-blurb pairs per guest, each blurb 6–10 words, highlighting a shared thread.

Return ONLY valid JSON (no markdown) in this shape:
[{ "guestId": "uuid", "intro": "…", "seatmates": [{ "name": "…", "blurb": "…" }] }, …]`;

  const res = await geminiRetryFetch(`${GEMINI_PRO}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 3000 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('Not an array');
  return parsed;
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

  const { data: guestsRaw } = await supabase
    .from('pearloom_guests')
    .select('id, display_name, relationship_to_host, side, home_city, notes')
    .eq('site_id', siteId);
  const guests = (guestsRaw ?? []) as GuestRow[];
  if (!guests.length) return NextResponse.json({ error: 'No guests on this site yet' }, { status: 400 });

  const tablesPayload: TablePayload[] = Array.isArray(body?.tables) && body.tables.length > 0
    ? body.tables
    : [{ label: 'Reception', guestIds: guests.map((g) => g.id) }];

  const byId = new Map(guests.map((g) => [g.id, g]));
  const allInserts: Array<{
    site_id: string;
    guest_id: string;
    table_label: string;
    intro: string;
    seatmates: Array<{ name: string; blurb?: string }>;
  }> = [];

  for (const t of tablesPayload) {
    const roster = t.guestIds.map((id) => byId.get(id)).filter(Boolean) as GuestRow[];
    if (!roster.length) continue;
    let result: Array<{ guestId: string; intro: string; seatmates: Array<{ name: string; blurb?: string }> }> = [];
    try {
      result = await generateIntrosForTable({ apiKey, tableLabel: t.label, guests: roster });
    } catch (err) {
      console.error('[seatmate-intros]', err);
      continue;
    }
    const ix = new Map(result.map((r) => [r.guestId, r]));
    for (const g of roster) {
      const r = ix.get(g.id);
      if (!r) continue;
      allInserts.push({
        site_id: siteId,
        guest_id: g.id,
        table_label: t.label,
        intro: r.intro,
        seatmates: r.seatmates ?? [],
      });
    }
  }

  if (!allInserts.length) {
    return NextResponse.json({ error: 'No intros generated' }, { status: 502 });
  }

  // Replace any existing intros for this site via delete-then-insert.
  await supabase
    .from('seatmate_intros')
    .delete()
    .eq('site_id', siteId);
  const { error: insErr } = await supabase.from('seatmate_intros').insert(allInserts);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: allInserts.length });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const { data, error } = await supabase
    .from('seatmate_intros')
    .select('guest_id, table_label, intro, seatmates, created_at')
    .eq('site_id', siteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ intros: data ?? [] });
}
