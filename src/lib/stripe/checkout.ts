// ──────────────────────────────────────────────────────────────
// Stripe Checkout Session helpers.
//
// We use Stripe-hosted Checkout (not Stripe Elements) so we don't
// have to handle card input UI ourselves. Guests click "Pay $X" →
// Stripe redirect → return to a thank-you page. The webhook is
// what actually marks payments as paid in our DB.
// ──────────────────────────────────────────────────────────────

import type Stripe from 'stripe';
import { getStripe, calculateFeeCents, calculateNetCents } from './client';

export interface CreateCheckoutInput {
  /** Display title at the top of the Stripe checkout page. */
  productName: string;
  /** Optional product image (registry item photo). */
  productImage?: string;
  /** Smallest currency unit (e.g. cents). */
  amountCents: number;
  currency?: string;
  /** Where Stripe redirects after successful payment. */
  successUrl: string;
  /** Where Stripe redirects if guest cancels. */
  cancelUrl: string;
  /** Pre-filled email so the receipt is automatic. */
  customerEmail?: string;
  /** Metadata stored on the Stripe Session — read by the webhook
   *  to update our DB. Keep keys short, values strings. */
  metadata: {
    siteId: string;
    paymentType: 'registry' | 'cash_gift' | 'template_subscription' | 'tip';
    /** Set when paymentType === 'registry'. */
    registryItemId?: string;
    /** Optional message from payer to couple. */
    message?: string;
    /** Pre-filled payer name. */
    payerName?: string;
    /** Quantity claimed when paymentType === 'registry' and item allows partial claims. */
    quantity?: string;
  };
}

export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe is not configured — set STRIPE_SECRET_KEY');
  }

  // Build metadata as flat string-only record (Stripe requirement).
  const metadata: Record<string, string> = {
    siteId: input.metadata.siteId,
    paymentType: input.metadata.paymentType,
    pearloomFeeCents: String(calculateFeeCents(input.amountCents)),
    netAmountCents: String(calculateNetCents(input.amountCents)),
  };
  if (input.metadata.registryItemId) metadata.registryItemId = input.metadata.registryItemId;
  if (input.metadata.message) metadata.message = input.metadata.message.slice(0, 500);
  if (input.metadata.payerName) metadata.payerName = input.metadata.payerName.slice(0, 200);
  if (input.metadata.quantity) metadata.quantity = input.metadata.quantity;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: input.currency || 'usd',
          unit_amount: input.amountCents,
          product_data: {
            name: input.productName,
            images: input.productImage ? [input.productImage] : undefined,
          },
        },
        quantity: 1,
      },
    ],
    customer_email: input.customerEmail,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata,
    payment_intent_data: { metadata },
  });

  return session;
}
