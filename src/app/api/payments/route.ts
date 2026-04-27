// ──────────────────────────────────────────────────────────────
// GET /api/payments?siteId=...
//
// Couple-only — returns the payment ledger for a site so the
// dashboard's PaymentsPanel can show "who bought what / who sent
// cash gifts" with totals.
//
// Returns paid + pending + refunded in one call; the UI groups them.
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ payments: [], totals: { gross: 0, net: 0, fee: 0, count: 0 } });
    }

    // Ownership check
    const { data: site } = await supabase
      .from('sites')
      .select('creator_email')
      .eq('id', siteId)
      .maybeSingle();
    if (!site || site.creator_email !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[api/payments] GET error:', error.message);
      return NextResponse.json({ payments: [], totals: { gross: 0, net: 0, fee: 0, count: 0 } });
    }

    const rows = (data || []).map((row) => ({
      id: row.id as string,
      payerEmail: row.payer_email as string,
      payerName: (row.payer_name as string) || null,
      amountCents: row.amount_cents as number,
      currency: row.currency as string,
      pearloomFeeCents: (row.pearloom_fee_cents as number) ?? 0,
      netAmountCents: (row.net_amount_cents as number) ?? row.amount_cents,
      paymentType: row.payment_type as 'registry' | 'cash_gift' | 'template_subscription' | 'tip',
      registryItemId: (row.registry_item_id as string) || null,
      status: row.status as 'pending' | 'paid' | 'failed' | 'refunded',
      message: (row.message as string) || null,
      createdAt: row.created_at as string,
    }));

    // Tally only paid rows
    const paid = rows.filter((r) => r.status === 'paid');
    const totals = {
      gross: paid.reduce((sum, r) => sum + r.amountCents, 0),
      net: paid.reduce((sum, r) => sum + r.netAmountCents, 0),
      fee: paid.reduce((sum, r) => sum + r.pearloomFeeCents, 0),
      count: paid.length,
    };

    return NextResponse.json({ payments: rows, totals });
  } catch (err) {
    console.error('[api/payments] GET unhandled:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
