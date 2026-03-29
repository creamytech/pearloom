// POST /api/billing/webhook — handle Stripe webhook events
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ received: true });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any;
      // TODO: update user's plan in DB using session.customer_email + session.metadata.planId
      console.log('[Stripe] checkout completed:', session.customer_email, session.metadata?.planId);
      break;
    }
    case 'customer.subscription.deleted': {
      // TODO: downgrade user to free plan
      console.log('[Stripe] subscription deleted');
      break;
    }
  }

  return NextResponse.json({ received: true });
}
