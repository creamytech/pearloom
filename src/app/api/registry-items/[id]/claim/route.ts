// ──────────────────────────────────────────────────────────────
// POST /api/registry-items/[id]/claim
//
// Public endpoint. A guest clicks "I'll get this" on a registry
// item. We:
//   1. Validate the item exists, is native (source_id null), has
//      remaining quantity, and the requested quantity fits.
//   2. Build a Stripe Checkout Session for amount = price * qty.
//   3. Return { url } so the client can redirect.
//
// The webhook is what marks the item claimed and inserts the
// payment row — NOT this endpoint. Until the webhook fires the
// item stays 'unpaid'.
//
// Anti-abuse: 6 claim-attempts per IP per hour.
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasStripe } from '@/lib/stripe/client';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getAppOrigin } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const ip = getClientIp(request);
    const limit = checkRateLimit(`registry-claim:${ip}`, { max: 6, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many claims — try again in a few minutes.' },
        { status: 429 },
      );
    }

    if (!hasStripe()) {
      return NextResponse.json(
        { error: 'Payments are not configured for this site.' },
        { status: 503 },
      );
    }

    const body = await request.json();
    const {
      payerEmail,
      payerName,
      quantity = 1,
      message = '',
    } = body || {};

    if (!payerEmail || typeof payerEmail !== 'string') {
      return NextResponse.json({ error: 'payerEmail is required' }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return NextResponse.json({ error: 'quantity must be 1–99' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    const { data: item, error: itemError } = await supabase
      .from('registry_items')
      .select('id, site_id, source_id, name, description, price, image_url, quantity, quantity_claimed, purchased')
      .eq('id', id)
      .maybeSingle();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    if (item.source_id) {
      return NextResponse.json(
        { error: 'This item is hosted on an external store. Use its link instead.' },
        { status: 400 },
      );
    }
    const totalQty = (item.quantity as number) || 1;
    const claimedQty = (item.quantity_claimed as number) || 0;
    if (claimedQty + quantity > totalQty) {
      return NextResponse.json(
        { error: `Only ${totalQty - claimedQty} left to claim.` },
        { status: 409 },
      );
    }
    const price = Number(item.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Item price not set' }, { status: 400 });
    }
    const amountCents = Math.round(price * quantity * 100);

    const origin = getAppOrigin();
    const successUrl = `${origin}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/sites/${item.site_id}/registry?cancelled=1`;

    const session = await createCheckoutSession({
      productName: item.name as string,
      productImage: (item.image_url as string) || undefined,
      amountCents,
      currency: 'usd',
      successUrl,
      cancelUrl,
      customerEmail: payerEmail,
      metadata: {
        siteId: item.site_id as string,
        paymentType: 'registry',
        registryItemId: item.id as string,
        message,
        payerName,
        quantity: String(quantity),
      },
    });

    // Mark item as 'pending' so the UI shows it's being purchased.
    // The webhook will flip it to 'paid' on success or back to
    // 'unpaid' if it never completes.
    await supabase
      .from('registry_items')
      .update({ payment_status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', item.id);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[api/registry-items/claim] error:', err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
