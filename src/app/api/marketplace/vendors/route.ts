// ─────────────────────────────────────────────────────────────
// Pearloom / api/marketplace/vendors/route.ts
//
// Public directory search for the Event OS vendor marketplace.
// GET ?category=&city=&minBudget=&maxBudget=&limit=
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { searchVendors } from '@/lib/event-os/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get('category') ?? undefined;
  const city = sp.get('city') ?? undefined;
  const minBudget = sp.get('minBudget');
  const maxBudget = sp.get('maxBudget');
  const limit = sp.get('limit');

  try {
    const list = await searchVendors({
      category,
      city,
      minBudget: minBudget ? Number(minBudget) : undefined,
      maxBudget: maxBudget ? Number(maxBudget) : undefined,
      limit: limit ? Math.min(Number(limit), 48) : 24,
    });
    return NextResponse.json({ vendors: list });
  } catch (err) {
    return NextResponse.json(
      { error: 'Search failed', detail: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
