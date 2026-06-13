// ─────────────────────────────────────────────────────────────
// /api/weather/climate
//
// Climate-normals lookup for the venue location around the event
// date. Pulls actual historical daily weather from Open-Meteo's
// archive API (free, no key, accurate to 1940-present) for the
// same calendar week of the past 5 years and averages the high,
// low, and precipitation values. Surfaces a one-line summary so
// hosts get a feel for what to expect — "warm and dry" vs.
// "cool, expect rain".
//
// Why historical instead of forecast: weddings book ~6-12 months
// out. Forecasts only reach 16 days. Climate normals are far more
// useful for "should we plan an outdoor cocktail hour?"
//
// Cache aggressively — climatology doesn't change. 1-day Vercel
// edge cache + the URL params dedupe across pageviews.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Run-time fallback when the upstream is slow or down. Picked to
// cap individual fetch attempts at ~3s so the whole route never
// pegs above ~6s.
const FETCH_TIMEOUT_MS = 3000;
const SAMPLES_BACK = 5;

interface DailyArchive {
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    weather_code?: number[];
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get('lat') ?? '');
  const lng = parseFloat(url.searchParams.get('lng') ?? '');
  const date = url.searchParams.get('date') ?? '';
  const unit = (url.searchParams.get('unit') ?? 'fahrenheit') as 'fahrenheit' | 'celsius';

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat / lng required' }, { status: 400 });
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) {
    return NextResponse.json({ error: 'date in YYYY-MM-DD required' }, { status: 400 });
  }
  const month = m[2];
  const day = m[3];

  // Pick five years back, skipping the current and prior year so
  // we don't accidentally hit the not-yet-archived window. Open-
  // Meteo's archive lags by ~5 days from real time.
  const baseYear = new Date().getUTCFullYear() - 1;
  const years = Array.from({ length: SAMPLES_BACK }, (_, i) => baseYear - 1 - i);

  // Fetch each year's same-day in parallel. Each year's request
  // also pulls the surrounding 6 days so we have a 7-day window
  // — useful for spotting a precip pattern that's just one day
  // off from the wedding date.
  const results = await Promise.allSettled(
    years.map(async (year) => {
      const start = `${year}-${month}-${day}`;
      const startD = new Date(`${start}T00:00:00Z`);
      const endD = new Date(startD.getTime() + 6 * 86_400_000);
      const end = endD.toISOString().slice(0, 10);
      const u = new URL('https://archive-api.open-meteo.com/v1/archive');
      u.searchParams.set('latitude', lat.toFixed(4));
      u.searchParams.set('longitude', lng.toFixed(4));
      u.searchParams.set('start_date', start);
      u.searchParams.set('end_date', end);
      u.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code');
      u.searchParams.set('temperature_unit', unit);
      u.searchParams.set('timezone', 'auto');
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(u.toString(), { signal: ctrl.signal, cache: 'force-cache' });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as DailyArchive;
        return { year, data };
      } finally {
        clearTimeout(timer);
      }
    }),
  );

  // Aggregate. We use the *day* of the event for the headline
  // numbers and the full 7-day window for precip patterns.
  const dayHighs: number[] = [];
  const dayLows: number[] = [];
  const weekPrecipDays: number[] = []; // count of rainy days per year-week
  const weekPrecipSums: number[] = []; // total precipitation each year-week
  const weatherCodes: number[] = [];

  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const daily = r.value.data?.daily;
    if (!daily) continue;
    const max = daily.temperature_2m_max?.[0];
    const min = daily.temperature_2m_min?.[0];
    const code = daily.weather_code?.[0];
    if (typeof max === 'number') dayHighs.push(max);
    if (typeof min === 'number') dayLows.push(min);
    if (typeof code === 'number') weatherCodes.push(code);
    const precip = daily.precipitation_sum ?? [];
    const rainyDays = precip.filter((p) => p > 1).length;
    const totalPrecip = precip.reduce((acc, p) => acc + (p ?? 0), 0);
    weekPrecipDays.push(rainyDays);
    weekPrecipSums.push(totalPrecip);
  }

  if (dayHighs.length === 0) {
    return NextResponse.json({ error: 'No archive data for this location' }, { status: 502 });
  }

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const avgHigh = Math.round(avg(dayHighs));
  const avgLow = Math.round(avg(dayLows));
  const rainProbability = Math.round((avg(weekPrecipDays) / 7) * 100);
  const dominantCode = mode(weatherCodes);
  const summary = describe(avgHigh, avgLow, rainProbability, dominantCode, unit);

  const body = {
    avgHigh,
    avgLow,
    unit,
    /** Percent chance of measurable rain on any given day in the
     *  surrounding week, averaged across the 5 sample years. */
    rainProbability,
    /** Average days with > 1mm precipitation per 7-day window. */
    avgRainyDays: Math.round(avg(weekPrecipDays) * 10) / 10,
    /** Most-common WMO weather code for the event day across the
     *  sample years. UI maps this to an emoji + short label. */
    dominantCode,
    summary,
    /** Per-year sample for the actual event day — useful for a
     *  sparkline showing year-over-year variation. */
    samples: dayHighs.map((high, i) => ({
      year: years[i],
      high,
      low: dayLows[i] ?? null,
      precip: weekPrecipSums[i] ?? 0,
    })),
  };

  return NextResponse.json(body, {
    headers: {
      // 24h browser cache, 7d edge revalidate. Climatology never
      // changes within a session — safe to cache hard.
      'Cache-Control': 's-maxage=604800, stale-while-revalidate=86400',
    },
  });
}

function mode(xs: number[]): number {
  if (xs.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  let best = xs[0];
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) { best = k; bestN = n; }
  }
  return best;
}

function describe(high: number, low: number, rainPct: number, code: number, unit: 'fahrenheit' | 'celsius'): string {
  // Pearloom voice — short, observational, never too technical.
  // High in Fahrenheit; convert thresholds when celsius.
  const hF = unit === 'fahrenheit' ? high : Math.round(high * 9 / 5 + 32);
  const wet = rainPct >= 35;
  const stormy = code >= 80; // WMO codes 80+ = thunderstorms / heavy showers
  const snow = code >= 71 && code <= 77;

  let warmth: string;
  if (hF >= 85) warmth = 'hot';
  else if (hF >= 72) warmth = 'warm';
  else if (hF >= 60) warmth = 'mild';
  else if (hF >= 45) warmth = 'crisp';
  else warmth = 'cold';

  if (snow) return `${cap(warmth)}, often snowy`;
  if (stormy) return `${cap(warmth)}, often stormy`;
  if (wet) return `${cap(warmth)}, often rainy`;
  if (hF >= 78) return `${cap(warmth)} and dry`;
  return `${cap(warmth)} and mostly dry`;
  void low;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
