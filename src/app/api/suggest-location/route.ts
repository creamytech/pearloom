// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/suggest-location/route.ts
// Suggests a location for a photo cluster.
// Priority: 1) GPS reverse-geocode  2) AI inference from metadata
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface PhotoInput {
  filename: string;
  creationTime: string;
  cameraMake?: string;
  cameraModel?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

/** Haversine centroid of photos that have GPS */
function gpsCentroid(photos: PhotoInput[]): { lat: number; lng: number } | null {
  const gps = photos.filter(p => p.latitude && p.longitude && Math.abs(p.latitude) > 0.001);
  if (!gps.length) return null;
  return {
    lat: gps.reduce((s, p) => s + (p.latitude ?? 0), 0) / gps.length,
    lng: gps.reduce((s, p) => s + (p.longitude ?? 0), 0) / gps.length,
  };
}

/** Nominatim reverse geocode */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { 'User-Agent': 'Pearloom/1.0' }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return '';
    const data = await res.json();
    const { city, town, village, county, state, country } = data.address ?? {};
    const place = city || town || village || county || '';
    return place && country ? `${place}, ${country}` : (state && country ? `${state}, ${country}` : country ?? '');
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { photos, clusterLabel } = await req.json() as {
      photos: PhotoInput[];
      clusterLabel?: string;
    };

    if (!photos?.length) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }

    // ── Priority 1: GPS reverse-geocode ──────────────────────────
    const centroid = gpsCentroid(photos);
    if (centroid) {
      const location = await reverseGeocode(centroid.lat, centroid.lng);
      if (location) {
        return NextResponse.json({
          location,
          confidence: 'high',
          reason: `GPS coordinates found in ${photos.filter(p => p.latitude && p.longitude).length} photo(s)`,
          suggestedTitle: clusterLabel || '',
        });
      }
    }

    // ── Priority 2: AI inference from metadata ───────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ location: '', confidence: 'low', reason: 'AI not configured' });
    }

    const photoSummary = photos.slice(0, 15).map(p => {
      const parts = [`File: ${p.filename}`, `Date: ${p.creationTime}`];
      if (p.cameraMake) parts.push(`Camera: ${p.cameraMake} ${p.cameraModel ?? ''}`);
      if (p.description) parts.push(`Note: ${p.description}`);
      return parts.join(' | ');
    }).join('\n');

    const dateRange = (() => {
      const dates = photos.map(p => new Date(p.creationTime).getTime()).sort((a, b) => a - b);
      const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
      const start = new Date(dates[0]).toLocaleDateString('en-US', opts);
      const end = new Date(dates[dates.length - 1]).toLocaleDateString('en-US', opts);
      return start === end ? start : `${start} – ${end}`;
    })();

    const prompt = `You are helping identify where a group of ${photos.length} photos was taken during ${dateRange}.${clusterLabel ? ` The group is labelled: "${clusterLabel}".` : ''}

These photos have no embedded GPS data. Use every available clue:
- Filenames sometimes contain city names, trip names, or event names
- Descriptions or notes attached to photos
- The camera model (e.g. iPhone sold primarily in certain markets, professional cameras at destination weddings)
- Seasonal context (December photos may be Christmas holidays, summer photos may be vacations)
- Date clustering (a 2-week gap suggests an international trip)

Photo metadata:
${photoSummary}

Make your BEST educated guess — even if confidence is medium or low, still provide a location. Only respond with an empty location if there are truly zero clues whatsoever.

Respond with ONLY a JSON object:
{"location": "City, Country", "confidence": "high"|"medium"|"low", "reason": "1-sentence explanation", "suggestedTitle": "Evocative 3-5 word title"}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 200,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.error('[suggest-location] Gemini error:', res.status);
      return NextResponse.json({ location: '', confidence: 'low', reason: 'AI unavailable' });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({
        location: parsed.location || '',
        confidence: parsed.confidence || 'low',
        reason: parsed.reason || '',
        suggestedTitle: parsed.suggestedTitle || '',
      });
    } catch {
      return NextResponse.json({ location: '', confidence: 'low', reason: 'Failed to parse AI response' });
    }
  } catch (error) {
    console.error('[suggest-location] Error:', error);
    return NextResponse.json({ location: '', confidence: 'low', reason: 'Request failed' });
  }
}
