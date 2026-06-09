// ─────────────────────────────────────────────────────────────
// Pearloom / api/print/checkout — pay first, then mail.
//
// Suite Phase 6. Replaces the old free-submission behavior of
// POST /api/print/orders (that route now 410s).
//
// POST body — same shape /api/print/orders accepted:
//   {
//     siteSlug, kind, product, size?, svg, guestIds?, returnAddress
//   }
//
// Flow:
//   1. Auth + ownership (creator_email match) + rate limit.
//   2. Resolve recipients server-side; count ONLY guests with a
//      complete mailing address — that's the priced set, frozen
//      onto the intent as guest_ids.
//   3. Compute the RETAIL total (lib/print-engine/pricing) and
//      apply remaining legacy print credit, capped at the total.
//      EVERY number is computed here — client figures are display
//      only and never trusted.
//   4. Render SVG → 300dpi PNG → R2 NOW (lib/print-engine/render)
//      so the artwork is frozen before payment.
//   5. amount due = 0 (credit covers it) → intent inserted as
//      'paid', fulfilled inline, returns { ok, fulfilled: true }.
//   6. amount due > 0 → intent inserted 'awaiting_payment' + one
//      Stripe Checkout session ("{Kind} — {N} cards mailed"),
//      metadata.printIntentId links the webhook back. Returns
//      { ok, checkoutUrl }. Fulfillment happens ONLY in the
//      webhook after checkout.session.completed.
//
// GET — credit + price sheet for the dashboard composer:
//   { ok, creditRemainingCents, legacyCreditCents, prices }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAppOrigin } from '@/lib/site-urls';
import { getStripe, hasStripe } from '@/lib/stripe/client';
import { hasLobKey, type LobAddress } from '@/lib/print-engine/lob-client';
import { renderPrintArtwork } from '@/lib/print-engine/render';
import { fulfillPrintIntent, type PrintOrderIntent } from '@/lib/print-engine/fulfill';
import {
  RETAIL_PRINT_PRICES,
  LEGACY_PRINT_CREDIT_CENTS,
  retailPrintPriceCents,
  retailPrintUnitCents,
  legacyCreditRemainingCents,
  type PrintProduct,
  type PostcardSize,
} from '@/lib/print-engine/pricing';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface Body {
  siteSlug: string;
  kind: 'save-the-date' | 'invitation' | 'thankyou' | 'memorial-program' | 'photo-book';
  product: 'postcard' | 'letter' | 'thankyou' | 'book';
  size?: '4x6' | '6x9' | '6x11';
  svg: string;
  guestIds?: string[];
  returnAddress: LobAddress;
}

