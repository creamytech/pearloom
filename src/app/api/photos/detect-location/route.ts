// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/photos/detect-location/route.ts
// Detect photo location via EXIF GPS → Nominatim reverse geocode
// Fallback: Gemini Vision analyzes the image for visual location cues
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Nominatim reverse geocode — returns "City, State" or "City, Country" */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`,
      { headers: { 'User-Agent': 'Pearloom/1.0' }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return '';
    const data = await res.json();
    const { city, town, village, county, state, country } = data.address ?? {};
    const place = city || town || village || county || '';
    if (place && state) return `${place}, ${state}`;
    if (place && country) return `${place}, ${country}`;
    return state || country || '';
  } catch {
    return '';
  }
}

/** Try to extract GPS from EXIF using exifr */
async function extractExifGps(imageUrl: string, authToken?: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    // Fetch just the first 128KB — EXIF is in the header
    const res = await fetch(imageUrl, {
      headers: { ...headers, Range: 'bytes=0-131072' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok && res.status !== 206) {
      // Range not supported — fetch full image (capped)
      const fullRes = await fetch(imageUrl, { headers, signal: AbortSignal.timeout(10000) });
      if (!fullRes.ok) {
        console.log('[detect-location] EXIF fetch failed:', fullRes.status);
        return null;
      }
      const buf = Buffer.from(await fullRes.arrayBuffer());
      const exifr = await import('exifr');
      const gps = await exifr.gps(buf);
      if (gps?.latitude && gps?.longitude) {
        return { lat: gps.latitude, lng: gps.longitude };
      }
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const exifr = await import('exifr');
    const gps = await exifr.gps(buf);
    if (gps?.latitude && gps?.longitude) {
      return { lat: gps.latitude, lng: gps.longitude };
    }
    return null;
  } catch (err) {
    console.log('[detect-location] EXIF extraction error:', err);
    return null;
  }
}

/** Use Gemini Vision to guess location from the photo */
async function aiGuessLocation(imageUrl: string, context?: string, authToken?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return '';

  try {
    // Fetch image and convert to base64
    const imgHeaders: Record<string, string> = {};
    if (authToken) imgHeaders['Authorization'] = `Bearer ${authToken}`;
    const imgRes = await fetch(imageUrl, { headers: imgHeaders, signal: AbortSignal.timeout(10000) });
    if (!imgRes.ok) return '';
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const base64 = imgBuf.toString('base64');
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

    const prompt = `Look at this photo and tell me WHERE it was taken. Identify the specific location if you can recognize:
- Landmarks, buildings, or monuments
- Street signs, store signs, or text visible in the photo
- Distinctive architecture or landscape features
- Beach, mountain, city skyline, or other geography
- Sports venues, stadiums, or arenas
- Restaurant or venue interiors with identifiable branding

${context ? `Context: This is for a ${context} celebration site.` : ''}

Respond with ONLY a JSON object:
{"location": "City, State/Country", "confidence": "high"|"medium"|"low", "details": "What you recognized"}

If you truly cannot identify ANY location clues, return:
{"location": "", "confidence": "none", "details": "No recognizable location features"}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: prompt },
            ],
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 200,
          },
        }),
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!res.ok) return '';
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    try {
      const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(cleaned);
      return parsed.location || '';
    } catch {
      // Try to extract location from raw text
      const match = text.match(/"location"\s*:\s*"([^"]+)"/);
      return match?.[1] || '';
    }
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { imageUrl, occasion } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    // Resolve the actual image URL — handle proxy URLs
    let resolvedUrl = imageUrl;
    if (imageUrl.includes('/api/photos/proxy')) {
      const urlParam = new URL(imageUrl, 'http://localhost').searchParams.get('url');
      if (urlParam) resolvedUrl = urlParam;
    }

    // For Google Photos URLs, we need the OAuth token to fetch
    const isGoogleUrl = resolvedUrl.includes('googleusercontent.com') || resolvedUrl.includes('google.com/');
    const accessToken = (session as any)?.accessToken;

    // Build a fetch-able URL — use internal proxy for Google Photos
    const fetchableUrl = isGoogleUrl && accessToken
      ? resolvedUrl  // We'll pass auth headers in extractExifGps/aiGuessLocation
      : resolvedUrl;

    console.log('[detect-location] Processing:', { isGoogleUrl, hasToken: !!accessToken, urlPreview: resolvedUrl.slice(0, 80) });

    // Strategy 1: EXIF GPS data
    const gps = await extractExifGps(fetchableUrl, isGoogleUrl ? accessToken : undefined);
    console.log('[detect-location] EXIF result:', gps ? `${gps.lat},${gps.lng}` : 'none');
    if (gps) {
      const location = await reverseGeocode(gps.lat, gps.lng);
      if (location) {
        return NextResponse.json({
          location,
          method: 'exif',
          confidence: 'high',
          coordinates: gps,
        });
      }
    }

    // Strategy 2: AI Vision analysis
    console.log('[detect-location] Trying AI Vision...');
    const aiLocation = await aiGuessLocation(fetchableUrl, occasion, isGoogleUrl ? accessToken : undefined);
    console.log('[detect-location] AI Vision result:', aiLocation || 'none');
    if (aiLocation) {
      return NextResponse.json({
        location: aiLocation,
        method: 'ai-vision',
        confidence: 'medium',
      });
    }

    // Nothing found
    return NextResponse.json({
      location: '',
      method: 'none',
      confidence: 'none',
    });
  } catch (error) {
    console.error('[detect-location] Error:', error);
    return NextResponse.json({
      location: '',
      method: 'error',
      confidence: 'none',
    });
  }
}
