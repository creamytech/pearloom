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
import { checkRateLimitAsync, RATE_LIMITS } from '@/lib/rate-limit';
import { generate, textFrom, CLAUDE_HAIKU } from '@/lib/claude';
import { overBudget, chargeAi, centsForUsage, approxTokens, budgetKey } from '@/lib/ai-budget';

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
  ratingCount?: number;
  priceLevel?: string;
  /** When Google has it, an actual nightly-rate range (USD or
   *  local currency). Coverage is patchy — many hotels just have
   *  priceLevel. We render `priceRange` when present and fall
   *  back to a priceLevel-tiered estimate otherwise. */
  priceRange?: { start?: number; end?: number; currency?: string };
  distanceMeters?: number;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  photoUrl?: string;
  photoUrls?: string[];
  lat?: number;
  lng?: number;
  types?: string[];
  editorialSummary?: string;
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

// HOTEL_TYPES: real hotels, not vacation rentals. The previous
// `includedTypes: ['lodging']` swept in apartment_complex,
// extended-stay rental aggregators ("UHost AI 1B Retreat…"),
// cottages, RV parks, etc — exactly the noise the user flagged
// when Pear returned 4 random Fort Lauderdale apartments instead
// of actual hotels. `includedPrimaryTypes` is stricter than
// `includedTypes`: it requires the place's *primary* category to
// match, which is how Google distinguishes "is a hotel" from
// "happens to allow overnight stays".
const HOTEL_TYPES = [
  'hotel',
  'resort_hotel',
  'bed_and_breakfast',
  'extended_stay_hotel',
  'inn',
];

// Belt-and-braces — even within HOTEL_TYPES the API occasionally
// returns places whose secondary types include these red flags
// (a private_guest_room marketed as a hotel, etc). Filtered
// post-fetch so we don't just rely on Google's primary-type tag.
const REJECT_TYPES = new Set([
  'apartment_complex',
  'apartment_building',
  'private_guest_room',
  'rv_park',
  'campground',
  'cottage',
  'cabin',
  'farmstay',
  'hostel',
  'guest_house',
  'self_catering_accommodation',
]);

async function searchNearbyHotels(lat: number, lng: number, apiKey: string): Promise<PlaceHotel[]> {
  async function fetchOnce(opts: { types: string[]; primary: boolean; radius: number }): Promise<PlaceHotel[]> {
    const body: Record<string, unknown> = {
      maxResultCount: 20,
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: opts.radius },
      },
      // POPULARITY ranks by Google's quality signal — better than
      // DISTANCE for "find me good options" because a 5-star hotel
      // 4 km away beats a 1-star one across the street.
      rankPreference: 'POPULARITY',
    };
    if (opts.primary) body.includedPrimaryTypes = opts.types;
    else body.includedTypes = opts.types;

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
          'places.userRatingCount',
          'places.priceLevel',
          'places.priceRange',
          'places.location',
          'places.websiteUri',
          'places.internationalPhoneNumber',
          'places.photos',
          'places.types',
          'places.editorialSummary',
        ].join(','),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return [];
    const data = await res.json() as {
      places?: Array<{
        id: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        rating?: number;
        userRatingCount?: number;
        priceLevel?: string;
        priceRange?: {
          startPrice?: { units?: string; currencyCode?: string };
          endPrice?: { units?: string; currencyCode?: string };
        };
        location?: { latitude: number; longitude: number };
        websiteUri?: string;
        internationalPhoneNumber?: string;
        photos?: Array<{ name: string }>;
        types?: string[];
        editorialSummary?: { text?: string };
      }>;
    };
    return (data.places ?? []).map((p) => {
      const photoUrls = (p.photos ?? [])
        .slice(0, 5)
        .map((ph) => `https://places.googleapis.com/v1/${ph.name}/media?maxWidthPx=600&key=${apiKey}`);
      const photoUrl = photoUrls[0];
      const dist = p.location
        ? Math.round(haversine(lat, lng, p.location.latitude, p.location.longitude))
        : undefined;
      // Pull a real nightly-rate range when Google has one. The
      // shape is `{ startPrice: { units: '150', currencyCode: 'USD' },
      // endPrice: { ... } }`. We fold it into a flat
      // { start, end, currency } so the renderer doesn't have to
      // parse the Money struct twice.
      const priceRange = (() => {
        const r = p.priceRange;
        if (!r?.startPrice && !r?.endPrice) return undefined;
        const startUnits = r.startPrice?.units ? Number(r.startPrice.units) : undefined;
        const endUnits = r.endPrice?.units ? Number(r.endPrice.units) : undefined;
        if (!Number.isFinite(startUnits) && !Number.isFinite(endUnits)) return undefined;
        return {
          start: Number.isFinite(startUnits) ? startUnits : undefined,
          end: Number.isFinite(endUnits) ? endUnits : undefined,
          currency: r.startPrice?.currencyCode ?? r.endPrice?.currencyCode,
        };
      })();
      return {
        id: p.id,
        name: p.displayName?.text ?? 'Hotel',
        address: p.formattedAddress ?? '',
        rating: p.rating,
        ratingCount: p.userRatingCount,
        priceLevel: p.priceLevel,
        priceRange,
        distanceMeters: dist,
        websiteUri: p.websiteUri,
        internationalPhoneNumber: p.internationalPhoneNumber,
        photoUrl,
        photoUrls,
        // lat/lng for the static-map markers in the renderer's
        // "map mode" hotel display option.
        lat: p.location?.latitude,
        lng: p.location?.longitude,
        types: p.types,
        editorialSummary: p.editorialSummary?.text,
      };
    });
  }

  // Try primary-types first (strictest → real hotels). Fall back
  // to broader includedTypes within a wider radius only if the
  // strict pass returns nothing — happens in small towns where
  // the only nearby place is a B&B that didn't get tagged
  // 'bed_and_breakfast' as primary.
  let raw = await fetchOnce({ types: HOTEL_TYPES, primary: true, radius: 15000 });
  if (raw.length === 0) {
    raw = await fetchOnce({ types: HOTEL_TYPES, primary: false, radius: 25000 });
  }

  // Reject vacation-rental sub-types + filter to places with at
  // least *some* social proof (3+ reviews). The 3-review floor
  // is forgiving enough that a new boutique opening in 2025 still
  // qualifies, but high enough to drop empty stub listings.
  return raw
    .filter((h) => !(h.types ?? []).some((t) => REJECT_TYPES.has(t)))
    .filter((h) => (h.ratingCount ?? 0) >= 3 || (h.rating ?? 0) >= 4);
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
  if (!meters || meters <= 0) return '';
  // Sub-300m reads as "steps from venue" — anything that close
  // doesn't need a precise number to be useful.
  if (meters < 300) {
    const ft = Math.round(meters * 3.28084);
    return `${ft} ft · steps from venue`;
  }
  const miles = meters / 1609.344;
  // Drive time: ~30 mph city avg with 1.4× road-curve bias →
  // roughly 2.8 min per mile. Floor to 1 min for the close ones.
  const driveMin = Math.max(1, Math.round(miles * 2.8));
  if (miles < 0.5) return `${miles.toFixed(2)} mi · ~${driveMin} min drive`;
  if (miles < 10)  return `${miles.toFixed(1)} mi · ~${driveMin} min drive`;
  return `${Math.round(miles)} mi · ~${driveMin} min drive`;
}

