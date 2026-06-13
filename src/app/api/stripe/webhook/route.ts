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
import { addEntitlement } from '@/lib/theme-store/entitlements';
import { getPackById } from '@/lib/theme-store/packs';
import { fulfillPrintIntent, type PrintOrderIntent } from '@/lib/print-engine/fulfill';

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
      case 'checkout.session.expired': {
        await handleCheckoutExpired(supabase, event.data.object as Stripe.Checkout.Session);
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

  // Pearloom Print orders — payment-gated Lob fulfillment. Keyed
  // by the intent row created in /api/print/checkout. Dispatch
  // BEFORE the siteId guard like theme packs (user-keyed, not a
  // site-scoped gift).
  if (meta.printIntentId) {
    await handlePrintOrderPaid(supabase, session);
    return;
  }

  // Theme-Store pack purchases live outside the site-scoped payments
  // table (they're user-keyed entitlements, not site-keyed gifts).
  // Dispatch here BEFORE the siteId guard so the shared webhook
  // path works for both flows without duplicating signature
  // verification.
  if (meta.kind === 'theme_pack_purchase' || paymentType === 'theme_pack_purchase') {
    await handleThemePackPurchase(session);
    return;
  }

  // Plan upgrades (Atelier / Legacy) from /api/billing/checkout —
  // user-keyed like packs, dispatched before the siteId guard.
  // /api/billing/webhook carries the same grant; handling it here
  // too means the grant works whichever webhook endpoint the
  // Stripe account points at.
  if (meta.kind === 'plan_upgrade' && meta.planId) {
    const email = session.customer_email || meta.userEmail;
    if (email) {
      try {
        const { updateUserPlan } = await import('@/lib/db');
        await updateUserPlan(email, {
          plan: meta.planId,
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
          stripeSubscriptionId: null,
        });
        console.log('[stripe/webhook] plan upgraded:', email, meta.planId);
      } catch (err) {
        console.error('[stripe/webhook] plan grant failed:', err);
      }
    }
    return;
  }

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

  // Track the payment row id so the registry-claim row can link back
  // via payments.id (the claim row's payment_id FK). Without this
  // link the refund handler can't find which claim to roll back.
  let paymentId: string | null = existing?.id ?? null;

  if (existing) {
    // Update status if it changed.
    if (existing.status !== 'paid') {
      await supabase
        .from('payments')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('payments')
      .insert({
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
      })
      .select('id')
      .single();
    if (insertError) {
      console.error('[stripe/webhook] payments insert failed:', insertError.message);
      throw insertError;
    }
    paymentId = inserted?.id ?? null;
  }

  // Registry-specific side effects.
  //
  // Two-layer idempotency on the claim row:
  //   (a) pre-check by stripe_session_id (fast path — most retries
  //       hit this after the first webhook succeeded)
  //   (b) catch unique-violation (Postgres 23505) on insert in case
  //       two webhook deliveries race past the pre-check
  // Without this, concurrent retries would double-insert the claim
  // and double-bump registry_items.quantity_claimed — the gift
  // would read as twice-claimed even though only one guest paid.
  if (paymentType === 'registry' && meta.registryItemId) {
    const claimedQuantity = parseInt(meta.quantity || '1', 10) || 1;

    // (a) Already processed this Stripe session?
    const { data: existingClaim } = await supabase
      .from('registry_item_claims')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();
    if (existingClaim) {
      // The first webhook delivery already inserted the claim and
      // bumped quantity_claimed; this retry is a no-op.
      return;
    }

    // (b) Insert with the unique stripe_session_id; if another
    // concurrent delivery beat us to it, the partial unique index
    // will reject with 23505 and we treat it the same as (a).
    const { error: claimError } = await supabase
      .from('registry_item_claims')
      .insert({
        registry_item_id: meta.registryItemId,
        site_id: siteId,
        payer_email: payerEmail,
        payer_name: payerName || null,
        quantity: claimedQuantity,
        amount_cents: amountCents,
        payment_id: paymentId,
        stripe_session_id: session.id,
        status: 'paid',
        message: meta.message || null,
      });
    if (claimError) {
      // Postgres unique-violation = a concurrent webhook delivery
      // beat us to it. Benign — bail without bumping quantity.
      if ((claimError as { code?: string }).code === '23505') {
        return;
      }
      console.error('[stripe/webhook] registry_item_claims insert failed:', claimError.message);
      throw claimError;
    }

    // Bump quantity_claimed on the item itself + last claimer info.
    // Safe to run only because the unique index above guaranteed we
    // are the single webhook delivery that succeeded in inserting
    // the claim for this Stripe session.
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

// ── Theme-Store pack purchases ────────────────────────────────
//
// Parses metadata.packIds (JSON-stringified array set by
// /api/store/checkout) and grants one entitlement per pack via
// the service-role-backed addEntitlement(). Idempotent — the
// upsert in addEntitlement is keyed by stripe_session_id, so
// retries are a no-op.
//
// Skips packs that aren't in the catalog or are free-tier
// (those are implicit ownership — no row needed). Throws on
// DB error so Stripe retries.

async function handleThemePackPurchase(session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const userEmail = meta.userEmail || session.customer_details?.email || session.customer_email;
  if (!userEmail) {
    console.warn('[stripe/webhook] theme_pack_purchase missing userEmail', session.id);
    return;
  }

  let packIds: string[] = [];
  try {
    const parsed = JSON.parse(meta.packIds || '[]');
    if (Array.isArray(parsed)) {
      packIds = parsed.filter((x): x is string => typeof x === 'string');
    }
  } catch (err) {
    console.error('[stripe/webhook] theme_pack_purchase bad packIds JSON:', err);
    return;
  }

  if (packIds.length === 0) {
    console.warn('[stripe/webhook] theme_pack_purchase no packIds', session.id);
    return;
  }

  const amountTotal = session.amount_total ?? 0;
  // Per-pack amount: in mixed-price carts we'd need to look up
  // line items; the per-pack catalog price is the source of truth
  // anyway, so prefer that. Falls back to even split if catalog
  // misses (defensive — shouldn't happen).
  for (const packId of packIds) {
    const pack = getPackById(packId);
    if (!pack) {
      console.warn('[stripe/webhook] theme_pack_purchase unknown packId:', packId);
      continue;
    }
    if (pack.tier === 'free') {
      // Free packs don't need a row — implicit ownership.
      continue;
    }
    const perPackAmount = pack.priceCents || Math.round(amountTotal / packIds.length);
    // addEntitlement upserts on stripe_session_id; for multi-pack
    // sessions we synthesise per-pack ids so each pack gets its own
    // row (otherwise the second pack would collide on the unique
    // index and be skipped).
    const perPackSessionKey = packIds.length === 1 ? session.id : `${session.id}:${packId}`;
    await addEntitlement(userEmail, packId, perPackSessionKey, perPackAmount);
  }
}

// ── Pearloom Print orders ─────────────────────────────────────
//
// Payment is settled → mark the intent 'paid' and run Lob
// fulfillment. Idempotency is a conditional status transition:
// only the delivery that flips awaiting_payment → paid fulfills;
// retries and concurrent deliveries see status !== 'awaiting_payment'
// (or an empty conditional update) and no-op with a 200, so cards
// are never mailed twice.
//
// Fulfillment failures do NOT throw — payment state is already
// recorded, and a Stripe retry could not re-fulfill (the intent is
// no longer awaiting_payment). The intent goes 'failed' with
// detail instead, surfaced via [print] logs + the dashboard.

async function handlePrintOrderPaid(supabase: Sb, session: Stripe.Checkout.Session) {
  const intentId = session.metadata?.printIntentId;
  if (!intentId) return;

  const { data: intent, error: loadErr } = await supabase
    .from('print_order_intents')
    .select('*')
    .eq('id', intentId)
    .maybeSingle();
  if (loadErr) {
    console.error('[print] webhook intent load failed:', loadErr.message);
    throw loadErr; // 500 → Stripe retries
  }
  if (!intent) {
    console.warn('[print] webhook: intent not found for session', session.id, intentId);
    return;
  }
  if (intent.status === 'paid' || intent.status === 'fulfilled') {
    // Retry after a successful (or in-flight) delivery — no-op.
    return;
  }
  if (intent.status !== 'awaiting_payment') {
    console.warn(`[print] webhook: intent ${intentId} in unexpected status '${intent.status}' — skipping`);
    return;
  }

  // Conditional transition: exactly one delivery wins the claim.
  const { data: claimed, error: claimErr } = await supabase
    .from('print_order_intents')
    .update({ status: 'paid' })
    .eq('id', intentId)
    .eq('status', 'awaiting_payment')
    .select('id');
  if (claimErr) {
    console.error('[print] webhook: could not mark intent paid:', claimErr.message);
    throw claimErr; // 500 → Stripe retries
  }
  if (!claimed || claimed.length === 0) {
    // A concurrent delivery raced us past the pre-check — benign.
    return;
  }

  console.log(`[print] intent ${intentId} paid via session ${session.id} — fulfilling`);
  try {
    await fulfillPrintIntent({ ...(intent as PrintOrderIntent), status: 'paid' });
  } catch (err) {
    console.error(`[print] fulfillment crashed for intent ${intentId}:`, err);
    await supabase
      .from('print_order_intents')
      .update({
        status: 'failed',
        status_detail: err instanceof Error ? err.message : 'Fulfillment crashed.',
      })
      .eq('id', intentId);
    // Deliberately no throw — see header comment.
  }
}

async function handleCheckoutExpired(supabase: Sb, session: Stripe.Checkout.Session) {
  const intentId = session.metadata?.printIntentId;
  if (!intentId) return;
  const { error } = await supabase
    .from('print_order_intents')
    .update({ status: 'expired', status_detail: 'Checkout session expired without payment.' })
    .eq('id', intentId)
    .eq('status', 'awaiting_payment');
  if (error) {
    console.error('[print] could not expire intent', intentId, error.message);
  }
}
