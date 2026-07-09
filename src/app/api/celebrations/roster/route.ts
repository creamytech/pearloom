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
//       { ok,
//         events: [{ subdomain, occasion, title, attending, invited }],
//         totals: { events, attending, invited, guests },
//         roster: [{ firstName, status, events: [subdomain] }] }
//
// Guest counts come from public.guests (site_id = sites.id uuid,
// status), the same source the activation funnel uses.
//
// `roster` is the deduped union of guests across the caller's own
// events in the celebration — one entry per person (deduped by
// lower(email), falling back to lower(name)), carrying only their
// FIRST name, which of the celebration's events they appear on, and
// their overall status (attending wins over pending wins over
// declined). It exists to KILL the "enter guests once, copy-then-
// drift" pain by at least SHOWING the union; the heavier follow-up is
// write-back ("add this person to these other events"), which would
// insert guests rows on the sibling sites — deliberately out of scope
// here (read-only surfacing first).
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

type OverallStatus = 'attending' | 'pending' | 'declined';

interface RosterGuest {
  /** First name only — the API never returns email or full name. */
  firstName: string;
  status: OverallStatus;
  /** Subdomains of the celebration events this person appears on. */
  events: string[];
}

interface GuestRow {
  name: string | null;
  email: string | null;
  status: string | null;
}

/** Overall status precedence: coming to ANY event wins; else pending
 *  wins over declined. */
function mergeStatus(prev: OverallStatus | undefined, raw: string | null): OverallStatus {
  const next: OverallStatus =
    raw === 'attending' ? 'attending' : raw === 'declined' ? 'declined' : 'pending';
  const rank: Record<OverallStatus, number> = { attending: 3, pending: 2, declined: 1 };
  if (!prev) return next;
  return rank[next] > rank[prev] ? next : prev;
}

function firstNameOf(name: string | null, email: string | null): string {
  const n = (name ?? '').trim();
  if (n) return n.split(/\s+/)[0];
  const e = (email ?? '').trim();
  if (e) return e.split('@')[0];
  return 'Guest';
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
    return NextResponse.json({
      ok: true,
      events: [],
      totals: { events: 0, attending: 0, invited: 0, guests: 0 },
      roster: [],
    });
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

  // Deduped union across the caller's own events. Keyed by
  // lower(email), falling back to lower(name) when an email is absent
  // — the same identity heuristic the people/guest-import path uses.
  const union = new Map<string, { firstName: string; status: OverallStatus; events: Set<string> }>();

  for (const r of mine) {
    // Exact counts scoped to this site's uuid (head:true → no rows
    // shipped) stay authoritative for the headcount even past the 1k
    // default row cap; the row fetch below feeds only the union list.
    const [attendingRes, invitedRes, guestRowsRes] = await Promise.all([
      supabase.from('guests').select('id', { count: 'exact', head: true })
        .eq('site_id', r.id).eq('status', 'attending'),
      supabase.from('guests').select('id', { count: 'exact', head: true })
        .eq('site_id', r.id),
      supabase.from('guests').select('name, email, status').eq('site_id', r.id),
    ]);
    const attending = attendingRes.count ?? 0;
    const invited = invitedRes.count ?? 0;
    totalAttending += attending;
    totalInvited += invited;

    for (const g of (guestRowsRes.data ?? []) as GuestRow[]) {
      const gEmail = (g.email ?? '').toLowerCase().trim();
      const gName = (g.name ?? '').toLowerCase().trim();
      const key = gEmail ? `e:${gEmail}` : gName ? `n:${gName}` : '';
      if (!key) continue; // no identity to dedupe on — skip
      const existing = union.get(key);
      if (existing) {
        existing.status = mergeStatus(existing.status, g.status);
        existing.events.add(r.subdomain);
      } else {
        union.set(key, {
          firstName: firstNameOf(g.name, g.email),
          status: mergeStatus(undefined, g.status),
          events: new Set([r.subdomain]),
        });
      }
    }

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

  // Attending first, then pending, then declined; alphabetical within.
  const statusRank: Record<OverallStatus, number> = { attending: 0, pending: 1, declined: 2 };
  const roster: RosterGuest[] = [...union.values()]
    .map((g) => ({ firstName: g.firstName, status: g.status, events: [...g.events] }))
    .sort(
      (a, b) =>
        statusRank[a.status] - statusRank[b.status] ||
        a.firstName.localeCompare(b.firstName),
    );

  return NextResponse.json({
    ok: true,
    events,
    totals: {
      events: events.length,
      attending: totalAttending,
      invited: totalInvited,
      guests: roster.length,
    },
    roster,
  });
}