async function blurbifyClaude(hotels: PlaceHotel[], context: { venueCity?: string; eventDate?: string }, budgetK: string): Promise<Record<string, string>> {
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
    // Charge the real token cost from the returned Message's usage
    // (falls back to a length estimate if usage is absent).
    void chargeAi(
      budgetK,
      centsForUsage({
        provider: 'claude',
        model: CLAUDE_HAIKU,
        inputTokens: msg.usage?.input_tokens ?? approxTokens(`${system}${user}`),
        outputTokens: msg.usage?.output_tokens ?? approxTokens(raw),
        cacheReadTokens: msg.usage?.cache_read_input_tokens ?? 0,
        cacheWriteTokens: msg.usage?.cache_creation_input_tokens ?? 0,
        ms: 0,
      })
    );
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
  const rate = await checkRateLimitAsync(`hotels-nearby:${session.user.email}`, RATE_LIMITS.aiBlocks);
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

  // Quality score:
  //   • rating contributes the most (0–5, multiplied by 1000)
  //   • log10(reviewCount) gives diminishing returns past 100 reviews
  //     (200-review hotel ≈ same boost as 1000-review hotel — keeps
  //     small boutiques competitive with Hilton-class chains)
  //   • distance penalty: -1 point per km, so a 4.6 hotel 5 km away
  //     beats a 4.5 hotel next door, but a 4.5 next door beats a
  //     4.6 hotel 50 km away.
  function qualityScore(h: PlaceHotel): number {
    const r = h.rating ?? 0;
    const c = h.ratingCount ?? 0;
    const km = (h.distanceMeters ?? 0) / 1000;
    return r * 1000 + Math.log10(c + 1) * 100 - km;
  }
  const top = [...hotels]
    .sort((a, b) => qualityScore(b) - qualityScore(a))
    .slice(0, 6);

  // Daily AI dollar cap (src/lib/ai-budget.ts). Keyed by account
  // email. Fails open — only blocks on a confirmed over-budget read.
  const budget = budgetKey(session.user.email, '');
  if (await overBudget(budget)) {
    return NextResponse.json(
      { ok: false, error: "You've reached today's AI limit. Try again tomorrow." },
      { status: 429 },
    );
  }

  const blurbs = await blurbifyClaude(top, { venueCity: body.venueCity, eventDate: body.eventDate }, budget);

  const decorated = top.map((h) => ({
    id: h.id,
    name: h.name,
    address: h.address,
    distanceText: distanceText(h.distanceMeters),
    distanceMeters: h.distanceMeters,
    priceLevel: h.priceLevel,
    rating: h.rating,
    ratingCount: h.ratingCount,
    websiteUri: h.websiteUri,
    phone: h.internationalPhoneNumber,
    photoUrl: h.photoUrl,
    photoUrls: h.photoUrls,
    lat: h.lat,
    lng: h.lng,
    priceRange: h.priceRange,
    blurb: blurbs[h.id] ?? h.editorialSummary ?? '',
    types: h.types,
    editorialSummary: h.editorialSummary,
  }));

  return NextResponse.json({ hotels: decorated });
}
