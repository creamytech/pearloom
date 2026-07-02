// ─────────────────────────────────────────────────────────────
// Pearloom / api/print/orders — print batch listing.
//
// GET  — list the host's print_jobs (grouped client-side by
//        batch_id) for /dashboard/print.
//
// POST — GONE (410). The old direct-submission pipeline charged
//        nobody; payment is now MANDATORY before any Lob
//        submission. Callers go through /api/print/checkout,
//        which renders + prices the batch (retail, server-side),
//        applies any legacy print credit, collects payment via
//        Stripe Checkout, and only then fulfills (the Stripe
//        webhook calls lib/print-engine/fulfill).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST() {
  // Free submission must be impossible — the paid pipeline lives
  // at /api/print/checkout.
  console.warn('[print] rejected direct POST /api/print/orders — payment-gated checkout required');
  return NextResponse.json(
    {
      error: 'Direct print submission has been retired. Print orders now require payment — start at /api/print/checkout.',
      checkoutEndpoint: '/api/print/checkout',
    },
    { status: 410 },
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ jobs: [] });

  const siteSlug = req.nextUrl.searchParams.get('site');
  let q = sb
    .from('print_jobs')
    .select('id, site_id, batch_id, product, kind, size, front_url, recipient_name, status, status_detail, tracking_number, tracking_url, cost_cents, currency, created_at, mailed_at, delivered_at')
    .eq('owner_email', session.user.email.toLowerCase().trim())
    .order('created_at', { ascending: false })
    .limit(500);
  if (siteSlug) q = q.eq('site_id', siteSlug);
  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ jobs: data ?? [] });
}
