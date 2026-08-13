// ─────────────────────────────────────────────────────────────
// Pearloom / api/vendor-packet/[token]/route.ts
//
// PUBLIC read side of the vendor call sheet. A vendor holding a
// packet token (minted by the host in the Vendor Book) fetches
// the read-only packet: event name + date, venue, the host's
// day-of contact (manifest.dayOfContact only — the account email
// is never exposed), their own arrival time, and the run of show.
// Shaping + the privacy contract live in src/lib/vendor-packet.ts.
//
//   GET /api/vendor-packet/{token} → { ok: true, packet } | 404
//
// No auth (the token IS the credential), IP rate-limited, cached
// a few minutes — call sheets change rarely and get refreshed on
// the day by a reload.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isPlausiblePacketToken, loadVendorPacketByToken } from '@/lib/vendor-packet';

export const dynamic = 'force-dynamic';

const CACHE_HEADER = 'public, max-age=300';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(`vendor-packet:${ip}`, { max: 30, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  const { token } = await params;
  if (!isPlausiblePacketToken(token ?? '')) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  try {
    const packet = await loadVendorPacketByToken(token);
    if (!packet) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(
      { ok: true, packet },
      { headers: { 'cache-control': CACHE_HEADER } },
    );
  } catch (e) {
    console.error('[vendor-packet] load failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: 'Could not load the call sheet.' }, { status: 500 });
  }
}
