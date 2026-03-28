import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────
// Pearloom / api/venue/search/route.ts
// Server-side proxy for Google Places API (New) — keeps API key off the client
// ─────────────────────────────────────────────────────────────

export interface PlaceResult {
  id: string;
  displayName: string;
  formattedAddress: string;
  location?: { lat: number; lng: number };
  websiteUri?: string;
  internationalPhoneNumber?: string;
  types?: string[];
}

// ── Mock data returned when GOOGLE_PLACES_API_KEY is not set ──

const MOCK_PREDICTIONS: PlaceResult[] = [
  {
    id: 'ChIJmock1',
    displayName: 'The Grand Ballroom',
    formattedAddress: '123 Luxury Lane, New York, NY 10001',
    location: { lat: 40.7128, lng: -74.006 },
  },
  {
    id: 'ChIJmock2',
    displayName: 'Rosewood Estate & Gardens',
    formattedAddress: '456 Garden Drive, Brooklyn, NY 11201',
    location: { lat: 40.6892, lng: -73.9442 },
  },
  {
    id: 'ChIJmock3',
    displayName: 'Vineyard at Sunset Ridge',
    formattedAddress: '789 Vineyard Road, Long Island, NY 11740',
    location: { lat: 40.8799, lng: -73.3556 },
  },
  {
    id: 'ChIJmock4',
    displayName: 'The Conservatory',
    formattedAddress: '321 Botanical Blvd, Manhattan, NY 10024',
    location: { lat: 40.7829, lng: -73.9654 },
  },
  {
    id: 'ChIJmock5',
    displayName: 'Lakeview Manor',
    formattedAddress: '654 Lakeside Ave, Westchester, NY 10530',
    location: { lat: 41.0534, lng: -73.8654 },
  },
];

const MOCK_DETAIL: PlaceResult = {
  id: 'ChIJmock1',
  displayName: 'The Grand Ballroom',
  formattedAddress: '123 Luxury Lane, New York, NY 10001',
  location: { lat: 40.7128, lng: -74.006 },
  websiteUri: 'https://example.com/grand-ballroom',
  internationalPhoneNumber: '+1 212-555-0100',
  types: ['event_venue', 'banquet_hall'],
};

// GET /api/venue/search?q=...&type=autocomplete
// GET /api/venue/search?placeId=...&type=details
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get('type');
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  // ── Autocomplete ──────────────────────────────────────────
  if (type === 'autocomplete') {
    const q = searchParams.get('q') ?? '';

    if (!apiKey) {
      // Return mock filtered by query
      const filtered = q
        ? MOCK_PREDICTIONS.filter(p =>
            p.displayName.toLowerCase().includes(q.toLowerCase()) ||
            p.formattedAddress.toLowerCase().includes(q.toLowerCase())
          )
        : MOCK_PREDICTIONS;
      return NextResponse.json({ predictions: filtered.slice(0, 5) });
    }

    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
        },
        body: JSON.stringify({
          input: q,
          includedTypes: [
            'event_venue',
            'wedding_venue',
            'banquet_hall',
            'restaurant',
            'park',
            'church',
            'hotel',
          ],
        }),
      });

      if (!res.ok) {
        console.error('[venue/search] Places autocomplete error', res.status);
        return NextResponse.json({ predictions: [] });
      }

      const json = await res.json() as {
        suggestions?: Array<{
          placePrediction?: {
            placeId?: string;
            text?: { text?: string };
            structuredFormat?: {
              mainText?: { text?: string };
              secondaryText?: { text?: string };
            };
          };
        }>;
      };

      const predictions: PlaceResult[] = (json.suggestions ?? [])
        .slice(0, 5)
        .map(s => ({
          id: s.placePrediction?.placeId ?? '',
          displayName: s.placePrediction?.structuredFormat?.mainText?.text
            ?? s.placePrediction?.text?.text
            ?? '',
          formattedAddress: s.placePrediction?.structuredFormat?.secondaryText?.text ?? '',
        }));

      return NextResponse.json({ predictions });
    } catch (err) {
      console.error('[venue/search] autocomplete error:', err);
      return NextResponse.json({ predictions: [] });
    }
  }

  // ── Place Details ──────────────────────────────────────────
  if (type === 'details') {
    const placeId = searchParams.get('placeId') ?? '';

    if (!apiKey) {
      return NextResponse.json({ place: { ...MOCK_DETAIL, id: placeId } });
    }

    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,websiteUri,internationalPhoneNumber,types',
        },
      });

      if (!res.ok) {
        console.error('[venue/search] Place details error', res.status);
        return NextResponse.json({ place: null }, { status: 502 });
      }

      const raw = await res.json() as {
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        websiteUri?: string;
        internationalPhoneNumber?: string;
        types?: string[];
      };

      const place: PlaceResult = {
        id: raw.id ?? placeId,
        displayName: raw.displayName?.text ?? '',
        formattedAddress: raw.formattedAddress ?? '',
        location: raw.location
          ? { lat: raw.location.latitude ?? 0, lng: raw.location.longitude ?? 0 }
          : undefined,
        websiteUri: raw.websiteUri,
        internationalPhoneNumber: raw.internationalPhoneNumber,
        types: raw.types,
      };

      return NextResponse.json({ place });
    } catch (err) {
      console.error('[venue/search] details error:', err);
      return NextResponse.json({ place: null }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'type must be autocomplete or details' }, { status: 400 });
}
