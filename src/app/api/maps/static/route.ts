// ─────────────────────────────────────────────────────────────
// Pearloom / api/maps/static — Google Static Maps proxy.
//
// Why a proxy: the Static Maps URL needs `&key=…` appended, and
// putting that URL in the rendered <img src> would leak the key
// to anyone who right-clicks. This route accepts our own params,
// composes the upstream URL server-side, and streams the bytes
// back so the browser only ever sees /api/maps/static URLs.
//
// GET /api/maps/static?
//   center=lat,lng
//   &zoom=13              (optional, default 13)
//   &size=640x400         (optional, default 640x400; max 2x for retina)
//   &venue=lat,lng        (optional, marks the venue with a peach pin)
//   &hotels=lat,lng;lat,lng  (semicolon-separated hotel pins)
//
// Map-style is hand-tuned to the v8 cream + olive palette via
// `style=…` directives so the static map doesn't clash with the
// rest of the page chrome.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const PEARLOOM_MAP_STYLE = [
  'feature:landscape|color:0xf5efe2',
  'feature:landscape.man_made|color:0xebe3d2',
  'feature:water|color:0xc8d3c0',
  'feature:road|color:0xfffefb',
  'feature:road|element:labels|color:0x8a7a5a',
  'feature:poi|element:labels|visibility:off',
  'feature:transit|visibility:off',
  'feature:administrative|element:labels|color:0x6f6557',
];

function buildStaticMapUrl(params: {
  center: string;
  zoom: number;
  size: string;
  venue?: string;
  hotels: string[];
  apiKey: string;
}): string {
  const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
  url.searchParams.set('center', params.center);
  url.searchParams.set('zoom', String(params.zoom));
  url.searchParams.set('size', params.size);
  url.searchParams.set('scale', '2'); // retina
  url.searchParams.set('maptype', 'roadmap');
  // Map style — append once per style directive.
  for (const s of PEARLOOM_MAP_STYLE) {
    url.searchParams.append('style', s);
  }
  // Venue pin: peach, label "V". Custom icons require a public-
  // accessible URL we can fetch — a coloured label gets us 90%
  // of the way without the icon-hosting headache.
  if (params.venue) {
    url.searchParams.append('markers', `color:0xC6703D|label:V|${params.venue}`);
  }
  // Hotel pins: ink-on-cream, numbered 1..N. Numbers > 9 wrap to
  // the marker without a label so the strip stays legible.
  params.hotels.forEach((coord, i) => {
    const label = i < 9 ? `label:${i + 1}|` : '';
    url.searchParams.append('markers', `color:0x0E0D0B|${label}${coord}`);
  });
  url.searchParams.set('key', params.apiKey);
  return url.toString();
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`maps-static:${ip}`, { max: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many map requests' }, { status: 429 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Maps key not configured.' }, { status: 503 });
  }

  const sp = req.nextUrl.searchParams;
  const center = sp.get('center') ?? '';
  if (!/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(center)) {
    return NextResponse.json({ error: 'Invalid center.' }, { status: 400 });
  }
  const zoomRaw = parseInt(sp.get('zoom') ?? '13', 10);
  const zoom = Number.isFinite(zoomRaw) ? Math.min(20, Math.max(1, zoomRaw)) : 13;
  const sizeRaw = sp.get('size') ?? '640x400';
  const size = /^\d{2,4}x\d{2,4}$/.test(sizeRaw) ? sizeRaw : '640x400';
  const venue = sp.get('venue') ?? undefined;
  if (venue && !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(venue)) {
    return NextResponse.json({ error: 'Invalid venue marker.' }, { status: 400 });
  }
  const hotelsRaw = sp.get('hotels') ?? '';
  const hotels = hotelsRaw
    .split(';')
    .map((s) => s.trim())
    .filter((s) => /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(s))
    .slice(0, 12);

  const upstream = buildStaticMapUrl({ center, zoom, size, venue, hotels, apiKey });

  let res: Response;
  try {
    res = await fetch(upstream, { cache: 'no-store' });
  } catch (err) {
    console.error('[maps/static] fetch failed:', err);
    return NextResponse.json({ error: 'Map proxy failed.' }, { status: 502 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: `Map ${res.status}` }, { status: 502 });
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'image/png',
      // Static maps are deterministic for given params — cache at
      // the edge for an hour. Browser cache for the same window.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
