// ─────────────────────────────────────────────────────────────
// Pearloom / api/places/search — Google Places Text Search v1
//
// Generic text search for hotels and venues. Drives the
// TravelMapSearch editor card: host types a free-text query
// ("hotels near Santorini", "Cosmos Suites", "bed & breakfast
// brooklyn") and we return a flat result list shaped for the
// dropdown card stack.
//
// Distinct from /api/hotels/nearby (which is venue-anchored,
// returns 6 ranked + Claude-blurbed hotels for the published
// site) and /api/hotels/enrich (single-place deep enrichment).
// This route is purely the search-box autocomplete behind the
// editor map strip.
//
// POST { query: string, near?: { lat, lng }, nearText?: string,
//   radius?: number }
// Returns { results: Array<{ placeId, name, address, rating,
//   userRatingCount, priceLevel, types, location: { lat, lng } }>,
//   bias?: { lat, lng }, fallback?: boolean }
//
// Graceful degrade: missing key or upstream failure returns
// { results: [], fallback: true } so the client can fall back to
// the curated mock dataset without surfacing an error to the
// host.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimitAsync } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Body {
  query?: string;
  near?: { lat?: number; lng?: number };
  /** Fallback bias: the venue's ADDRESS TEXT when the manifest never
   *  cached coords (most pre-2026-07-09 sites — the autocomplete
   *  didn't stamp them). Geocoded server-side once and cached, so
   *  "hotels" still lands near the event, not worldwide. Ignored
   *  when `near` carries real coords. */
  nearText?: string;
  /** Radius in meters around `near`. Defaults to 50 km. */
  radius?: number;
}

/* Address-text → coords, cached for the process lifetime. Venue
 * addresses repeat on every keystroke-debounced search from the
 * same panel, so this keeps the fallback to ONE upstream geocode
 * per venue. */
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocodeText(text: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  const key = text.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;
  let coords: { lat: number; lng: number } | null = null;
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.location',
      },
      body: JSON.stringify({ textQuery: text, maxResultCount: 1 }),
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as { places?: Array<{ location?: { latitude: number; longitude: number } }> };
      const loc = data.places?.[0]?.location;
      if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        coords = { lat: loc.latitude, lng: loc.longitude };
      }
    }
  } catch { /* bias stays unset */ }
  if (geocodeCache.size > 500) geocodeCache.clear();
  geocodeCache.set(key, coords);
  return coords;
}

interface SearchResult {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  location?: { lat: number; lng: number };
}

// Local rate limit — 30 per hour per user. Sits below the
// global aiBlocks budget so a heavy editor session searching for
// hotels can't burn the user's AI quota.
const PLACES_SEARCH_LIMIT = { max: 30, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const rate = await checkRateLimitAsync(`places-search:${session.user.email}`, PLACES_SEARCH_LIMIT);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many searches. Try again shortly.' },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const query = (body.query ?? '').trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    // Graceful degrade — client falls back to MOCK_PLACES.
    return NextResponse.json({ results: [], fallback: true });
  }

  const requestBody: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: 10,
  };

  // Bias to a circular region around the venue when caller has
  // coords. `locationBias` (soft) keeps far-away matches in the
  // result set; `locationRestriction` would hard-filter them out
  // which is too aggressive when a host searches "hotels in NYC"
  // from a venue 5 km outside the city.
  let lat = body.near?.lat;
  let lng = body.near?.lng;
  // No coords but a venue address? Geocode it (cached) so the
  // search still centers on the event.
  let resolvedBias: { lat: number; lng: number } | null = null;
  if ((typeof lat !== 'number' || typeof lng !== 'number') && typeof body.nearText === 'string' && body.nearText.trim().length > 3) {
    resolvedBias = await geocodeText(body.nearText, apiKey);
    if (resolvedBias) { lat = resolvedBias.lat; lng = resolvedBias.lng; }
  }
  const radius = typeof body.radius === 'number' && body.radius > 0 ? body.radius : 50000;
  if (typeof lat === 'number' && typeof lng === 'number') {
    requestBody.locationBias = {
      circle: { center: { latitude: lat, longitude: lng }, radius },
    };
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.rating',
          'places.userRatingCount',
          'places.priceLevel',
          'places.types',
          'places.location',
        ].join(','),
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn('[places.search] upstream error', res.status);
      return NextResponse.json({ results: [], fallback: true });
    }

    const data = (await res.json()) as {
      places?: Array<{
        id: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        rating?: number;
        userRatingCount?: number;
        priceLevel?: string;
        types?: string[];
        location?: { latitude: number; longitude: number };
      }>;
    };

    const results: SearchResult[] = (data.places ?? []).map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? 'Place',
      address: p.formattedAddress ?? '',
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      priceLevel: p.priceLevel,
      types: p.types,
      location: p.location
        ? { lat: p.location.latitude, lng: p.location.longitude }
        : undefined,
    }));

    /* `bias` = the geocoded nearText center, when one was resolved —
       the client backfills manifest.logistics.venueLat/Lng from it
       so future searches (and the map pin) skip the geocode. */
    return NextResponse.json(resolvedBias ? { results, bias: resolvedBias } : { results });
  } catch (err) {
    console.error('[places.search] fetch failed', err);
    return NextResponse.json({ results: [], fallback: true });
  }
}
