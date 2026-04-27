// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/qr/route.ts
// Generates a themed QR code SVG for any URL.
// Accepts `color` and `bg` query params for couple-matched branding.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`qr:${ip}`, { max: 20, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const url = searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  // Theme-match the QR to the couple's accent + background colours
  const darkColor  = searchParams.get('color') || '#2B2B2B';
  const lightColor = searchParams.get('bg')    || '#F5F1E8';

  try {
    const svg = await QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      width: 300,
      color: {
        dark:  darkColor,
        light: lightColor,
      },
    });

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[QR] Error:', err);
    return NextResponse.json({ error: 'QR generation failed' }, { status: 500 });
  }
}
