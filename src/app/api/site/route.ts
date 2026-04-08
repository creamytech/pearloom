// ─────────────────────────────────────────────────────────────
// Pearloom / api/site/route.ts — Site config endpoint
// Returns basic site metadata (names, occasion) by siteId.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`site:${ip}`, { max: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ error: 'Missing siteId parameter' }, { status: 400 });
    }

    const config = await getSiteConfig(siteId);
    if (!config) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Return minimal site metadata — the seating page only needs names
    const manifest = config.manifest as { names?: string[]; occasion?: string } | null;
    return NextResponse.json({
      site: {
        names: manifest?.names || [],
        occasion: manifest?.occasion || 'wedding',
      },
    });
  } catch (err) {
    console.error('[api/site]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
