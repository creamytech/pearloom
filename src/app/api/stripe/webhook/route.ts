// ──────────────────────────────────────────────────────────────
// POST /api/stripe/webhook
//
// Stripe → Pearloom event ingest. Receives:
//   - checkout.session.completed   → create payment row, mark
//                                     registry item claimed, mark
//                                     claim 'paid'
//   - charge.refunded              → mark payment refunded, restore
//                                     registry item claim
//   - payment_intent.payment_failed → mark payment failed
//
// The webhook is the SOURCE OF TRUTH for payment state — never
// trust the client redirect. Stripe retries until we 2xx, so the
// handler must be idempotent (re-running on the same event must not
// double-credit the couple).
//
// Webhook signature verification uses STRIPE_WEBHOOK_SECRET.
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe/client';

export const dynamic = 'force-dynamic';
// Stripe needs the raw body for signature verification.
export const runtime = 'nodejs';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set — refusing event');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'invalid signature';
    console.error('[stripe/webhook] signature verification failed:', msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Acknowledge so Stripe doesn't retry forever — we just can't persist.
    console.warn('[stripe/webhook] Supabase not configured — event acknowledged but not persisted');
    return NextResponse.json({ received: true, persisted: false });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'charge.refunded': {
        await handleChargeRefunded(supabase, event.data.object as Stripe.Charge);
        break;
      }
      case 'payment_intent.payment_failed': {
        await handlePaymentFailed(supabase, event.data.object as Stripe.PaymentIntent);
        break;
      }
      default:
        // Unhandled event types are fine — just log and 2xx.
        console.log('[stripe/webhook] unhandled event type:', event.type);
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error:', err);
    // Return 500 so Stripe retries.
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── Handlers ──────────────────────────────────────────────────
// Supabase client is intentionally typed as `any` here — the typed
// client's strictness fights our snake_case column writes for tables
// added by migrations (payments, registry_item_claims) that aren't
// in the generated Database type.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

async function handleCheckoutCompleted(supabase: Sb, session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const siteId = meta.siteId;
  const paymentType = meta.paymentType;

  if (!siteId || !paymentType) {
    console.warn('[stripe/webhook] checkout.session.completed missing metadata', session.id);
    return;
  }

  // Idempotency — if we already have a payment row for this session, no-op.
  const { data: existing } = await supabase
    .from('payments')
    .select('id, status')
    .eq('stripe_session_id', session.id)
    .maybeSingle();

  const amountCents = session.amount_total ?? 0;
  const feeCents = parseInt(meta.pearloomFeeCents || '0', 10) || 0;
  const netCents = parseInt(meta.netAmountCents || '0', 10) || (amountCents - feeCents);
  const payerEmail = session.customer_details?.email || session.customer_email || '';
  const payerName = meta.payerName || session.customer_details?.name || '';

  if (existing) {
    // Update status if it changed.
    if (existing.status !== 'paid') {
      await supabase
        .from('payments')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }
  } else {
    const { error: insertError } = await supabase.from('payments').insert({
      site_id: siteId,
      payer_email: payerEmail,
      payer_name: payerName || null,
      amount_cents: amountCents,
      currency: session.currency || 'usd',
      pearloom_fee_cents: feeCents,
      net_amount_cents: netCents,
      payment_type: paymentType,
      registry_item_id: meta.registryItemId || null,
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null,
      status: 'paid',
      message: meta.message || null,
      metadata: meta as unknown as Record<string, unknown>,
    });
    if (insertError) {
      console.error('[stripe/webhook] payments insert failed:', insertError.message);
      throw insertError;
    }
  }

  // Registry-specific side effects
  if (paymentType === 'registry' && meta.registryItemId) {
    const claimedQuantity = parseInt(meta.quantity || '1', 10) || 1;

    // Insert / update claim row
    await supabase.from('registry_item_claims').insert({
      registry_item_id: meta.registryItemId,
      site_id: siteId,
      payer_email: payerEmail,
      payer_name: payerName || null,
      quantity: claimedQuantity,
      amount_cents: amountCents,
      status: 'paid',
      message: meta.message || null,
    });

    // Bump quantity_claimed on the item itself + last claimer info.
    const { data: item } = await supabase
      .from('registry_items')
      .select('quantity, quantity_claimed')
      .eq('id', meta.registryItemId)
      .single();

    const currentClaimed = (item?.quantity_claimed as number) || 0;
    const newClaimed = currentClaimed + claimedQuantity;
    const totalQty = (item?.quantity as number) || 1;

    await supabase
      .from('registry_items')
      .update({
        quantity_claimed: newClaimed,
        purchased: newClaimed >= totalQty,
        claimed_by_email: payerEmail,
        claimed_by_name: payerName || null,
        claimed_at: new Date().toISOString(),
        claim_note: meta.message || null,
        payment_intent_id: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null,
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', meta.registryItemId);
  }
}

async function handleChargeRefunded(supabase: Sb, charge: Stripe.Charge) {
  const intentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id;
  if (!intentId) return;

  await supabase
    .from('payments')
    .update({ status: 'refunded', updated_at: new Date().toISOString() })
    .eq('stripe_payment_intent_id', intentId);

  // Roll back registry claim if this was a registry payment.
  const { data: payment } = await supabase
    .from('payments')
    .select('registry_item_id, payment_type')
    .eq('stripe_payment_intent_id', intentId)
    .maybeSingle();

  if (payment?.payment_type === 'registry' && payment.registry_item_id) {
    // Find the related claim and decrement
    const { data: claim } = await supabase
      .from('registry_item_claims')
      .select('id, quantity')
      .eq('registry_item_id', payment.registry_item_id)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (claim) {
      await supabase
        .from('registry_item_claims')
        .update({ status: 'refunded' })
        .eq('id', claim.id);

      const { data: item } = await supabase
        .from('registry_items')
        .select('quantity_claimed')
        .eq('id', payment.registry_item_id)
        .single();
      const currentClaimed = (item?.quantity_claimed as number) || 0;
      const newClaimed = Math.max(0, currentClaimed - ((claim.quantity as number) || 1));
      await supabase
        .from('registry_items')
        .update({
          quantity_claimed: newClaimed,
          purchased: false,
          payment_status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.registry_item_id);
    }
  }
}

async function handlePaymentFailed(supabase: Sb, intent: Stripe.PaymentIntent) {
  await supabase
    .from('payments')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('stripe_payment_intent_id', intent.id);
}
