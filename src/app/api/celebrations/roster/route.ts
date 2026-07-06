// ─────────────────────────────────────────────────────────────
// Pearloom / api/celebrations/roster/route.ts
// The unified headcount across a celebration's events (GRAND-PLAN
// Phase 5). A wedding weekend is several sites (ceremony + bachelor +
// rehearsal + brunch); this rolls up the caller's OWN events in one
// celebration into a single "who's coming across the weekend" figure.
//
//   GET ?celebrationId=<legacy manifest.celebration.id>
//     → owner-gated: only the caller's own sites in that celebration
//       are counted (cross-owner aggregation is a later, membership-
//       gated concern — never leak another host's guest counts).
//       { ok, events: [{ subdomain, occasion, title, attending,
//         invited }], totals: { events, attending, invited } }
//
// Guest counts come from public.guests (site_id = sites.id uuid,
// status), the same source the activation funnel uses.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { normalizeOccasion } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface EventRoster {
  subdomain: string;
  occasion: string;
  title: string;
  attending: number;
  invited: number;
}

interface SiteRow {
  subdomain: string;
  ai_manifest: {
    celebration?: { id?: string };
    occasion?: string;
    names?: [string, string];
    seoTitle?: string;
  } | null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const celebrationId = req.nextUrl.searchParams.get('celebrationId')?.trim();
  if (!celebrationId) {
    return NextResponse.json({ ok: false, error: 'celebrationId required' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true, events: [], totals: { events: 0, attending: 0, invited: 0 } });
  }

  // The caller's OWN sites (indexed creator_email — matches GET /api/sites),
  // filtered to this celebration by the manifest id. site.id is the uuid
  // the guests rows key on.
  const { data: rows, error } = await supabase
    .from('sites')
    .select('id, subdomain, ai_manifest')
    .eq('creator_email', email);
  if (error) {
    console.error('[celebrations/roster] site read failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not load the celebration.' }, { status: 500 });
  }

  const mine = ((rows ?? []) as Array<SiteRow & { id: string }>).filter(
    (r) => r.ai_manifest?.celebration?.id === celebrationId,
  );

  const events: EventRoster[] = [];
  let totalAttending = 0;
  let totalInvited = 0;

  for (const r of mine) {
    // Counts scoped to this site's uuid. head:true → no rows shipped.
    const [attendingRes, invitedRes] = await Promise.all([
      supabase.from('guests').select('id', { count: 'exact', head: true })
        .eq('site_id', r.id).eq('status', 'attending'),
      supabase.from('guests').select('id', { count: 'exact', head: true })
        .eq('site_id', r.id),
    ]);
    const attending = attendingRes.count ?? 0;
    const invited = invitedRes.count ?? 0;
    totalAttending += attending;
    totalInvited += invited;

    const m = r.ai_manifest ?? {};
    const names = m.names;
    const title = m.seoTitle
      ?? (names?.[1] ? `${names[0]} & ${names[1]}` : names?.[0] ?? r.subdomain);
    events.push({
      subdomain: r.subdomain,
      occasion: normalizeOccasion(m.occasion),
      title,
      attending,
      invited,
    });
  }

  return NextResponse.json({
    ok: true,
    events,
    totals: { events: events.length, attending: totalAttending, invited: totalInvited },
  });
}
