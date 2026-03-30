// POST /api/billing/webhook — handle Stripe webhook events
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { updateUserPlan, downgradeUserPlan } from '@/lib/db';

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
      const session = event.data.object;
      const email = session.customer_email;
      const planId = session.metadata?.planId || 'pro';
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.toString();
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.toString();

      if (email) {
        try {
          await updateUserPlan(email, {
            plan: planId,
            stripeCustomerId: customerId || null,
            stripeSubscriptionId: subscriptionId || null,
          });
          console.log('[Stripe] Plan upgraded:', email, planId);
        } catch (err) {
          console.error('[Stripe] Failed to update plan:', err);
        }
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.toString();

      if (customerId) {
        try {
          await downgradeUserPlan(customerId);
          console.log('[Stripe] Subscription deleted, downgraded customer:', customerId);
        } catch (err) {
          console.error('[Stripe] Failed to downgrade plan:', err);
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
