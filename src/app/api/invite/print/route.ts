// ─────────────────────────────────────────────────────────────
// Pearloom / api/invite/print — print-shop handoff (scaffold)
//
// Validates the PrintSpec and returns a price estimate. When the
// provider integration ships (Lob US / Gelato global), this
// route will hand the R2 key + spec to the provider's API and
// return a tracking URL. For now it echoes back a quote so the
// UI can render the full checkout flow without provider glue.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { estimateCents, type PrintSpec } from '@/lib/invite-engine/print/spec';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  let body: PrintSpec;
  try { body = (await req.json()) as PrintSpec; }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }

  if (!body.r2Key || !body.sizeInches || !body.stock || !body.quantity || !body.shipToId) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }
  if (body.quantity < 10 || body.quantity > 1000) {
    return NextResponse.json({ error: 'Order between 10 and 1000 cards.' }, { status: 400 });
  }

  const priceCents = estimateCents(body);
  return NextResponse.json({
    ok: true,
    quote: {
      priceCents,
      priceUsd: (priceCents / 100).toFixed(2),
      currency: 'USD',
      provider: 'pending',      // will become "lob" | "gelato" when wired
      etaBusinessDays: body.stock === 'cotton-letterpress' ? '7-10' : '3-5',
    },
    pending: true,
  });
}
