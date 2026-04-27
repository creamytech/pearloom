// ─────────────────────────────────────────────────────────────
// Pearloom / api/hotels/nearby — REAL hotels via Google Places.
//
// The legacy /api/ai-hotels just asked Gemini to fabricate hotel
// names from training data — guests booked into hotels that
// didn't exist. This route actually calls Google Places
// searchNearby (lodging type) using the venue's lat/lng (or
// geocodes the venue address first), returns real hotels with
// real metadata, then asks Claude to write a 2-line blurb for
// each.
//
// POST { venueAddress?, venueCity?, lat?, lng?, eventDate? }
// Returns { hotels: Array<{ id, name, address, distanceText,
//   priceLevel, rating, websiteUri, photoUrl, blurb }> }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { generate, textFrom } from '@/lib/claude';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Body {
  venueAddress?: string;
  venueCity?: string;
  lat?: number;
  lng?: number;
  eventDate?: string;
}

interface PlaceHotel {
  id: string;
  name: string;
  address: string;
  rating?: number;
  priceLevel?: string;
  distanceMeters?: number;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  photoUrl?: string;
}

async function geocode(query: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = await res.json() as { results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }> };
    const loc = data.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch {
    return null;
  }
}

async function searchNearbyHotels(lat: number, lng: number, apiKey: string): Promise<PlaceHotel[]> {
  // Google Places API (New) v1 searchNearby. Lodging type. 10km radius.
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.rating',
        'places.priceLevel',
        'places.location',
        'places.websiteUri',
        'places.internationalPhoneNumber',
        'places.photos',
      ].join(','),
    },
    body: JSON.stringify({
      includedTypes: ['lodging'],
      maxResultCount: 12,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 10000,
        },
      },
      rankPreference: 'DISTANCE',
    }),
  });
  if (!res.ok) return [];
  const data = await res.json() as {
    places?: Array<{
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      priceLevel?: string;
      location?: { latitude: number; longitude: number };
      websiteUri?: string;
      internationalPhoneNumber?: string;
      photos?: Array<{ name: string }>;
    }>;
  };
  return (data.places ?? []).map((p) => {
    const photoRef = p.photos?.[0]?.name;
    const photoUrl = photoRef
      ? `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=400&key=${apiKey}`
      : undefined;
    const dist = p.location
      ? Math.round(haversine(lat, lng, p.location.latitude, p.location.longitude))
      : undefined;
    return {
      id: p.id,
      name: p.displayName?.text ?? 'Hotel',
      address: p.formattedAddress ?? '',
      rating: p.rating,
      priceLevel: p.priceLevel,
      distanceMeters: dist,
      websiteUri: p.websiteUri,
      internationalPhoneNumber: p.internationalPhoneNumber,
      photoUrl,
    };
  });
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function distanceText(meters?: number): string {
  if (!meters) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

async function blurbifyClaude(hotels: PlaceHotel[], context: { venueCity?: string; eventDate?: string }): Promise<Record<string, string>> {
  if (hotels.length === 0) return {};
  const list = hotels.map((h) => `- ${h.name} · ${h.address}${h.rating ? ` · rating ${h.rating}` : ''}${h.distanceMeters ? ` · ${distanceText(h.distanceMeters)} from venue` : ''}`).join('\n');
  const system = 'You write short, useful one-line hotel blurbs for a wedding website. 12-22 words. Specific over generic. Mention walking distance, neighborhood character, or notable features. No exclamation marks, no clichés like "stunning" or "perfect."';
  const user = `Wedding venue${context.venueCity ? ` in ${context.venueCity}` : ''}${context.eventDate ? `, event date ${context.eventDate}` : ''}. Write one blurb per hotel below. Output ONLY a JSON object with hotel ids as keys, each value being the blurb string. No code fences.\n\n${hotels.map((h, i) => `id ${h.id} — ${list.split('\n')[i].slice(2)}`).join('\n')}`;
  try {
    const msg = await generate({
      tier: 'haiku',
      system,
      messages: [{ role: 'user', content: user }],
      maxTokens: 1200,
      temperature: 0.6,
    });
    const raw = textFrom(msg).trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    const parsed = JSON.parse(cleaned) as Record<string, string>;
    return parsed;
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const rate = checkRateLimit(`hotels-nearby:${session.user.email}`, RATE_LIMITS.aiBlocks);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many searches. Try again shortly.' }, { status: 429 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Hotel search is offline — GOOGLE_PLACES_API_KEY not configured.' },
      { status: 503 },
    );
  }

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }

  let lat = body.lat;
  let lng = body.lng;
  if ((typeof lat !== 'number' || typeof lng !== 'number')) {
    const queryParts = [body.venueAddress, body.venueCity].filter(Boolean) as string[];
    if (queryParts.length === 0) {
      return NextResponse.json({ error: 'Need a venue address, city, or lat/lng.' }, { status: 400 });
    }
    const geo = await geocode(queryParts.join(', '), apiKey);
    if (!geo) {
      return NextResponse.json({ error: 'Could not geocode the venue.' }, { status: 422 });
    }
    lat = geo.lat;
    lng = geo.lng;
  }

  const hotels = await searchNearbyHotels(lat, lng, apiKey);
  if (hotels.length === 0) {
    return NextResponse.json({ hotels: [] });
  }

  // Take the top 6 sorted by rating + distance, blurb them via Claude.
  const top = [...hotels]
    .sort((a, b) => {
      const ar = a.rating ?? 0;
      const br = b.rating ?? 0;
      const ad = a.distanceMeters ?? Number.MAX_SAFE_INTEGER;
      const bd = b.distanceMeters ?? Number.MAX_SAFE_INTEGER;
      // Higher rating + smaller distance wins.
      return (br - ar) * 1000 + (ad - bd) / 1000;
    })
    .slice(0, 6);
  const blurbs = await blurbifyClaude(top, { venueCity: body.venueCity, eventDate: body.eventDate });

  const decorated = top.map((h) => ({
    id: h.id,
    name: h.name,
    address: h.address,
    distanceText: distanceText(h.distanceMeters),
    priceLevel: h.priceLevel,
    rating: h.rating,
    websiteUri: h.websiteUri,
    phone: h.internationalPhoneNumber,
    photoUrl: h.photoUrl,
    blurb: blurbs[h.id] ?? '',
  }));

  return NextResponse.json({ hotels: decorated });
}
