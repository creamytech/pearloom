// ─────────────────────────────────────────────────────────────
// Pearloom / api/venue/photo/route.ts
//
// GET /api/venue/photo?q=<name or address>&w=1200&h=800
//   → streams an actual photograph of that venue via the
//     Google Places API (v1), 24h-cached.
//
// Strategy:
//   1. Places text-search the query → resolve to a place with
//      `photos[]` metadata.
//   2. Pull the first high-quality photo's media URL.
//   3. Fetch the bytes server-side and pipe back.
//
// This gives us a real picture (often the venue's Google listing
// hero photo) — much better than a hand-drawn SVG or a satellite
// map. The stylization pass is separate: /api/decor/ai-accent or
// /api/photos/stylize takes this image and redraws it.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const w = clampSize(searchParams.get('w'), 1200, 200, 4800);
  const h = clampSize(searchParams.get('h'), 800, 200, 4800);
  if (!q) return NextResponse.json({ error: 'q (venue query) is required' }, { status: 400 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Venue photo not configured' }, { status: 404 });
  }

  try {
    // 1. Text-search for the venue — the first result is almost
    //    always the right place when the query includes venue name
    //    + city/country.
    const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.photos',
      },
      body: JSON.stringify({ textQuery: q, pageSize: 1 }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!searchRes.ok) {
      const t = await searchRes.text().catch(() => '');
      console.warn('[venue/photo] search', searchRes.status, t.slice(0, 200));
      return NextResponse.json({ error: `Places search ${searchRes.status}` }, { status: 502 });
    }

    const data = (await searchRes.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        photos?: Array<{ name?: string; widthPx?: number; heightPx?: number }>;
      }>;
    };

    const place = data.places?.[0];
    const photoName = place?.photos?.find((p) => p.name)?.name;
    if (!photoName) {
      return NextResponse.json({ error: 'No photos found for that venue' }, { status: 404 });
    }

    // 2. Fetch the media. Photo media URLs follow:
    //    GET /v1/{name=places/*/photos/*}/media?maxWidthPx=1200
    //    Returns the raw image redirected to the Google CDN.
    const photoUrl =
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${w}&maxHeightPx=${h}&key=${apiKey}&skipHttpRedirect=false`;

    const photoRes = await fetch(photoUrl, { signal: AbortSignal.timeout(15_000) });
    if (!photoRes.ok) {
      const t = await photoRes.text().catch(() => '');
      console.warn('[venue/photo] media', photoRes.status, t.slice(0, 200));
      return NextResponse.json({ error: `Photo fetch ${photoRes.status}` }, { status: 502 });
    }

    const buffer = Buffer.from(await photoRes.arrayBuffer());
    const contentType = photoRes.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
        // Attribution — Google's terms require linking back to
        // Google Maps when displaying Places photos. The UI renders
        // an "Open in Maps" link next to the image.
        'X-Pearloom-Attribution': 'Google',
      },
    });
  } catch (err) {
    console.error('[venue/photo] Error:', err);
    return NextResponse.json({ error: 'Venue photo fetch failed' }, { status: 500 });
  }
}

function clampSize(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
}
