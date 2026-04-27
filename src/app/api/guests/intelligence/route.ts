// ─────────────────────────────────────────────────────────────
// Pearloom / api/guests/intelligence
//
// GET ?siteId=xxx (owner only)
//   Runs a lightweight analysis pass over the host's guest list
//   and returns insights:
//     • likely duplicates (Levenshtein-based name + email match)
//     • VIPs (immediate family inferred by relationship + side)
//     • plus-one mismatch (RSVP'd yes for 2 but plus_one column = 0)
//     • stale RSVPs (no response within N days of deadline)
//     • address gaps (guests without mailing addresses for Print)
//
// All deterministic — no LLM call needed for v1. The host can
// click "Apply" to merge a duplicate or "Resend" to fire off a
// follow-up via the cadence module.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { getSiteConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface GuestRow {
  id: string;
  site_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  plus_one: boolean | null;
  plus_one_count: number | null;
  plus_one_name: string | null;
  party_label: string | null;
  responded_at: string | null;
  invited_at: string | null;
  mailing_address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  side: string | null;
  relationship_to_host: string | null;
  message: string | null;
  created_at: string;
}

export interface GuestInsight {
  kind: 'duplicate' | 'vip' | 'plus-one-mismatch' | 'stale-rsvp' | 'address-gap';
  severity: 'info' | 'attention' | 'urgent';
  title: string;
  detail: string;
  guestIds: string[];
  /** Optional one-tap remediation. */
  action?: { label: string; kind: 'merge' | 'resend' | 'collect-address' };
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  const v0 = new Array(n + 1).fill(0).map((_, i) => i);
  const v1 = new Array(n + 1).fill(0);
  for (let i = 0; i < m; i += 1) {
    v1[0] = i + 1;
    for (let j = 0; j < n; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= n; j += 1) v0[j] = v1[j];
  }
  return v1[n];
}

