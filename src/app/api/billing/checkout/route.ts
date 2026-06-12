// ──────────────────────────────────────────────────────────────
// POST /api/billing/checkout
//
// Plan-upgrade checkout — the missing till. The plan machinery
// has existed end to end (PLAN_LIMITS enforcement in plan-gate,
// /api/billing/webhook's plan-grant branch, usePlan chrome) but
// nothing ever CREATED a plan checkout session: the landing
// page's "Choose Atelier" went to signup and the dashboard's
// plan card linked to the theme store.
//
// Body: { plan: 'atelier' | 'legacy' }.
//   atelier → $19 one-time  → canonical plan 'pro'
//   legacy  → $129 one-time → canonical plan 'premium'
//
// Metadata.planId rides to /api/billing/webhook, whose
// checkout.session.completed handler calls updateUserPlan —
// the grant NEVER trusts the redirect.
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStripe, hasStripe } from '@/lib/stripe/client';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAppOrigin } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';

/* Marketed names → canonical plan ids (plan-gate CANONICAL) +
   one-time prices. Matches the landing page's DesignPricing copy:
   Atelier $19 once per celebration, Legacy $129 lifetime. */
const PLAN_PRODUCTS: Record<string, { planId: 'pro' | 'premium'; name: string; description: string; priceCents: number }> = {
  atelier: {
    planId: 'pro',
    name: 'Pearloom Atelier',
    description: 'Every block, the premium theme shelf, and the day-of room for this celebration.',
    priceCents: 1900,
  },
  legacy: {
    planId: 'premium',
    name: 'Pearloom Legacy',
    description: 'Every future celebration, covered for life — including the Signature shelf.',
    priceCents: 12900,
  },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'Sign in to upgrade.' }, { status: 401 });
    }

    const limit = checkRateLimit(`billing-checkout:${userEmail}`, {
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
      return NextResponse.json({ error: 'Payments are not configured.' }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    const plan = typeof body?.plan === 'string' ? body.plan.toLowerCase() : '';
    const product = PLAN_PRODUCTS[plan];
    if (!product) {
      return NextResponse.json({ error: "plan must be 'atelier' or 'legacy'." }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const origin = getAppOrigin();
    /* Flat string metadata — the billing webhook's plan branch
       reads planId; kind documents intent for the dashboard. */
    const metadata: Record<string, string> = {
      kind: 'plan_upgrade',
      planId: product.planId,
      userEmail,
    };

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: product.priceCents,
            product_data: {
              name: product.name,
              description: product.description,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/profile?upgraded=${plan}`,
      cancel_url: `${origin}/dashboard/profile`,
      metadata,
      payment_intent_data: { metadata },
    });

    return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
  } catch (err) {
    console.error('[api/billing/checkout] error:', err);
    return NextResponse.json({ error: 'Checkout failed — try again.' }, { status: 500 });
  }
}
