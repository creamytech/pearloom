// ─────────────────────────────────────────────────────────────
// Pearloom / api/places/details — Google Places Details v1
//
// Hydrates a single placeId into the full record we need to
// populate a hotel block: formatted address, phone, website,
// opening hours, up to 5 photo URLs, rating, review count.
//
// Called immediately after a TravelMapSearch dropdown click —
// the search result has the cheap fields (name + rating +
// address) and this fills in everything the renderer needs to
// show a rich hotel card without a follow-up trip.
//
// POST { placeId: string }
// Returns { details: { placeId, name, formattedAddress, phone,
//   website, openingHours, photoUrls, photoUrl, rating,
//   userRatingCount, location } } or { details: null, fallback: true }.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimitAsync } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Body {
  placeId?: string;
}

interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  phone?: string;
  website?: string;
  openingHours?: string[];
  /** Up to 5 photo URLs (Places media endpoint, 800px wide). */
  photoUrls?: string[];
  /** Convenience first-photo. Same as photoUrls[0] when present. */
  photoUrl?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  location?: { lat: number; lng: number };
  editorialSummary?: string;
}

const PLACES_DETAILS_LIMIT = { max: 30, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const rate = await checkRateLimitAsync(`places-details:${session.user.email}`, PLACES_DETAILS_LIMIT);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many lookups. Try again shortly.' },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const placeId = (body.placeId ?? '').trim();
  if (!placeId) {
    return NextResponse.json({ error: 'placeId is required.' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ details: null, fallback: true });
  }

  // Places Details v1 uses GET /v1/places/{place_id} with the
  // FieldMask header — same auth model as search.
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'id',
          'displayName',
          'formattedAddress',
          'internationalPhoneNumber',
          'nationalPhoneNumber',
          'websiteUri',
          'regularOpeningHours',
          'photos',
          'rating',
          'userRatingCount',
          'priceLevel',
          'types',
          'location',
          'editorialSummary',
        ].join(','),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn('[places.details] upstream error', res.status);
      return NextResponse.json({ details: null, fallback: true });
    }

    const data = (await res.json()) as {
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      internationalPhoneNumber?: string;
      nationalPhoneNumber?: string;
      websiteUri?: string;
      regularOpeningHours?: { weekdayDescriptions?: string[] };
      photos?: Array<{ name: string }>;
      rating?: number;
      userRatingCount?: number;
      priceLevel?: string;
      types?: string[];
      location?: { latitude: number; longitude: number };
      editorialSummary?: { text?: string };
    };

    /* Resolve each photo to a stable Google CDN URL. Previous
       implementation embedded the API key directly in the photo
       URL we returned to the browser — that leaked the key
       publicly AND failed under any referrer-restricted key
       config because the browser-side fetch's Referer header
       wouldn't match the server's allowlist.

       skipHttpRedirect=true makes the Places media endpoint
       return JSON ({ name, photoUri }) instead of a 302 redirect.
       The photoUri is a public lh3.googleusercontent.com URL
       that doesn't require auth and is stable for months — safe
       to embed in a published site. We resolve in parallel so
       all 5 photos land in ~1 RTT instead of 5. */
    const rawPhotos = (data.photos ?? []).slice(0, 5);
    const photoUrls = (
      await Promise.all(
        rawPhotos.map(async (ph) => {
          try {
            const r = await fetch(
              `https://places.googleapis.com/v1/${ph.name}/media?maxWidthPx=1200&skipHttpRedirect=true`,
              {
                method: 'GET',
                headers: { 'X-Goog-Api-Key': apiKey },
                cache: 'no-store',
              },
            );
            if (!r.ok) return null;
            const j = (await r.json()) as { photoUri?: string };
            return typeof j.photoUri === 'string' ? j.photoUri : null;
          } catch {
            return null;
          }
        }),
      )
    ).filter((u): u is string => typeof u === 'string');

    const details: PlaceDetails = {
      placeId: data.id ?? placeId,
      name: data.displayName?.text ?? 'Place',
      formattedAddress: data.formattedAddress ?? '',
      phone: data.internationalPhoneNumber ?? data.nationalPhoneNumber,
      website: data.websiteUri,
      openingHours: data.regularOpeningHours?.weekdayDescriptions,
      photoUrls,
      photoUrl: photoUrls[0],
      rating: data.rating,
      userRatingCount: data.userRatingCount,
      priceLevel: data.priceLevel,
      types: data.types,
      location: data.location
        ? { lat: data.location.latitude, lng: data.location.longitude }
        : undefined,
      editorialSummary: data.editorialSummary?.text,
    };

    return NextResponse.json({ details });
  } catch (err) {
    console.error('[places.details] fetch failed', err);
    return NextResponse.json({ details: null, fallback: true });
  }
}
