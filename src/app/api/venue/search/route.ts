import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────
// Pearloom / api/venue/search/route.ts
// Server-side proxy for Google Places API (New)
// Falls back to Nominatim (OpenStreetMap) when no Google key
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

// GET /api/venue/search?q=...&type=autocomplete
// GET /api/venue/search?placeId=...&type=details
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`venue-search:${ip}`, { max: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const type = searchParams.get('type');
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  // ── Autocomplete ──────────────────────────────────────────
  if (type === 'autocomplete') {
    const q = searchParams.get('q') ?? '';
    if (!q || q.length < 2) return NextResponse.json({ predictions: [] });

    // ── Primary: Google Places API ──
    if (apiKey) {
      try {
        const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
          },
          body: JSON.stringify({ input: q }),
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
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
                ?? s.placePrediction?.text?.text ?? '',
              formattedAddress: s.placePrediction?.structuredFormat?.secondaryText?.text ?? '',
            }));

          if (predictions.length > 0) return NextResponse.json({ predictions });
        } else {
          console.error('[venue/search] Google Places error:', res.status, await res.text().catch(() => ''));
        }
      } catch (err) {
        console.error('[venue/search] Google Places failed:', err);
      }
    }

    // ── Fallback: Nominatim (OpenStreetMap) — free, no key required ──
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
        {
          headers: { 'User-Agent': 'pearloom/1.0' },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (res.ok) {
        const data = await res.json() as Array<{
          place_id: number;
          display_name: string;
          lat: string;
          lon: string;
          address?: Record<string, string>;
        }>;

        const predictions: PlaceResult[] = data.map(d => {
          const addr = d.address || {};
          const shortName = addr.tourism || addr.amenity || addr.building ||
            addr.leisure || addr.shop || d.display_name.split(',')[0];
          const city = addr.city || addr.town || addr.village || '';
          const state = addr.state || addr.country || '';
          const shortAddr = [city, state].filter(Boolean).join(', ');

          return {
            id: `osm-${d.place_id}`,
            displayName: shortName,
            formattedAddress: shortAddr || d.display_name.split(',').slice(1, 3).join(',').trim(),
            location: { lat: parseFloat(d.lat), lng: parseFloat(d.lon) },
          };
        });

        return NextResponse.json({ predictions });
      }
    } catch (err) {
      console.error('[venue/search] Nominatim fallback failed:', err);
    }

    return NextResponse.json({ predictions: [] });
  }

  // ── Place Details ──────────────────────────────────────────
  if (type === 'details') {
    const placeId = searchParams.get('placeId') ?? '';

    // OSM fallback IDs start with "osm-" — no detail lookup needed
    if (placeId.startsWith('osm-')) {
      return NextResponse.json({ place: { id: placeId } });
    }

    if (!apiKey) {
      return NextResponse.json({ place: { id: placeId } });
    }

    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,websiteUri,internationalPhoneNumber,types',
        },
        signal: AbortSignal.timeout(5000),
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
