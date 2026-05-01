// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/memory-weave/route.ts
//
// POST: generate a personalized memory prompt for each guest of a site,
// based on the couple's story chapters (who's mentioned, shared moments)
// and the guest's metadata (relationship to host, side, etc.).
// Writes one row per guest to `memory_prompts`.
//
// GET ?siteId=xxx: list the prompts + responses for the host.
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
  relationship_to_host?: string | null;
  side?: string | null;
  home_city?: string | null;
  notes?: string | null;
}

async function geminiGeneratePrompts({
  apiKey,
  chaptersText,
  guestsText,
  coupleNames,
  occasion,
  voice,
}: {
  apiKey: string;
  chaptersText: string;
  guestsText: string;
  coupleNames: [string, string];
  occasion: string;
  voice: string;
}): Promise<Array<{ name: string; prompt: string }>> {
  const prompt = `You are Pear, a warm editorial assistant for Pearloom.
${coupleNames.filter(Boolean).join(' & ')} are hosting a ${occasion}. Tone: ${voice}.

Below are their story chapters. For each guest in the list, write ONE short memory prompt (1–2 sentences)
that invites them to share a specific moment they might have with this person/couple. Draw from the
chapters when the guest is clearly mentioned or plausibly involved. If there's no obvious connection,
write a generic-but-warm prompt that fits the relationship (e.g., "a favourite meal you shared").

Rules:
- 1–2 sentences per prompt.
- Address the guest by first name.
- No clichés ("tie the knot"), no exclamation marks.
- Specific beats general.
- For memorial/funeral occasions: invite a single memory of the person being remembered.

Story chapters:
${chaptersText || '(none yet)'}

Guests:
${guestsText}

Return ONLY a valid JSON array, no markdown:
[{ "name": "First Last", "prompt": "…" }, …]
One object per guest, in the same order.`;

  const res = await geminiRetryFetch(`${GEMINI_PRO}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('Not an array');
  return parsed as Array<{ name: string; prompt: string }>;
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
    .select('id, display_name, relationship_to_host, side, home_city, notes')
    .eq('site_id', siteId);
  const guests = (guestsRaw ?? []) as GuestRow[];
  if (!guests.length) {
    return NextResponse.json({ error: 'No guests on this site yet' }, { status: 400 });
  }

  const chaptersText = (cfg.manifest.chapters ?? [])
    .map((c, i) => `(${i + 1}) ${c.title}${c.subtitle ? ` — ${c.subtitle}` : ''}: ${c.description}`)
    .join('\n');

  const guestsText = guests
    .map(
      (g) =>
        `- ${g.display_name}${g.relationship_to_host ? ` (${g.relationship_to_host})` : ''}${g.side ? ` [${g.side}]` : ''}${g.home_city ? ` · ${g.home_city}` : ''}${g.notes ? ` — ${g.notes}` : ''}`,
    )
    .join('\n');

  const names: [string, string] = Array.isArray(cfg.names) && cfg.names.length >= 2
    ? [cfg.names[0], cfg.names[1]]
    : [
        (cfg.manifest.coupleId ?? '').split(/[-_]/)[0] ?? '',
        (cfg.manifest.coupleId ?? '').split(/[-_]/)[1] ?? '',
      ];

  const occasion = (cfg.manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
  const voice =
    occasion === 'memorial' || occasion === 'funeral'
      ? 'solemn and warm'
      : occasion === 'bachelor-party' || occasion === 'bachelorette-party'
        ? 'playful'
        : 'celebratory';

  let generated: Array<{ name: string; prompt: string }>;
  try {
    generated = await geminiGeneratePrompts({
      apiKey,
      chaptersText,
      guestsText,
      coupleNames: names,
      occasion,
      voice,
    });
  } catch (err) {
    console.error('[memory-weave]', err);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
  }

  // Match by name (fuzzy — first-name prefix) and insert/replace prompts.
  const nameIndex = new Map<string, string>();
  for (const g of generated) {
    const key = (g.name ?? '').trim().toLowerCase().split(' ')[0] ?? '';
    if (key) nameIndex.set(key, g.prompt);
  }

  const rows = guests.map((g) => {
    const key = (g.display_name ?? '').trim().toLowerCase().split(' ')[0] ?? '';
    const prompt = nameIndex.get(key) ?? `${g.display_name.split(' ')[0]}, share one favourite memory.`;
    return {
      site_id: siteId,
      guest_id: g.id,
      guest_name: g.display_name,
      prompt,
    };
  });

  // Replace existing prompts for this site — one per guest.
  await supabase.from('memory_prompts').delete().eq('site_id', siteId).is('response', null);
  const { error: insErr } = await supabase.from('memory_prompts').insert(rows);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: rows.length });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const { data, error } = await supabase
    .from('memory_prompts')
    .select('id, guest_id, guest_name, prompt, response, responded_at, used_in_toast, used_in_reel, created_at')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prompts: data ?? [] });
}
