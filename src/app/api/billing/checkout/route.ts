// POST /api/billing/checkout — create a Stripe Checkout session
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { stripe, PLANS } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });
    }

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await req.json();
    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan || plan.price === 0) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: session.user.email,
      line_items: [{ price: 'stripePriceId' in plan ? plan.stripePriceId : '', quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgraded=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
      metadata: { planId },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error('[billing/checkout]', err);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
