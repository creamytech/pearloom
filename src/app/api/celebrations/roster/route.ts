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
//         events: [{ subdomain, occasion, title, attending, invited,
//                    scope, privateReason? }],
//         totals: { events, attending, invited, guests },
//         roster: [{ firstName, status, events: [subdomain] }] }
//
// Guest counts come from public.guests (site_id = sites.id uuid,
// status), the same source the activation funnel uses.
//
// `roster` is the deduped union of guests across the caller's own
// SHARED events in the celebration — one entry per person (deduped by
// lower(email), falling back to lower(name)), carrying only their
// FIRST name, which of the celebration's events they appear on, and
// their overall status (attending wins over pending wins over
// declined). It exists to KILL the "enter guests once, copy-then-
// drift" pain.
//
// PRIVACY — the shedding guard. Each event carries a roster scope
// (lib/celebration-privacy): a `private` event (bachelor/ette by
// default, or any event the host marked private) keeps its guest
// list to itself. Its guests are never fetched into the union, and
// it is never a write-back target — so one event's roster cannot
// shed into a sibling's. Its own headcount still appears: that's the
// owner's data on the owner's dashboard.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { normalizeOccasion } from '@/lib/site-urls';
import {
  rosterScopeFor,
  privateScopeReason,
  type RosterScope,
} from '@/lib/celebration-privacy';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkGuestCapacity } from '@/lib/plan-gate';
import { guestTokenColumns } from '@/lib/guest-tokens';
import { linkGuestRowToPerson } from '@/lib/people';

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
  /** Whether this event's guests feed the shared roster below.
   *  'private' events still show their own headcount to their owner
   *  — it's their data — but never contribute names to the union. */
  scope: RosterScope;
  /** Plain-language reason, present only when scope is 'private',
   *  so the UI can say why without inventing copy. */
  privateReason?: string;
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
    celebration?: { id?: string; rosterScope?: 'shared' | 'private'; linkVisible?: boolean };
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
    const m = r.ai_manifest ?? {};
    // THE SHEDDING GUARD (lib/celebration-privacy). A private event —
    // a bachelor/ette by default, or anything the host marked private
    // — keeps its guest list to itself: its names never enter the
    // cross-event union, so the container can't leak one event's
    // roster into another's. Its own headcount still shows: it's the
    // owner's data on the owner's dashboard.
    const scope = rosterScopeFor({ occasion: m.occasion, celebration: m.celebration });
    const shared = scope === 'shared';

    // Exact counts scoped to this site's uuid (head:true → no rows
    // shipped) stay authoritative for the headcount even past the 1k
    // default row cap; the row fetch below feeds only the union list —
    // and is skipped entirely for private events (never fetched, not
    // merely filtered afterwards).
    const [attendingRes, invitedRes, guestRowsRes] = await Promise.all([
      supabase.from('guests').select('id', { count: 'exact', head: true })
        .eq('site_id', r.id).eq('status', 'attending'),
      supabase.from('guests').select('id', { count: 'exact', head: true })
        .eq('site_id', r.id),
      shared
        ? supabase.from('guests').select('name, email, status').eq('site_id', r.id)
        : Promise.resolve({ data: [] as GuestRow[] }),
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

    const names = m.names;
    const title = m.seoTitle
      ?? (names?.[1] ? `${names[0]} & ${names[1]}` : names?.[0] ?? r.subdomain);
    events.push({
      subdomain: r.subdomain,
      occasion: normalizeOccasion(m.occasion),
      title,
      attending,
      invited,
      scope,
      ...(shared ? {} : { privateReason: privateScopeReason(m.occasion) }),
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

// ─────────────────────────────────────────────────────────────
// POST /api/celebrations/roster — the write-back.
//
// The other half of the shared roster. GET surfaces the union
// ("these 84 people are somewhere across your weekend"); this
// puts one of them onto the sibling events they're missing from,
// so a host enters a guest ONCE instead of copy-then-drift.
//
//   POST { celebrationId, person: { name, email? }, targets: [subdomain] }
//     → { ok, results: [{ subdomain, outcome, guestId? }] }
//
//   outcome ∈ added | already-there | private | over-limit | failed
//
// Every guard the single-add path has, applied per target:
//   • OWNERSHIP  — every target must be the caller's own site AND
//     in this celebration. An unknown or foreign subdomain 403s the
//     whole request rather than silently skipping (a caller asking
//     for someone else's site is a bug or a probe, not a partial).
//   • PRIVACY    — a private-scope event is NEVER a write-back
//     target (lib/celebration-privacy). This is the write half of
//     the shedding guard: you cannot push a wedding guest into the
//     bachelorette list through the container.
//   • CAPACITY   — checkGuestCapacity per target (plan-gate), so
//     write-back can't route around the guest cap.
//   • DEDUPE     — email first, then name, matching the importer.
//
// Partial success is normal and reported per target: one event may
// be full while another accepts, and the host should see exactly
// what happened rather than an all-or-nothing error.
// ─────────────────────────────────────────────────────────────

type WriteOutcome = 'added' | 'already-there' | 'private' | 'over-limit' | 'failed';

interface WriteResult {
  subdomain: string;
  outcome: WriteOutcome;
  guestId?: string;
  /** Present on 'private' / 'over-limit' so the UI can explain. */
  reason?: string;
}

interface PostBody {
  celebrationId?: string;
  person?: { name?: string; email?: string };
  targets?: string[];
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  if (!checkRateLimit(`celeb-roster-write:${email}`, { max: 60, windowMs: 60 * 60_000 }).allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const celebrationId = body.celebrationId?.trim();
  const personName = body.person?.name?.trim();
  const personEmail = body.person?.email?.toLowerCase().trim() || null;
  const targets = Array.isArray(body.targets)
    ? [...new Set(body.targets.map((t) => String(t).trim()).filter(Boolean))]
    : [];

  if (!celebrationId || !personName || targets.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'celebrationId, person.name and at least one target are required' },
      { status: 400 },
    );
  }
  if (targets.length > 20) {
    return NextResponse.json({ ok: false, error: 'Too many events in one request' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Not configured' }, { status: 503 });
  }

  // The caller's own sites in this celebration — the same scoping the
  // GET uses, so a target can never be a site they don't own.
  const { data: rows, error } = await supabase
    .from('sites')
    .select('id, subdomain, ai_manifest')
    .eq('creator_email', email);
  if (error) {
    console.error('[celebrations/roster] POST site read failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not load the celebration.' }, { status: 500 });
  }

  const mine = new Map<string, SiteRow & { id: string }>();
  for (const r of ((rows ?? []) as Array<SiteRow & { id: string }>)) {
    if (r.ai_manifest?.celebration?.id === celebrationId) mine.set(r.subdomain, r);
  }

  const unknown = targets.filter((t) => !mine.has(t));
  if (unknown.length > 0) {
    return NextResponse.json(
      { ok: false, error: 'One or more events are not part of this celebration.' },
      { status: 403 },
    );
  }

  const results: WriteResult[] = [];

  for (const subdomain of targets) {
    const site = mine.get(subdomain)!;
    const m = site.ai_manifest ?? {};

    // Shedding guard, write half.
    if (rosterScopeFor({ occasion: m.occasion, celebration: m.celebration }) !== 'shared') {
      results.push({
        subdomain,
        outcome: 'private',
        reason: privateScopeReason(m.occasion),
      });
      continue;
    }

    try {
      // Dedupe — email first (the stable identity), then name.
      const existing = personEmail
        ? await supabase.from('guests').select('id').eq('site_id', site.id).ilike('email', personEmail).maybeSingle()
        : await supabase.from('guests').select('id').eq('site_id', site.id).ilike('name', personName).maybeSingle();
      if (existing.data) {
        results.push({ subdomain, outcome: 'already-there', guestId: String(existing.data.id) });
        continue;
      }

      const capacity = await checkGuestCapacity(supabase, email, site.id, 1);
      if (!capacity.ok) {
        results.push({
          subdomain,
          outcome: 'over-limit',
          reason: capacity.body.error,
        });
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('guests')
        .insert({
          site_id: site.id,
          name: personName,
          email: personEmail,
          status: 'pending',
          ...guestTokenColumns(),
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (insertError || !inserted) {
        console.error('[celebrations/roster] insert failed:', subdomain, insertError?.message);
        results.push({ subdomain, outcome: 'failed' });
        continue;
      }

      // Persistent identity — same fire-and-forget link every other
      // guest writer does. Never blocks the add.
      if (personEmail) {
        void linkGuestRowToPerson(supabase, String(inserted.id), {
          email: personEmail,
          name: personName,
        });
      }

      results.push({ subdomain, outcome: 'added', guestId: String(inserted.id) });
    } catch (err) {
      console.error('[celebrations/roster] write-back error:', subdomain, err);
      results.push({ subdomain, outcome: 'failed' });
    }
  }

  return NextResponse.json({ ok: true, results });
}
