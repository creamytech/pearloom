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
//        — public aggregate: { totalCents, count, recent }.
//          recent carries first names + timestamps only — NO
//          individual amounts leave the aggregate.
//   GET ?siteId=xxx (uuid or subdomain)
//        — host ledger view (owner-gated): full pledges with
//          amounts + notes for the dashboard's thank-you feed.
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
}

export async function GET(req: NextRequest) {
  // ── Public branch — aggregate only, no PII, no amounts. ─────
  const isPublic = req.nextUrl.searchParams.get('public') === '1';
  if (isPublic) {
    const subdomain = req.nextUrl.searchParams.get('subdomain')?.trim();
    if (!subdomain) return NextResponse.json({ error: 'subdomain required' }, { status: 400 });
    const supabase = sb();
    if (!supabase) return NextResponse.json({ totalCents: 0, count: 0, recent: [] });
    const { data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();
    const siteUuid = (site as { id?: string } | null)?.id;
    if (!siteUuid) return NextResponse.json({ totalCents: 0, count: 0, recent: [] });
    const { data, error } = await supabase
      .from('gift_pledges')
      .select('guest_name, amount_cents, created_at')
      .eq('site_id', siteUuid)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      console.warn('[gift-pledges] public GET error:', error.message);
      return NextResponse.json({ totalCents: 0, count: 0, recent: [] });
    }
    const rows = (data ?? []) as Array<Pick<PledgeRow, 'guest_name' | 'amount_cents' | 'created_at'>>;
    const totalCents = rows.reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
    /* First names only, newest 6 — the "recently woven in" strip. */
    const recent = rows.slice(0, 6).map((r) => ({
      firstName: (r.guest_name ?? '').trim().split(/\s+/)[0] || 'A guest',
      at: r.created_at,
    }));
    return NextResponse.json({ totalCents, count: rows.length, recent });
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
    .select('id, item_id, guest_name, amount_cents, note, created_at')
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
      itemName: r.item_id ? itemNames.get(r.item_id) ?? null : null,
    })),
  });
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
    .select('id')
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
    return NextResponse.json({ ok: false, error: 'Could not save — try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: true });
}
