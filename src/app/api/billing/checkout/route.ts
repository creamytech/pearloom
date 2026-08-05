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
// Body: { plan: 'pass' | 'keepsake' } (the retired 'atelier' /
// 'legacy' names still resolve, at current prices).
//   pass     → $89 one-time  → canonical plan 'pro'
//   keepsake → $199 one-time → canonical plan 'premium'
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
import { PLAN_PRICE_CENTS } from '@/lib/plan-gate';

export const dynamic = 'force-dynamic';

/* Marketed names → canonical plan ids (plan-gate CANONICAL) +
   one-time prices. Matches the landing page's DesignPricing copy:
   Pass $89 once per celebration, Keepsake $199 for the long view.
   Prices come from plan-gate so the till and the gate can't drift.

   The retired Journal/Atelier/Legacy names stay accepted as aliases
   so an in-flight client (or a stale bookmark) never 400s — they
   resolve to the same canonical plan at the current price. */
interface PlanProduct {
  planId: 'pro' | 'premium';
  name: string;
  description: string;
  priceCents: number;
}

const PASS: PlanProduct = {
  planId: 'pro',
  name: 'Pearloom Pass',
  description: 'The whole celebration: every linked event, co-hosts, 500 guests, the full Studio, and the day-of room.',
  priceCents: PLAN_PRICE_CENTS.pro,
};

const KEEPSAKE: PlanProduct = {
  planId: 'premium',
  name: 'Pearloom Keepsake',
  description: 'Everything in the Pass, kept: unlimited full-resolution media, the memory book, and the long view.',
  priceCents: PLAN_PRICE_CENTS.premium,
};

const PLAN_PRODUCTS: Record<string, PlanProduct> = {
  pass: PASS,
  keepsake: KEEPSAKE,
  // Retired marketing names — same canonical plans, current prices.
  atelier: PASS,
  legacy: KEEPSAKE,
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
        { error: 'Too many checkout attempts. Try again later.' },
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
      return NextResponse.json({ error: "plan must be 'pass' or 'keepsake'." }, { status: 400 });
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
    return NextResponse.json({ error: 'Checkout failed. Try again.' }, { status: 500 });
  }
}
