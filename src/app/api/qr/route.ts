// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/qr/route.ts
// Generates a QR code PNG for a wedding site URL.
// Uses the qrcode package — no external API needed.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  try {
    // Generate as SVG string (scalable, no deps on canvas)
    const svg = await QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      width: 300,
      color: {
        dark: '#1a1a1a',
        light: '#faf9f6',
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
