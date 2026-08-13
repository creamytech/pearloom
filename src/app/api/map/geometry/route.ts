// ─────────────────────────────────────────────────────────────
// /api/map/geometry — real streets for the map plate
//
// GET ?lat=..&lng=..        → plate geometry around that point
// GET ?q=<venue address>    → geocode first (Nominatim), then fetch
//
// Fetches real roads / water / parks from OpenStreetMap's Overpass
// API and returns them projected into the plate's 800×460 viewBox
// (src/lib/map-geometry.ts). The published site draws them in the
// site's own --t-* tints — an ACCURATE map in Pearloom's design
// language, no Google iframe.
//
// Data © OpenStreetMap contributors (ODbL) — the plate credits
// them in its caption. Usage stays friendly: one venue = one
// query, cached in-process AND at the CDN for 30 days (streets
// don't move), mirror fallback, honest { ok: false } on failure —
// the client keeps the drawn plate.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { overpassQuery, shapeOverpass, type PlateGeometryData } from '@/lib/map-geometry';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const OVERPASS_HOSTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const UA = 'pearloom/1.0 (map plate; contact: support@pearloom.com)';

/* In-process caches. Geometry is keyed at ~11 m precision so tiny
   coordinate drift (re-geocodes) still hits. Both caps are far
   above one process's realistic working set. */
const geoCache = new Map<string, PlateGeometryData | null>();
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800',
};

async function geocode(q: string): Promise<{ lat: number; lng: number } | null> {
  const key = q.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;
  let coords: { lat: number; lng: number } | null = null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) },
    );
    if (res.ok) {
      const rows = (await res.json()) as Array<{ lat?: string; lon?: string }>;
      const lat = parseFloat(rows?.[0]?.lat ?? '');
      const lng = parseFloat(rows?.[0]?.lon ?? '');
      if (Number.isFinite(lat) && Number.isFinite(lng)) coords = { lat, lng };
    }
  } catch { /* stays null */ }
  if (geocodeCache.size > 500) geocodeCache.clear();
  geocodeCache.set(key, coords);
  return coords;
}

async function fetchOverpass(lat: number, lng: number): Promise<unknown | null> {
  const body = `data=${encodeURIComponent(overpassQuery(lat, lng))}`;
  for (const host of OVERPASS_HOSTS) {
    try {
      const res = await fetch(host, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body,
        signal: AbortSignal.timeout(14000),
      });
      if (res.ok) return await res.json();
      console.warn('[map/geometry] overpass', host, res.status);
    } catch (err) {
      console.warn('[map/geometry] overpass failed', host, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`map-geometry:${ip}`, { max: 30, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  let lat = parseFloat(searchParams.get('lat') ?? '');
  let lng = parseFloat(searchParams.get('lng') ?? '');
  const q = (searchParams.get('q') ?? '').trim();

  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && q.length > 3) {
    const g = await geocode(q);
    if (g) { lat = g.lat; lng = g.lng; }
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) {
    return NextResponse.json({ ok: false }, { headers: CACHE_HEADERS });
  }

  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geoCache.has(key)) {
    const hit = geoCache.get(key);
    return hit
      ? NextResponse.json({ ok: true, center: { lat, lng }, geometry: hit }, { headers: CACHE_HEADERS })
      : NextResponse.json({ ok: false }, { headers: CACHE_HEADERS });
  }

  const raw = await fetchOverpass(lat, lng);
  if (geoCache.size > 300) geoCache.clear();
  if (!raw) {
    /* Don't cache-poison a transient outage for 30 days at the CDN —
       short client cache only; the in-process null stops hammering. */
    geoCache.set(key, null);
    return NextResponse.json({ ok: false }, { headers: { 'Cache-Control': 'public, max-age=300' } });
  }

  const geometry = shapeOverpass(raw, lat, lng);
  const empty = geometry.roads.length === 0 && geometry.water.length === 0
    && geometry.waterAreas.length === 0 && geometry.parks.length === 0;
  geoCache.set(key, empty ? null : geometry);
  if (empty) {
    /* A venue in the open countryside — honest miss, the drawn
       plate carries it. */
    return NextResponse.json({ ok: false }, { headers: CACHE_HEADERS });
  }
  return NextResponse.json({ ok: true, center: { lat, lng }, geometry }, { headers: CACHE_HEADERS });
}
