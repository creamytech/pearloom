// ──────────────────────────────────────────────────────────────
// GET /api/payments/success?session_id=cs_...
//
// Stripe redirects guests here after a successful payment. We:
//   1. Look up the session to confirm it was real.
//   2. Redirect to a friendly site-scoped thank-you page.
//
// We do NOT mutate state here — the webhook is the source of truth.
// This is purely the visitor-friendly redirect.
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { getAppOrigin } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = getAppOrigin();
  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.redirect(`${origin}/?paymentError=missing-session`);
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.redirect(`${origin}/?paymentError=not-configured`);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const siteId = (session.metadata?.siteId as string) || '';
    const paymentType = (session.metadata?.paymentType as string) || '';

    // Friendly thank-you page parameters — the public site can show
    // a soft confirmation banner.
    const params = new URLSearchParams();
    params.set('thanks', '1');
    params.set('type', paymentType);
    if (session.amount_total) params.set('amount', String(session.amount_total));

    if (siteId) {
      return NextResponse.redirect(`${origin}/sites/${siteId}?${params.toString()}`);
    }
    return NextResponse.redirect(`${origin}/?${params.toString()}`);
  } catch (err) {
    console.error('[api/payments/success] error:', err);
    return NextResponse.redirect(`${origin}/?paymentError=lookup-failed`);
  }
}
