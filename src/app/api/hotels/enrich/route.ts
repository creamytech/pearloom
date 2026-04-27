// ─────────────────────────────────────────────────────────────
// Pearloom / api/hotels/enrich — single-hotel enrichment.
//
// When a host picks a hotel via the editor's Search-by-name row,
// we want more than just the name + address that autocomplete
// returns. This route accepts a placeId + (optionally) the
// venue's lat/lng and returns:
//
//   - name, address, websiteUri, phone (Place Details)
//   - amenities — a short comma list derived from the place's
//     types + editorialSummary so the host gets at-a-glance
//     reasons-to-stay without writing them
//   - distanceText — "1.4 km" or "12 min drive" away from the
//     wedding venue when venueLat/venueLng are supplied
//   - blurb — Claude Haiku's 12-22 word editorial line
//
// The shape mirrors /api/hotels/nearby's individual hotel rows
// so the editor can splice an enriched pick into the same Hotel
// type without translation.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { generate, textFrom } from '@/lib/claude';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Body {
  placeId: string;
  venueLat?: number;
  venueLng?: number;
  venueCity?: string;
  eventDate?: string;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(meters?: number): string {
  if (!meters || meters <= 0) return '';
  if (meters < 1000) return `${Math.round(meters)} m from venue`;
  const km = meters / 1000;
  // Rough drive-time guess from straight-line km — usable hint
  // for guests, not a routed answer. Bias 1.4× to account for
  // road curve.
  const driveMin = Math.max(1, Math.round((km * 1.4) / 0.6));
  if (km < 8) return `${km.toFixed(1)} km · ~${driveMin} min drive`;
  return `${Math.round(km)} km · ~${driveMin} min drive`;
}

// Convert raw Google place types ('lodging', 'spa', 'restaurant',
// 'gym', 'parking', 'wifi'…) into a short reader-friendly
// amenities line. We only surface things a host would mention.
const AMENITY_HINTS: Record<string, string> = {
  spa: 'spa',
  restaurant: 'restaurant on-site',
  bar: 'bar',
  meal_takeaway: 'room service',
  gym: 'fitness centre',
  swimming_pool: 'pool',
  pool: 'pool',
  parking: 'parking',
  pet_store: 'pet-friendly',
  beach: 'beach access',
  resort: 'resort',
  boutique: 'boutique',
  lodging: '',
  point_of_interest: '',
  establishment: '',
};

function summariseAmenities(types: string[] | undefined, editorialSummary?: string): string {
  const t = types ?? [];
  const matched = t
    .map((x) => AMENITY_HINTS[x] ?? '')
    .filter(Boolean);
  // De-dupe + cap at 3 — editorial summary handles the colour
  // commentary, the type list just covers concrete amenities.
  const unique: string[] = [];
  for (const m of matched) if (!unique.includes(m)) unique.push(m);
  return unique.slice(0, 3).join(' · ') || (editorialSummary ?? '');
}

interface PlaceDetailsResult {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  websiteUri?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  priceLevel?: string;
  types?: string[];
  editorialSummary?: { text?: string };
  photos?: Array<{ name: string }>;
}

async function fetchDetails(placeId: string, apiKey: string): Promise<PlaceDetailsResult | null> {
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'id', 'displayName', 'formattedAddress', 'location',
          'websiteUri', 'internationalPhoneNumber', 'rating',
          'priceLevel', 'types', 'editorialSummary', 'photos',
        ].join(','),
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as PlaceDetailsResult;
  } catch {
    return null;
  }
}

async function blurbifyOne(
  hotel: { name: string; address: string; rating?: number; amenities: string; distanceText: string; editorialSummary?: string },
  context: { venueCity?: string; eventDate?: string },
): Promise<string> {
  const system =
    'You write a single short line for a wedding website hotel block. 12-22 words. Specific over generic. Mention character (boutique, family-run, garden) or distance/setting. No exclamation marks, no "stunning"/"perfect"/"breathtaking".';
  const user = [
    `Hotel: ${hotel.name}`,
    `Address: ${hotel.address}`,
    hotel.rating ? `Rating: ${hotel.rating}` : null,
    hotel.amenities ? `Amenities: ${hotel.amenities}` : null,
    hotel.editorialSummary ? `Editorial summary: ${hotel.editorialSummary}` : null,
    hotel.distanceText ? `Distance: ${hotel.distanceText}` : null,
    context.venueCity ? `Wedding venue is in ${context.venueCity}` : null,
    'Output ONLY the blurb sentence. No quotes, no JSON, no preamble.',
  ].filter(Boolean).join('\n');

  try {
    const msg = await generate({
      tier: 'haiku',
      system,
      messages: [{ role: 'user', content: user }],
      maxTokens: 120,
      temperature: 0.55,
    });
    const raw = textFrom(msg).trim();
    return raw.replace(/^["']|["']$/g, '').slice(0, 240);
  } catch {
    return hotel.editorialSummary ?? '';
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const rate = checkRateLimit(`hotels-enrich:${session.user.email}`, RATE_LIMITS.aiBlocks);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many enrichments. Try again shortly.' }, { status: 429 });
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
  if (!body.placeId) {
    return NextResponse.json({ error: 'Missing placeId.' }, { status: 400 });
  }

  const details = await fetchDetails(body.placeId, apiKey);
  if (!details) {
    return NextResponse.json({ error: 'Could not look up that hotel.' }, { status: 502 });
  }

  const editorialSummary = details.editorialSummary?.text ?? '';
  const amenities = summariseAmenities(details.types, editorialSummary);
  let distanceText = '';
  if (
    typeof body.venueLat === 'number' && typeof body.venueLng === 'number' &&
    typeof details.location?.latitude === 'number' && typeof details.location?.longitude === 'number'
  ) {
    const m = haversineMeters(body.venueLat, body.venueLng, details.location.latitude, details.location.longitude);
    distanceText = formatDistance(m);
  }

  const photoRef = details.photos?.[0]?.name;
  const photoUrl = photoRef
    ? `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=600&key=${apiKey}`
    : undefined;

  const name = details.displayName?.text ?? '';
  const address = details.formattedAddress ?? '';

  const blurb = await blurbifyOne(
    { name, address, rating: details.rating, amenities, distanceText, editorialSummary },
    { venueCity: body.venueCity, eventDate: body.eventDate },
  );

  return NextResponse.json({
    ok: true,
    hotel: {
      id: details.id ?? body.placeId,
      name,
      address,
      websiteUri: details.websiteUri,
      phone: details.internationalPhoneNumber,
      rating: details.rating,
      priceLevel: details.priceLevel,
      amenities,
      distanceText,
      photoUrl,
      blurb,
    },
  });
}