function normalizeName(s?: string | null): string {
  return (s ?? '').trim().toLowerCase().replace(/[^a-z\s']/g, '').replace(/\s+/g, ' ');
}

function findDuplicates(guests: GuestRow[]): GuestInsight[] {
  const out: GuestInsight[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < guests.length; i += 1) {
    if (seen.has(guests[i].id)) continue;
    const a = guests[i];
    const aName = normalizeName(a.name);
    const aEmail = (a.email ?? '').trim().toLowerCase();
    const cluster: GuestRow[] = [a];
    for (let j = i + 1; j < guests.length; j += 1) {
      if (seen.has(guests[j].id)) continue;
      const b = guests[j];
      const bName = normalizeName(b.name);
      const bEmail = (b.email ?? '').trim().toLowerCase();
      if (aEmail && bEmail && aEmail === bEmail) {
        cluster.push(b); seen.add(b.id); continue;
      }
      if (aName && bName) {
        // Names within 2 edits, both > 4 chars → likely dup.
        if (Math.min(aName.length, bName.length) > 4 && levenshtein(aName, bName) <= 2) {
          cluster.push(b); seen.add(b.id);
        }
      }
    }
    if (cluster.length > 1) {
      seen.add(a.id);
      out.push({
        kind: 'duplicate',
        severity: 'attention',
        title: `${cluster.length} likely duplicates: ${cluster.map((g) => g.name || '—').join(', ')}`,
        detail: 'Same email or near-identical name. Pick a primary and Pear will merge their records (RSVP, address, dietary).',
        guestIds: cluster.map((g) => g.id),
        action: { label: 'Merge', kind: 'merge' },
      });
    }
  }
  return out;
}

const VIP_RELATIONSHIPS = new Set([
  'mother', 'father', 'mom', 'dad',
  'parent', 'parents',
  'grandmother', 'grandfather', 'grandma', 'grandpa', 'grandparents',
  'sister', 'brother', 'sibling',
  'best man', 'maid of honor', 'matron of honor', 'man of honor',
  'officiant',
]);

function findVips(guests: GuestRow[]): GuestInsight[] {
  const vips = guests.filter((g) => {
    const r = (g.relationship_to_host ?? '').toLowerCase().trim();
    return r && VIP_RELATIONSHIPS.has(r);
  });
  if (vips.length === 0) return [];
  return [{
    kind: 'vip',
    severity: 'info',
    title: `${vips.length} VIP guest${vips.length === 1 ? '' : 's'} flagged`,
    detail: 'Family + wedding party. Consider hand-addressing envelopes and confirming dietary directly. Pear will skip these from bulk follow-ups.',
    guestIds: vips.map((g) => g.id),
  }];
}

function findPlusOneMismatch(guests: GuestRow[]): GuestInsight[] {
  const out: GuestInsight[] = [];
  for (const g of guests) {
    if (g.status === 'attending') {
      const expected = (g.plus_one_count ?? 0) > 0 || g.plus_one === true || !!g.plus_one_name;
      const messageMentionsPartner = (g.message ?? '').toLowerCase().match(/\b(plus one|with my|bringing|wife|husband|partner|girlfriend|boyfriend)\b/);
      if (!expected && messageMentionsPartner) {
        out.push({
          kind: 'plus-one-mismatch',
          severity: 'attention',
          title: `${g.name ?? 'A guest'} may be bringing a +1`,
          detail: `Message: "${(g.message ?? '').slice(0, 140)}…" but plus_one_count is 0. Confirm before the seating chart locks.`,
          guestIds: [g.id],
        });
      }
    }
  }
  return out;
}

function findStale(guests: GuestRow[], rsvpDeadlineIso: string | null | undefined): GuestInsight[] {
  if (!rsvpDeadlineIso) return [];
  const deadline = new Date(rsvpDeadlineIso);
  if (Number.isNaN(deadline.getTime())) return [];
  const now = new Date();
  const daysToDeadline = (deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  // Surface the stale list when deadline is within 14 days.
  if (daysToDeadline > 14 || daysToDeadline < -7) return [];
  const stale = guests.filter((g) => {
    const status = (g.status ?? 'pending').toLowerCase();
    return status === 'pending' || status === 'invited';
  });
  if (stale.length === 0) return [];
  const severity: GuestInsight['severity'] = daysToDeadline < 7 ? 'urgent' : 'attention';
  return [{
    kind: 'stale-rsvp',
    severity,
    title: `${stale.length} guest${stale.length === 1 ? '' : 's'} haven't RSVP'd${daysToDeadline > 0 ? ` (deadline in ${Math.ceil(daysToDeadline)}d)` : ' (deadline passed)'}`,
    detail: 'Send a one-tap reminder via the cadence module. Pear has a draft ready in the host\'s voice.',
    guestIds: stale.map((g) => g.id),
    action: { label: 'Resend RSVP nudge', kind: 'resend' },
  }];
}

function findAddressGaps(guests: GuestRow[]): GuestInsight[] {
  const missing = guests.filter((g) => !g.mailing_address_line1 || !g.city || !g.postal_code);
  if (missing.length === 0) return [];
  return [{
    kind: 'address-gap',
    severity: 'info',
    title: `${missing.length} guest${missing.length === 1 ? '' : 's'} missing a mailing address`,
    detail: 'Pearloom Print can mail printed save-the-dates / invites — but not without addresses. Send guests a quick collection link.',
    guestIds: missing.map((g) => g.id),
    action: { label: 'Collect addresses', kind: 'collect-address' },
  }];
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const siteId = req.nextUrl.searchParams.get('siteId') || req.nextUrl.searchParams.get('site');
  if (!siteId) return NextResponse.json({ error: 'siteId is required.' }, { status: 400 });

  const cfg = await getSiteConfig(siteId);
  if (!cfg) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
  const ownerEmail = ((cfg as unknown as Record<string, unknown>).creator_email as string | undefined) ?? null;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Not the site owner.' }, { status: 403 });
  }

  const client = sb();
  if (!client) return NextResponse.json({ insights: [], guestCount: 0 });

  const { data, error } = await client
    .from('guests')
    .select('*')
    .eq('site_id', siteId);
  if (error) {
    console.error('[guests/intelligence]', error);
    return NextResponse.json({ insights: [], guestCount: 0 });
  }
  const guests = (data ?? []) as GuestRow[];

  const insights: GuestInsight[] = [
    ...findDuplicates(guests),
    ...findVips(guests),
    ...findPlusOneMismatch(guests),
    ...findStale(guests, cfg.manifest?.logistics?.rsvpDeadline),
    ...findAddressGaps(guests),
  ];

  return NextResponse.json({
    ok: true,
    guestCount: guests.length,
    pendingCount: guests.filter((g) => (g.status ?? 'pending').toLowerCase() !== 'attending' && (g.status ?? 'pending').toLowerCase() !== 'declined').length,
    attendingCount: guests.filter((g) => (g.status ?? '').toLowerCase() === 'attending').length,
    declinedCount: guests.filter((g) => (g.status ?? '').toLowerCase() === 'declined').length,
    insights,
  });
}

export async function POST(req: NextRequest) {
  // Stub for "Merge duplicates" — accepts { siteId, primaryId, mergeIds[] }
  // and updates the primary with non-null fields from the others, then
  // deletes the merged rows. Kept simple intentionally; the host always
  // confirms which is primary in the UI.
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  let body: { siteId?: string; primaryId?: string; mergeIds?: string[] };
  try { body = (await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!body.siteId || !body.primaryId || !Array.isArray(body.mergeIds) || body.mergeIds.length === 0) {
    return NextResponse.json({ error: 'siteId + primaryId + mergeIds required.' }, { status: 400 });
  }
  const cfg = await getSiteConfig(body.siteId);
  const ownerEmail = ((cfg as unknown as Record<string, unknown>).creator_email as string | undefined) ?? null;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Not the site owner.' }, { status: 403 });
  }
  const client = sb();
  if (!client) return NextResponse.json({ error: 'Storage not configured.' }, { status: 503 });

  const { data: rows } = await client
    .from('guests')
    .select('*')
    .eq('site_id', body.siteId)
    .in('id', [body.primaryId, ...body.mergeIds]);
  const all = (rows ?? []) as GuestRow[];
  const primary = all.find((r) => r.id === body.primaryId);
  if (!primary) return NextResponse.json({ error: 'Primary not found.' }, { status: 404 });

  const merged: Partial<GuestRow> = { ...primary };
  for (const r of all) {
    if (r.id === primary.id) continue;
    for (const k of Object.keys(r) as Array<keyof GuestRow>) {
      const cur = merged[k];
      if ((cur === null || cur === undefined || cur === '') && r[k]) {
        (merged as Record<string, unknown>)[k as string] = r[k];
      }
    }
  }
  const { id: _id, created_at: _ca, site_id: _sid, ...patchRaw } = merged as GuestRow;
  void _id; void _ca; void _sid;
  await client.from('guests').update(patchRaw).eq('id', primary.id);
  await client.from('guests').delete().in('id', body.mergeIds);
  return NextResponse.json({ ok: true });
}
