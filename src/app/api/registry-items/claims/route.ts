// ──────────────────────────────────────────────────────────────
// GET /api/registry-items/claims?siteId=<uuid-or-slug>
//
// Owner-gated ledger of claims on NATIVE registry items — both
// no-payment reservations (payment_id null / status 'pending',
// written by /api/registry-items/[id]/claim in reserve mode) and
// paid Stripe purchases (written by the Stripe webhook). Feeds the
// combined recent-activity feed on /dashboard/registry alongside
// registry_link_claims (link-out stores).
//
// Each row carries kind: 'reserved' | 'paid' so the dashboard can
// chip them without re-deriving payment semantics client-side.
//
// PATCH { id, thanked: boolean } — the thank-you ledger stamp
// (owner-gated). Sets/unsets thanked_at; drafting a note never
// writes it — only the host's explicit toggle does.
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = checkRateLimit(`registry-item-claims:${email.toLowerCase()}`, { max: 30, windowMs: 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
    }

    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ claims: [] });

    // Resolve slug → uuid (same contract as /api/registry-items).
    let siteUuid = siteId;
    if (!UUID_RX.test(siteId)) {
      const { data } = await supabase.from('sites').select('id').eq('subdomain', siteId).maybeSingle();
      siteUuid = (data as { id?: string } | null)?.id ?? '';
    }
    if (!siteUuid) return NextResponse.json({ claims: [] });

    // Owner check — case-insensitive, IdP casing variance.
    const { data: site } = await supabase
      .from('sites')
      .select('creator_email')
      .eq('id', siteUuid)
      .maybeSingle();
    const creator = String((site as { creator_email?: string } | null)?.creator_email ?? '').toLowerCase().trim();
    if (!site || creator !== email.toLowerCase().trim()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: rows, error } = await supabase
      .from('registry_item_claims')
      .select('id, registry_item_id, payer_email, payer_name, quantity, amount_cents, payment_id, status, message, created_at, thanked_at')
      .eq('site_id', siteUuid)
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) {
      console.warn('[api/registry-items/claims] GET error:', error.message);
      return NextResponse.json({ claims: [] });
    }

    // Resolve item names in one pass so the feed can say what was
    // spoken for without a per-row join.
    const itemIds = Array.from(new Set((rows ?? []).map((r) => r.registry_item_id as string).filter(Boolean)));
    const names = new Map<string, string>();
    if (itemIds.length > 0) {
      const { data: items } = await supabase
        .from('registry_items')
        .select('id, name')
        .in('id', itemIds);
      for (const it of (items ?? []) as Array<{ id: string; name: string }>) {
        names.set(it.id, it.name);
      }
    }

    const claims = (rows ?? []).map((r) => ({
      id: r.id as string,
      itemId: r.registry_item_id as string,
      itemName: names.get(r.registry_item_id as string) ?? 'A registry item',
      payerName: (r.payer_name as string | null) ?? null,
      payerEmail: (r.payer_email as string) || '',
      quantity: (r.quantity as number) || 1,
      amountCents: (r.amount_cents as number) || 0,
      status: (r.status as string) || 'pending',
      message: (r.message as string | null) ?? null,
      createdAt: r.created_at as string,
      thankedAt: (r.thanked_at as string | null) ?? null,
      /* payment_id present (or status paid) = a Stripe purchase;
         otherwise it's a reserve-and-link reservation. */
      kind: (r.payment_id || r.status === 'paid' ? 'paid' : 'reserved') as 'paid' | 'reserved',
    }));

    return NextResponse.json({ claims });
  } catch (err) {
    console.error('[api/registry-items/claims] GET unhandled:', err);
    return NextResponse.json({ claims: [] });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { id?: string; thanked?: boolean } = {};
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }
    const id = (body.id ?? '').trim();
    if (!id || typeof body.thanked !== 'boolean') {
      return NextResponse.json({ error: 'id and thanked are required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

    // Look up the claim's site to check ownership before touching it.
    const { data: claim } = await supabase
      .from('registry_item_claims')
      .select('site_id')
      .eq('id', id)
      .maybeSingle();
    const siteUuid = (claim as { site_id?: string } | null)?.site_id;
    if (!siteUuid) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });

    const { data: site } = await supabase
      .from('sites')
      .select('creator_email')
      .eq('id', siteUuid)
      .maybeSingle();
    const creator = String((site as { creator_email?: string } | null)?.creator_email ?? '').toLowerCase().trim();
    if (!site || creator !== email.toLowerCase().trim()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const thankedAt = body.thanked ? new Date().toISOString() : null;
    const { error } = await supabase
      .from('registry_item_claims')
      .update({ thanked_at: thankedAt })
      .eq('id', id);
    if (error) {
      console.error('[api/registry-items/claims] PATCH error:', error.message);
      return NextResponse.json({ error: 'Could not update' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, thankedAt });
  } catch (err) {
    console.error('[api/registry-items/claims] PATCH unhandled:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
