// ─────────────────────────────────────────────────────────────
// Pearloom / api/marketplace/vendors/onboard/route.ts
//
// POST { vendorId } — vendor-side Stripe Connect onboarding.
// Creates an Express Connect account if missing, then returns
// an account-link URL to collect KYC details.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { getVendor, updateVendorStripeAccount } from '@/lib/event-os/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: { vendorId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.vendorId) {
    return NextResponse.json({ error: 'vendorId required' }, { status: 400 });
  }

  const vendor = await getVendor(body.vendorId);
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }
  // Only the vendor-owning email or an admin should onboard.
  if (vendor.contact_email !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  try {
    let accountId = vendor.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: vendor.contact_email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: vendor.name,
          mcc: '7299',
        },
        metadata: { vendorId: vendor.id, vendorSlug: vendor.slug },
      });
      accountId = account.id;
      await updateVendorStripeAccount(vendor.id, accountId);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/vendors/${vendor.slug}/onboard`,
      return_url: `${siteUrl}/vendors/${vendor.slug}?onboarded=1`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: link.url, accountId });
  } catch (err) {
    console.error('[marketplace/vendors/onboard]', err);
    return NextResponse.json(
      { error: 'Onboarding failed', detail: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
