// ──────────────────────────────────────────────────────────────
// POST /api/cash-gift
//
// Public endpoint. A guest sends a cash gift to a couple. We:
//   1. Validate amount (min $5, max $25,000) + payer email.
//   2. Build a Stripe Checkout Session for the amount.
//   3. Return { url } so the client can redirect.
//
// The webhook (api/stripe/webhook) is what creates the payment row.
// Pearloom takes a 3% platform fee (PEARLOOM_FEE_BPS) — couples get
// the net amount when we payout.
//
// Anti-abuse: 6 attempts per IP per hour.
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { hasStripe } from '@/lib/stripe/client';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getAppOrigin } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';

const MIN_AMOUNT_CENTS = 500;       // $5.00
const MAX_AMOUNT_CENTS = 2_500_000; // $25,000.00

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`cash-gift:${ip}`, { max: 6, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many gift attempts — try again later.' },
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
      siteId,
      amountCents,
      payerEmail,
      payerName,
      message = '',
      label = 'Cash gift',
    } = body || {};

    if (!siteId || typeof siteId !== 'string') {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }
    if (!payerEmail || typeof payerEmail !== 'string') {
      return NextResponse.json({ error: 'payerEmail is required' }, { status: 400 });
    }
    if (!Number.isInteger(amountCents) || amountCents < MIN_AMOUNT_CENTS || amountCents > MAX_AMOUNT_CENTS) {
      return NextResponse.json(
        { error: `Amount must be between $5 and $25,000.` },
        { status: 400 },
      );
    }

    const origin = getAppOrigin();
    const successUrl = `${origin}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/sites/${siteId}?cashGift=cancelled`;

    const session = await createCheckoutSession({
      productName: typeof label === 'string' && label.trim() ? label.trim().slice(0, 80) : 'Cash gift',
      amountCents,
      currency: 'usd',
      successUrl,
      cancelUrl,
      customerEmail: payerEmail,
      metadata: {
        siteId,
        paymentType: 'cash_gift',
        message,
        payerName,
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[api/cash-gift] error:', err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
