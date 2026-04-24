// ─────────────────────────────────────────────────────────────
// Pearloom / api/venue/map/route.ts
//
// GET /api/venue/map?q=<address>&w=600&h=360&tone=cream
//   → streams a Pearloom-styled Google Static Maps PNG for the
//     address, keeping the API key server-side.
//
// When GOOGLE_MAPS_STATIC_API_KEY isn't configured the route 404s
// so the renderer falls back to the hand-drawn SVG.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Pearloom map style — muted olive + cream, hides POI labels so the
// ornament reads as editorial not utilitarian.
const PEARLOOM_STYLE: string[] = [
  'feature:all|element:labels|visibility:off',
  'feature:poi|element:geometry|visibility:simplified',
  'feature:landscape|element:geometry|color:0xE9E0C6',
  'feature:landscape.natural|element:geometry|color:0xD7CCE5|visibility:simplified',
  'feature:water|element:geometry|color:0xB7A4D0',
  'feature:road|element:geometry.fill|color:0xF5EFE2',
  'feature:road|element:geometry.stroke|color:0xCBD29E',
  'feature:administrative|element:geometry.stroke|color:0xCBD29E',
  'feature:transit|visibility:off',
  'feature:poi|visibility:simplified',
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const w = clampSize(searchParams.get('w'), 600, 100, 640);
  const h = clampSize(searchParams.get('h'), 360, 100, 640);
  const zoom = clampSize(searchParams.get('zoom'), 14, 1, 20);
  if (!q) return NextResponse.json({ error: 'q (address) is required' }, { status: 400 });

  const key = process.env.GOOGLE_MAPS_STATIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'Static Maps not configured' },
      { status: 404 },
    );
  }

  const params = new URLSearchParams();
  params.set('center', q);
  params.set('zoom', String(zoom));
  params.set('size', `${w}x${h}`);
  params.set('scale', '2'); // retina
  params.set('maptype', 'roadmap');
  params.set('markers', `color:0x3D4A1F|${q}`);
  for (const s of PEARLOOM_STYLE) params.append('style', s);
  params.set('key', key);

  const url = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      return NextResponse.json({ error: `Maps ${res.status}` }, { status: 502 });
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
      },
    });
  } catch (err) {
    console.error('[venue/map] Error:', err);
    return NextResponse.json({ error: 'Map fetch failed' }, { status: 500 });
  }
}

function clampSize(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
}