const KIND_LABELS: Record<Body['kind'], string> = {
  'save-the-date': 'Save the date',
  invitation: 'Invitation',
  thankyou: 'Thank-you card',
  'memorial-program': 'Memorial program',
  'photo-book': 'Photo book',
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const creditRemainingCents = await legacyCreditRemainingCents(session.user.email);
  return NextResponse.json({
    ok: true,
    creditRemainingCents,
    legacyCreditCents: LEGACY_PRINT_CREDIT_CENTS,
    prices: RETAIL_PRINT_PRICES,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const userEmail = session.user.email.toLowerCase().trim();

  const limit = checkRateLimit(`print-checkout:${userEmail}`, {
    max: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many checkout attempts — try again later.' },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.siteSlug || !body.svg || !body.kind || !body.product) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }
  if (!body.returnAddress?.address_line1) {
    return NextResponse.json({ error: 'Return address is required for mailing.' }, { status: 400 });
  }

  const sb = getServiceClient();
  if (!sb) {
    return NextResponse.json(
      { error: 'Print storage backend is not configured on this server.' },
      { status: 503 },
    );
  }

  // ── Ownership check ──
  const { data: site, error: siteErr } = await sb
    .from('site_config')
    .select('creator_email, site_id')
    .eq('site_id', body.siteSlug)
    .maybeSingle();
  if (siteErr || !site) {
    return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
  }
  // Case-insensitive owner check — IdP casing variance otherwise
  // 403s the legitimate owner. Matches /api/sites/[domain].
  if (String(site.creator_email ?? '').toLowerCase().trim() !== userEmail) {
    return NextResponse.json({ error: 'Not the site owner.' }, { status: 403 });
  }

  if (!hasLobKey()) {
    return NextResponse.json(
      { error: 'Pearloom Print is offline — LOB_API_KEY is not configured on this server.' },
      { status: 503 },
    );
  }

  const product = body.product as PrintProduct;
  const size = (body.size ?? '4x6') as PostcardSize;

  // ── Resolve recipients server-side ──
  // Only guests with a COMPLETE mailing address are priced — the
  // host is never charged for a card we can't mail.
  let q = sb
    .from('guests')
    .select('id, mailing_address_line1, city, state, postal_code')
    .eq('site_id', body.siteSlug)
    .not('mailing_address_line1', 'is', null);
  if (Array.isArray(body.guestIds) && body.guestIds.length > 0) {
    q = q.in('id', body.guestIds);
  }
  const { data: guests, error: guestErr } = await q;
  if (guestErr) {
    console.error('[print] checkout guest lookup failed:', guestErr.message);
    return NextResponse.json({ error: 'Could not load the guest list.' }, { status: 500 });
  }
  const mailable = (guests ?? []).filter(
    (g) => g.mailing_address_line1 && g.city && g.state && g.postal_code,
  );
  if (mailable.length === 0) {
    return NextResponse.json(
      { error: 'No recipients with complete mailing addresses on file. Collect addresses first.' },
      { status: 400 },
    );
  }
  const recipientCount = mailable.length;
  const recipientIds = mailable.map((g) => g.id as string);

  // ── Server-side money math ──
  const retailTotalCents = retailPrintPriceCents(product, size, recipientCount);
  const creditAvailable = await legacyCreditRemainingCents(session.user.email);
  const creditAppliedCents = Math.min(creditAvailable, retailTotalCents);
  const amountDueCents = retailTotalCents - creditAppliedCents;

  // If money is owed, fail BEFORE rendering when Stripe is absent.
  if (amountDueCents > 0 && !hasStripe()) {
    return NextResponse.json(
      { error: 'Payments are not configured on this server — print checkout is unavailable.' },
      { status: 503 },
    );
  }

  // ── Render + stage artwork NOW (frozen before payment) ──
  const batchId = `print-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const art = await renderPrintArtwork({
    svg: body.svg,
    size,
    siteSlug: body.siteSlug,
    batchId,
  });
  if (!art.ok) {
    return NextResponse.json(
      {
        error: art.stage === 'render'
          ? 'Could not render the design — please try again.'
          : 'Could not stage the artwork for printing.',
      },
      { status: 500 },
    );
  }

  // ── Create the intent row ──
  const intentInsert = {
    user_email: userEmail,
    site_id: body.siteSlug,
    kind: body.kind,
    product,
    size,
    front_url: art.frontUrl,
    guest_ids: recipientIds,
    return_address: body.returnAddress,
    recipient_count: recipientCount,
    retail_total_cents: retailTotalCents,
    credit_applied_cents: creditAppliedCents,
    amount_due_cents: amountDueCents,
    status: amountDueCents === 0 ? 'paid' : 'awaiting_payment',
  };
  const { data: intent, error: intentErr } = await sb
    .from('print_order_intents')
    .insert(intentInsert)
    .select('*')
    .single();
  if (intentErr || !intent) {
    console.error('[print] intent insert failed:', intentErr?.message);
    return NextResponse.json(
      { error: 'Could not record the order — nothing was charged.' },
      { status: 500 },
    );
  }

  // ── Fully covered by legacy credit → fulfill inline ──
  if (amountDueCents === 0) {
    console.log(`[print] intent ${intent.id} fully covered by legacy credit (${creditAppliedCents}¢) — fulfilling inline`);
    const result = await fulfillPrintIntent(intent as PrintOrderIntent);
    return NextResponse.json({
      ok: true,
      fulfilled: true,
      intentId: intent.id,
      batchId: intent.id,
      submitted: result.submitted,
      failed: result.failed,
      retailTotalCents,
      creditAppliedCents,
      amountDueCents: 0,
      recipientCount,
      frontUrl: art.frontUrl,
      ...(result.ok ? {} : { error: result.detail }),
    });
  }

  // ── Stripe Checkout for the remainder ──
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Payments are not configured on this server — print checkout is unavailable.' },
      { status: 503 },
    );
  }

  const origin = getAppOrigin();
  const kindLabel = KIND_LABELS[body.kind] ?? 'Print order';
  const perCard = retailPrintUnitCents(product, size);
  const metadata: Record<string, string> = {
    kind: 'print_order',
    paymentType: 'print_order',
    printIntentId: intent.id,
    userEmail,
    siteSlug: body.siteSlug,
  };

  let checkoutSession;
  try {
    checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: session.user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountDueCents,
            product_data: {
              name: `${kindLabel} — ${recipientCount} cards mailed`,
              description: creditAppliedCents > 0
                ? `${recipientCount} × $${(perCard / 100).toFixed(2)} retail, $${(creditAppliedCents / 100).toFixed(2)} legacy print credit applied`
                : `${recipientCount} × $${(perCard / 100).toFixed(2)} printed and mailed via Pearloom Print`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/print?order=success`,
      cancel_url: `${origin}/dashboard/print?order=cancelled`,
      metadata,
      payment_intent_data: { metadata },
    });
  } catch (err) {
    console.error('[print] Stripe session creation failed:', err);
    await sb
      .from('print_order_intents')
      .update({ status: 'failed', status_detail: 'Stripe session creation failed.' })
      .eq('id', intent.id)
      .eq('status', 'awaiting_payment');
    return NextResponse.json(
      { error: 'Could not start checkout — nothing was charged.' },
      { status: 500 },
    );
  }

  const { error: linkErr } = await sb
    .from('print_order_intents')
    .update({ stripe_session_id: checkoutSession.id })
    .eq('id', intent.id);
  if (linkErr) {
    // The webhook keys off metadata.printIntentId, so a missing
    // session link is recoverable — log loudly and continue.
    console.error('[print] could not store stripe_session_id on intent', intent.id, linkErr.message);
  }

  return NextResponse.json({
    ok: true,
    checkoutUrl: checkoutSession.url,
    intentId: intent.id,
    retailTotalCents,
    creditAppliedCents,
    amountDueCents,
    recipientCount,
  });
}
