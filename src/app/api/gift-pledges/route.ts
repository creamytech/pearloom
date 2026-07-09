// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/gift-pledges/route.ts
//
// The honor ledger for R2-lite cash funds. Pearloom NEVER
// processes gift money — funds are the host's own P2P handles
// (manifest.registryFunds); after a guest gives directly they may
// add their gift to this thread.
//
//   POST { subdomain, guestName, amountCents?, note?, itemId? }
//        — public write from the site's fund card. Rate-limited
//          6/10min per IP. Amounts are the guest's OWN claim.
//   GET ?subdomain=xxx&public=1
//        — public aggregate: { totalCents, count, recent, items }.
//          recent carries first names + timestamps only — NO
//          individual amounts leave the aggregate. Fund-level
//          totals cover UNTIED pledges only; item-tied chip-ins
//          (group gifts) surface as per-item aggregates in
//          items: [{ itemId, totalCents, count }].
//   GET ?siteId=xxx (uuid or subdomain)
//        — host ledger view (owner-gated): full pledges with
//          amounts + notes + thanked_at for the dashboard's
//          thank-you feed.
//   PATCH { id, thanked } — owner-gated thank-you ledger stamp:
//        sets/unsets thanked_at. Drafting a note never sets it —
//        only this explicit toggle does.
//
// Subdomain → site-uuid resolution follows /api/song-requests.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cap a single shared amount at $50,000 — honor-system sanity. */
const MAX_AMOUNT_CENTS = 5_000_000;

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface PledgeRow {
  id: string;
  item_id: string | null;
  guest_name: string;
  amount_cents: number | null;
  note: string | null;
  created_at: string;
  thanked_at: string | null;
}

export async function GET(req: NextRequest) {
  // ── Public branch — aggregate only, no PII, no amounts. ─────
  const isPublic = req.nextUrl.searchParams.get('public') === '1';
  if (isPublic) {
    const subdomain = req.nextUrl.searchParams.get('subdomain')?.trim();
    if (!subdomain) return NextResponse.json({ error: 'subdomain required' }, { status: 400 });
    const supabase = sb();
    if (!supabase) return NextResponse.json({ totalCents: 0, count: 0, recent: [], items: [] });
    const { data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();
    const siteUuid = (site as { id?: string } | null)?.id;
    if (!siteUuid) return NextResponse.json({ totalCents: 0, count: 0, recent: [], items: [] });
    const { data, error } = await supabase
      .from('gift_pledges')
      .select('item_id, guest_name, amount_cents, created_at')
      .eq('site_id', siteUuid)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      console.warn('[gift-pledges] public GET error:', error.message);
      return NextResponse.json({ totalCents: 0, count: 0, recent: [], items: [] });
    }
    const rows = (data ?? []) as Array<Pick<PledgeRow, 'item_id' | 'guest_name' | 'amount_cents' | 'created_at'>>;
    /* Fund-level aggregate covers UNTIED pledges only — item-tied
       chip-ins belong to their item's progress line, not the cash
       fund's goal thread. */
    const fundRows = rows.filter((r) => !r.item_id);
    const totalCents = fundRows.reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
    /* First names only, newest 6 — the "recently woven in" strip. */
    const recent = fundRows.slice(0, 6).map((r) => ({
      firstName: (r.guest_name ?? '').trim().split(/\s+/)[0] || 'A guest',
      at: r.created_at,
    }));
    /* Per-item chip-in aggregates — powers the group-gift progress
       line on the item cards. Aggregates only, never individual
       amounts. */
    const byItem = new Map<string, { totalCents: number; count: number }>();
    for (const r of rows) {
      if (!r.item_id) continue;
      const agg = byItem.get(r.item_id) ?? { totalCents: 0, count: 0 };
      agg.totalCents += r.amount_cents ?? 0;
      agg.count += 1;
      byItem.set(r.item_id, agg);
    }
    const items = [...byItem.entries()].map(([itemId, agg]) => ({ itemId, ...agg }));
    return NextResponse.json({ totalCents, count: fundRows.length, recent, items });
  }

  // ── Host branch — owner-gated ledger with amounts. ──────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const raw = (req.nextUrl.searchParams.get('siteId') ?? '').trim();
  if (!raw) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  const siteRow = UUID_RX.test(raw)
    ? await supabase.from('sites').select('id, creator_email, site_config').eq('id', raw).maybeSingle()
    : await supabase.from('sites').select('id, creator_email, site_config').eq('subdomain', raw).maybeSingle();
  const site = siteRow.data as { id?: string; creator_email?: string; site_config?: { creator_email?: string } } | null;
  if (!site?.id) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = (site.creator_email ?? site.site_config?.creator_email ?? '').toLowerCase();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('gift_pledges')
    .select('id, item_id, guest_name, amount_cents, note, created_at, thanked_at')
    .eq('site_id', site.id)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as PledgeRow[];

  /* Resolve item names for item-tied pledges in one query. */
  const itemIds = [...new Set(rows.map((r) => r.item_id).filter((v): v is string => !!v))];
  const itemNames = new Map<string, string>();
  if (itemIds.length > 0) {
    const { data: items } = await supabase
      .from('registry_items')
      .select('id, name')
      .in('id', itemIds);
    for (const it of (items ?? []) as Array<{ id: string; name: string }>) {
      itemNames.set(it.id, it.name);
    }
  }

  return NextResponse.json({
    pledges: rows.map((r) => ({
      id: r.id,
      guestName: r.guest_name,
      amountCents: r.amount_cents,
      note: r.note,
      createdAt: r.created_at,
      thankedAt: r.thanked_at,
      itemName: r.item_id ? itemNames.get(r.item_id) ?? null : null,
    })),
  });
}

