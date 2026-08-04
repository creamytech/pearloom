// ─────────────────────────────────────────────────────────────
// GET /api/day-of/briefcase?siteId=…&guestId=…
//
// The printable sheet for the guest who will not use a phone.
// Returns print-optimised HTML (same pattern as /api/export-pdf):
// the host opens it in a tab and prints it.
//
// OWNER-GATED. This composes one named guest's own details — their
// seat, their dietary note — so only the site's owner may generate
// it. A guest cannot fetch their own (they have the passport for
// that, and this sheet exists precisely for people who won't).
//
// `guestId` is optional: without it the sheet is the generic
// "everything except your seat" version, useful for the welcome
// table.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { parseLocalDate } from '@/lib/date-utils';
import { buildBriefcase, renderBriefcaseHtml, type BriefcaseEvent } from '@/lib/day-of/briefcase';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function humanDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = parseLocalDate(iso);
    if (!d) return null;
    return d.toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkRateLimit(`briefcase:${email}:${getClientIp(req)}`, { max: 60, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const siteId = req.nextUrl.searchParams.get('siteId')?.trim();
  const guestId = req.nextUrl.searchParams.get('guestId')?.trim() || null;
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  // Owner gate — the same shape every host route uses.
  const { data: site } = await sb
    .from('sites')
    .select('id, subdomain, ai_manifest, site_config, creator_email')
    .eq('id', siteId)
    .maybeSingle();
  const row = site as {
    id: string;
    ai_manifest?: StoryManifest | null;
    site_config?: { creator_email?: string; manifest?: StoryManifest } | null;
    creator_email?: string | null;
  } | null;
  const owner = String(row?.creator_email ?? row?.site_config?.creator_email ?? '').toLowerCase().trim();
  if (!row || !owner || owner !== email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const manifest = (row.ai_manifest ?? row.site_config?.manifest ?? {}) as StoryManifest;
  const names = (manifest.names ?? []).filter(Boolean);
  const title = names.length === 2 ? `${names[0]} & ${names[1]}` : (names[0] ?? 'Your day');

  // The named guest's own details, when one was asked for.
  let guestName = '';
  let dietary: string | null = null;
  if (guestId) {
    const { data: g } = await sb
      .from('guests')
      .select('name, dietary_restrictions')
      .eq('id', guestId)
      .eq('site_id', row.id)   // scoped: never another site's guest
      .maybeSingle();
    const gr = g as { name?: string; dietary_restrictions?: string | null } | null;
    guestName = String(gr?.name ?? '').trim();
    dietary = gr?.dietary_restrictions ?? null;
  }

  const schedule: BriefcaseEvent[] = (manifest.events ?? [])
    .slice(0, 12)
    .map((e) => ({
      name: String((e as { name?: string }).name ?? ''),
      time: (e as { time?: string }).time ?? null,
      place: (e as { location?: string }).location ?? null,
    }));

  const logistics = manifest.logistics ?? {};
  const dayOf = (manifest as unknown as {
    dayOfContact?: { name?: string; phone?: string };
  }).dayOfContact;

  const sheet = buildBriefcase({
    eventTitle: title,
    dateLine: humanDate(logistics.date),
    venueName: logistics.venue ?? null,
    venueAddress: logistics.venueAddress ?? null,
    dressCode: (manifest as unknown as { dressCode?: { note?: string } }).dressCode?.note ?? null,
    gettingThere: (manifest.travelInfo as { parking?: string } | undefined)?.parking ?? null,
    dayOfContactName: dayOf?.name ?? null,
    dayOfContactPhone: dayOf?.phone ?? null,
    schedule,
    guest: { name: guestName, dietary },
  });

  return new NextResponse(renderBriefcaseHtml(sheet), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Never cached: it carries a named guest's details.
      'Cache-Control': 'private, no-store',
    },
  });
}
