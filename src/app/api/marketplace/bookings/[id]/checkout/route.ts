// ─────────────────────────────────────────────────────────────
// Pearloom / api/marketplace/bookings/[id]/checkout/route.ts
//
// POST — create a Stripe Checkout session for a booking deposit.
// If the vendor has a Stripe Connect account we route payment via
// destination charge with an application_fee_amount equal to the
// pre-computed pearloom_fee. Otherwise we capture to the platform
// account and the fee is represented implicitly.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import {
  getVendor,
  getVendorBooking,
  updateVendorBooking,
} from '@/lib/event-os/db';
import { applicationFeeFor } from '@/lib/event-os/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!stripe) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const booking = await getVendorBooking(id);
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (booking.owner_email !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const deposit = booking.deposit_cents ?? booking.total_cents;
  if (!deposit || deposit < 100) {
    return NextResponse.json(
      { error: 'Booking missing deposit amount (min $1.00)' },
      { status: 400 },
    );
  }

  const vendor = await getVendor(booking.vendor_id);
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const applicationFee = applicationFeeFor(deposit, booking.pearloom_fee_cents);

  try {
    const paymentIntentData: Record<string, unknown> = {
      metadata: { kind: 'vendor_booking', bookingId: booking.id, vendorId: vendor.id },
    };
    if (vendor.stripe_account_id) {
      paymentIntentData.application_fee_amount = applicationFee;
      paymentIntentData.transfer_data = { destination: vendor.stripe_account_id };
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: session.user.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: deposit,
          product_data: {
            name: `Deposit — ${vendor.name}`,
            description: `Pearloom booking deposit for ${vendor.category}`,
          },
        },
      }],
      success_url: `${siteUrl}/dashboard/day-of?booking=${booking.id}&paid=1`,
      cancel_url: `${siteUrl}/dashboard/day-of?booking=${booking.id}&canceled=1`,
      metadata: {
        kind: 'vendor_booking',
        bookingId: booking.id,
        vendorId: vendor.id,
      },
      payment_intent_data: paymentIntentData,
    });

    // Remember the session id on the booking for reconciliation
    await updateVendorBooking(booking.id, {
      stripe_payment_intent_id: typeof checkout.payment_intent === 'string'
        ? checkout.payment_intent
        : null,
    });

    return NextResponse.json({ url: checkout.url, sessionId: checkout.id });
  } catch (err) {
    console.error('[marketplace/bookings/checkout]', err);
    return NextResponse.json(
      { error: 'Checkout failed', detail: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