// ── PATCH — the thank-you ledger stamp (owner-gated). ─────────
// { id, thanked: boolean } → sets/unsets thanked_at. Only this
// explicit toggle writes the stamp — drafting a note never does.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { id?: string; thanked?: boolean } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  const id = (body.id ?? '').trim();
  if (!id || typeof body.thanked !== 'boolean') {
    return NextResponse.json({ error: 'id and thanked are required' }, { status: 400 });
  }

  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { data: pledge } = await supabase
    .from('gift_pledges')
    .select('site_id')
    .eq('id', id)
    .maybeSingle();
  const siteId = (pledge as { site_id?: string } | null)?.site_id;
  if (!siteId) return NextResponse.json({ error: 'Pledge not found' }, { status: 404 });

  const { data: site } = await supabase
    .from('sites')
    .select('creator_email, site_config')
    .eq('id', siteId)
    .maybeSingle();
  const siteRow = site as { creator_email?: string; site_config?: { creator_email?: string } } | null;
  const ownerEmail = (siteRow?.creator_email ?? siteRow?.site_config?.creator_email ?? '').toLowerCase();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const thankedAt = body.thanked ? new Date().toISOString() : null;
  const { error } = await supabase
    .from('gift_pledges')
    .update({ thanked_at: thankedAt })
    .eq('id', id);
  if (error) {
    console.error('[gift-pledges] PATCH thanked failed:', error);
    return NextResponse.json({ error: 'Could not update. Try again.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, thankedAt });
}

// ── POST — public "add it to the thread" write. ───────────────
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`gift-pledge:${ip}`, { max: 6, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many entries too fast. Take a breath and try again.' },
      { status: 429 },
    );
  }

  let body: {
    subdomain?: string;
    guestName?: string;
    amountCents?: number;
    note?: string;
    itemId?: string;
  } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const subdomain = (body.subdomain ?? '').trim();
  const guestName = (body.guestName ?? '').trim().slice(0, 80);
  const note = (body.note ?? '').trim().slice(0, 280) || null;
  if (!subdomain) return NextResponse.json({ ok: false, error: 'subdomain required' }, { status: 400 });
  if (!guestName) return NextResponse.json({ ok: false, error: 'A name is required.' }, { status: 400 });

  /* Amount is OPTIONAL and the guest's own claim — integer cents,
     positive, capped. Anything malformed is dropped, not erred:
     the thread matters more than the number. */
  let amountCents: number | null = null;
  if (typeof body.amountCents === 'number' && Number.isFinite(body.amountCents)) {
    const n = Math.round(body.amountCents);
    if (n > 0 && n <= MAX_AMOUNT_CENTS) amountCents = n;
  }

  const itemId = typeof body.itemId === 'string' && UUID_RX.test(body.itemId) ? body.itemId : null;

  const supabase = sb();
  if (!supabase) {
    console.log('[gift-pledges] POST (no-db):', { subdomain, guestName });
    return NextResponse.json({ ok: true, stored: false });
  }

  const { data: siteRow } = await supabase
    .from('sites')
    .select('id, creator_email, site_config')
    .eq('subdomain', subdomain)
    .maybeSingle();
  const siteUuid = (siteRow as { id?: string } | null)?.id;
  if (!siteUuid) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

  const { error } = await supabase.from('gift_pledges').insert({
    site_id: siteUuid,
    item_id: itemId,
    guest_name: guestName,
    amount_cents: amountCents,
    note,
  });
  if (error) {
    console.error('[gift-pledges] insert failed:', error);
    return NextResponse.json({ ok: false, error: 'Could not save. Try again.' }, { status: 500 });
  }

  /* The gift thread reaches the host (email audit 2026-07-08) —
     the honor ledger was silent before. Fire-and-forget. */
  void (async () => {
    try {
      const cfg = (siteRow as { site_config?: { creator_email?: string; names?: string[] } } | null)?.site_config;
      const ownerEmail = String((siteRow as { creator_email?: string } | null)?.creator_email ?? cfg?.creator_email ?? '');
      if (!ownerEmail) return;
      const names = (cfg?.names ?? []).filter(Boolean);
      const siteLabel = names.length >= 2 ? `${names[0]} & ${names[1]}` : subdomain;
      const first = guestName.split(/\s+/)[0] || 'A guest';
      const { notifyHost } = await import('@/lib/notifications/notify');
      await notifyHost(supabase, {
        siteId: siteUuid,
        siteLabel,
        ownerEmail,
        category: 'gifts',
        title: `${first} added to the gift thread`,
        body: note ?? (amountCents ? 'They shared what they gave.' : undefined),
        href: '/dashboard/registry',
        dedupeKey: `pledge:${siteUuid}:${guestName}:${Date.now()}`,
      });
    } catch (err) {
      console.warn('[gift-pledges] notify failed (non-fatal):', err);
    }
  })();

  return NextResponse.json({ ok: true, stored: true });
}
