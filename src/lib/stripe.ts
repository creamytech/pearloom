// src/lib/stripe.ts — Stripe client initialisation
// Requires: STRIPE_SECRET_KEY env var
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY not set — billing features disabled');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    limits: { sites: 1, photos: 50, guestbook: false, customDomain: false },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 1200, // cents
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || '',
    limits: { sites: 10, photos: 500, guestbook: true, customDomain: true },
  },
} as const;

export type PlanId = keyof typeof PLANS;
