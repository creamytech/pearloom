// ──────────────────────────────────────────────────────────────
// POST /api/store/checkout
//
// Theme-Store cart checkout. Body: { packIds: string[] }.
//
//   1. Auth-gate via getServerSession → require session.user.email.
//   2. Rate-limit 10/hour per user.
//   3. Resolve packs against the catalog (lib/theme-store/packs).
//   4. Drop free packs (no Stripe charge — caller hits /apply-free).
//   5. Drop already-owned packs (no double-charge).
//   6. If the remaining set is empty, 400 — nothing to charge for.
//   7. Build a single Stripe Checkout Session with one line_item
//      per pack (so the receipt shows each pack by name).
//   8. Metadata.kind = 'theme_pack_purchase' so the existing
//      shared /api/stripe/webhook can dispatch to the entitlements
//      grant path instead of the registry / cash-gift paths.
//   9. Return { url } — client redirects.
//
// The webhook (api/stripe/webhook) is what actually writes
// entitlements. Never trust the redirect for grant.
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStripe, hasStripe } from '@/lib/stripe/client';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAppOrigin } from '@/lib/site-urls';
import { getPackById } from '@/lib/theme-store/packs';
import { userOwnsPack } from '@/lib/theme-store/entitlements';

export const dynamic = 'force-dynamic';

const MAX_PACKS_PER_CHECKOUT = 25;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'Sign in to purchase packs.' }, { status: 401 });
    }

    const limit = checkRateLimit(`store-checkout:${userEmail}`, {
      max: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many checkout attempts — try again later.' },
        { status: 429 },
      );
    }

    if (!hasStripe()) {
      return NextResponse.json(
        { error: 'Payments are not configured.' },
        { status: 503 },
      );
    }

    const body = await request.json().catch(() => null);
    const packIds: unknown = body?.packIds;
    if (!Array.isArray(packIds) || packIds.length === 0) {
      return NextResponse.json({ error: 'packIds[] is required' }, { status: 400 });
    }
    if (packIds.length > MAX_PACKS_PER_CHECKOUT) {
      return NextResponse.json(
        { error: `Too many packs in one checkout (max ${MAX_PACKS_PER_CHECKOUT}).` },
        { status: 400 },
      );
    }

    // Dedupe + validate string ids + resolve against catalog.
    const requested = Array.from(
      new Set(packIds.filter((id): id is string => typeof id === 'string')),
    );

    const resolved = requested
      .map((id) => getPackById(id))
      .filter((p): p is NonNullable<ReturnType<typeof getPackById>> => Boolean(p));

    if (resolved.length === 0) {
      return NextResponse.json({ error: 'No valid packs in cart.' }, { status: 400 });
    }

    // Filter free packs — caller should apply those via /apply-free.
    const paidPacks = resolved.filter((p) => p.tier !== 'free' && p.priceCents > 0);

    // Filter already-owned packs — no double-charge.
    const ownership = await Promise.all(
      paidPacks.map(async (p) => ({ pack: p, owned: await userOwnsPack(userEmail, p.id) })),
    );
    const toPurchase = ownership.filter((o) => !o.owned).map((o) => o.pack);

    if (toPurchase.length === 0) {
      return NextResponse.json(
        { error: 'All packs in your cart are free or already owned.' },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const origin = getAppOrigin();
    const successUrl = `${origin}/store/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/store?checkout=cancelled`;

    // Build flat string-only metadata (Stripe requirement).
    const purchasedIds = toPurchase.map((p) => p.id);
    const metadata: Record<string, string> = {
      kind: 'theme_pack_purchase',
      // Pearloom's shared webhook reads `paymentType` to dispatch;
      // keep both keys aligned so neither path mis-classifies this.
      paymentType: 'theme_pack_purchase',
      userEmail,
      packIds: JSON.stringify(purchasedIds),
    };

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: toPurchase.map((p) => ({
        price_data: {
          currency: 'usd',
          unit_amount: p.priceCents,
          product_data: {
            name: p.name,
            description: p.blurb,
          },
        },
        quantity: 1,
      })),
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      payment_intent_data: { metadata },
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
      packIds: purchasedIds,
    });
  } catch (err) {
    console.error('[api/store/checkout] error:', err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
