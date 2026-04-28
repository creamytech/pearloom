'use client';

// ─────────────────────────────────────────────────────────────
// WeatherStrip — single editorial line under the Details cards
// that reads like a weather column from a print magazine, not a
// dashboard tile. No emojis (custom SVG glyph instead), no bar
// chart, no stat tiles. Just one Fraunces italic sentence with
// the venue's average climate around the event date — and a
// second sentence for the live forecast when the event is
// within ~14 days.
//
// Pearloom voice: observational, never too technical. "Around
// the second week of September, this stretch of the coast tends
// to land warm and dry — afternoons near 78°, evenings cooling
// to about 62°."
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';

interface ClimateNormals {
  avgHigh: number;
  avgLow: number;
  unit: 'fahrenheit' | 'celsius';
  rainProbability: number;
  avgRainyDays: number;
  dominantCode: number;
  summary: string;
  samples: Array<{ year: number; high: number; low: number | null; precip: number }>;
}

interface DayForecast {
  tempMax: number;
  tempMin: number;
  precip: number;
  code: number;
}

interface Props {
  lat: number | undefined;
  lng: number | undefined;
  date: string | undefined;
  unit?: 'fahrenheit' | 'celsius';
  city?: string;
  /** Voice override — 'poetic' is the default editorial column;
   *  'plain' drops the metaphors; 'brief' is one short sentence. */
  voice?: 'poetic' | 'plain' | 'brief';
  /** Glyph treatment — line is the default; 'filled' uses the
   *  filled glyph variants; 'none' hides the glyph entirely so
   *  the line reads as pure prose. */
  glyph?: 'line' | 'filled' | 'none';
  /** Hide the strip on the day-of? Hosts of memorials sometimes
   *  prefer to remove forecast chatter once the day arrives. */
  hideOnDay?: boolean;
}

// Day-of detection — daysOut is computed below; if hideOnDay is set
// and we're within 1 day of the event, return null entirely.
export function WeatherStrip({ lat, lng, date, unit = 'fahrenheit', city, voice = 'poetic', glyph = 'line', hideOnDay }: Props) {
  const [climate, setClimate] = useState<ClimateNormals | null>(null);
  const [forecast, setForecast] = useState<DayForecast | null>(null);
  const [climateError, setClimateError] = useState(false);

  const daysOut = useMemo(() => {
    if (!date) return Infinity;
    return Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / 86_400_000);
  }, [date]);

  useEffect(() => {
    if (!date) return;
    if (lat == null || lng == null) return;
    let cancelled = false;
    async function load() {
      try {
        const u = new URL('/api/weather/climate', window.location.origin);
        u.searchParams.set('lat', String(lat));
        u.searchParams.set('lng', String(lng));
        u.searchParams.set('date', date as string);
        u.searchParams.set('unit', unit);
        const res = await fetch(u.toString());
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as ClimateNormals;
        if (!cancelled) setClimate(data);
      } catch {
        if (!cancelled) setClimateError(true);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [lat, lng, date, unit]);

  useEffect(() => {
    if (!date || !city) return;
    if (daysOut > 14 || daysOut < -1) return;
    let cancelled = false;
    async function load() {
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city as string)}&count=1`);
        const geo = await geoRes.json();
        const r = geo?.results?.[0];
        if (!r?.latitude) return;
        const fcRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${r.latitude}&longitude=${r.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&start_date=${date}&end_date=${date}&temperature_unit=${unit}&timezone=auto`,
        );
        const fc = await fcRes.json();
        const day = fc?.daily;
        if (!day || cancelled) return;
        setForecast({
          tempMax: Math.round(day.temperature_2m_max?.[0] ?? 0),
          tempMin: Math.round(day.temperature_2m_min?.[0] ?? 0),
          precip: day.precipitation_probability_max?.[0] ?? 0,
          code: day.weather_code?.[0] ?? 0,
        });
      } catch { /* ignore */ }
    }
    void load();
    return () => { cancelled = true; };
  }, [city, date, daysOut, unit]);

  if (!date) return null;
  if (lat == null || lng == null) return null;
  if (climateError && !forecast) return null;
  if (!climate && !forecast) return null;
  // Day-of suppression — host opt-in. Two days before through one
  // day after the event, hide the strip if hideOnDay is true.
  if (hideOnDay && Math.abs(daysOut) <= 1) return null;

  // Pick the glyph from whichever data we have. Forecast wins
  // when present (it's the most relevant signal) — otherwise the
  // climate-normal dominant code.
  const glyphCode = forecast?.code ?? climate?.dominantCode ?? 0;

  // Compose the editorial line. Voice picks one of three registers:
  //   poetic — full editorial column with metaphor
  //   plain  — same facts, no metaphor (just observed numbers)
  //   brief  — one short sentence, no follow-up forecast
  // Climate sentence is always first (it's the broader context);
  // forecast sentence appends when available — except in brief.
  const climateLine = climate ? composeClimateLine(climate, date, voice) : null;
  const forecastLine = forecast && voice !== 'brief'
    ? composeForecastLine(forecast, climate?.unit ?? unit)
    : null;

  return (
    <div
      style={{
        marginTop: 24,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        padding: '20px 24px',
        // Cream-2 ground with a single peach hairline left edge —
        // reads as an editorial pull-quote, not a dashboard card.
        background: 'transparent',
        borderLeft: '2px solid var(--peach-ink, #C6703D)',
        maxWidth: 720,
        margin: '24px auto 0',
      }}
    >
      {glyph !== 'none' && <WeatherGlyph code={glyphCode} size={28} filled={glyph === 'filled'} />}
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 17,
          lineHeight: 1.55,
          color: 'var(--ink-soft)',
          letterSpacing: '-0.005em',
        }}
      >
        {climateLine}
        {climateLine && forecastLine ? ' ' : ''}
        {forecastLine && (
          <span style={{ display: 'block', marginTop: 6, color: 'var(--ink)' }}>
            {forecastLine}
          </span>
        )}
      </p>
    </div>
  );
}

// ── Voice composition ─────────────────────────────────────────

function composeClimateLine(c: ClimateNormals, isoDate: string, voice: 'poetic' | 'plain' | 'brief' = 'poetic'): string {
  const symbol = c.unit === 'fahrenheit' ? '°' : '°';
  const monthWord = monthBucketFor(isoDate);
  const summary = c.summary.toLowerCase();
  const rainPhrase = rainPhraseFor(c.rainProbability);
  if (voice === 'brief') {
    return `Around ${monthWord}: ${c.avgHigh}${symbol} day, ${c.avgLow}${symbol} night.`;
  }
  if (voice === 'plain') {
    return `Around ${monthWord}, average highs near ${c.avgHigh}${symbol} and lows near ${c.avgLow}${symbol}${rainPhrase ? ' (' + rainPhrase + ')' : ''}.`;
  }
  return `Around ${monthWord} this corner tends to land ${summary} — afternoons near ${c.avgHigh}${symbol}, evenings cooling to about ${c.avgLow}${symbol}${rainPhrase ? ', ' + rainPhrase : ''}.`;
}

function composeForecastLine(f: DayForecast, unit: 'fahrenheit' | 'celsius'): string {
  const symbol = unit === 'fahrenheit' ? '°' : '°';
  const mood = labelFor(f.code).toLowerCase();
  const rain = f.precip >= 50
    ? `with rain in the cards`
    : f.precip >= 25
      ? `with a chance of a passing shower`
      : `and rain unlikely`;
  return `On the day, ${mood} weather: a high near ${f.tempMax}${symbol} and a low of ${f.tempMin}${symbol}, ${rain}.`;
}

function monthBucketFor(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return 'this time of year';
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  const monthName = MONTHS[month - 1];
  if (day <= 10) return `early ${monthName}`;
  if (day <= 20) return `mid-${monthName}`;
  return `late ${monthName}`;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function rainPhraseFor(pct: number): string {
  if (pct < 10) return 'and dry weather is the rule';
  if (pct < 25) return 'with rain a rare visitor';
  if (pct < 40) return 'with about a 1-in-4 chance of a passing shower';
  if (pct < 60) return 'with rain a real possibility';
  return 'with showers more often than not';
}

function labelFor(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 57) return 'Drizzly';
  if (code >= 61 && code <= 67) return 'Rainy';
  if (code >= 71 && code <= 77) return 'Snowy';
  if (code >= 80 && code <= 82) return 'Showery';
  if (code >= 95) return 'Stormy';
  return 'Mixed';
}

// ── Custom SVG glyphs ─────────────────────────────────────────
// Stroke-only, olive primary + peach accent, sized to match the
// editorial line they sit beside. Replace the default emoji set
// (☀️ ⛅ 🌧️ etc) so the page never reads as iOS-system.

function WeatherGlyph({ code, size = 28, filled = false }: { code: number; size?: number; filled?: boolean }) {
  const stroke = 'var(--olive, #5C6B3F)';
  const accent = 'var(--peach-ink, #C6703D)';
  const sw = 1.6;
  // Filled variant uses olive at 0.18 alpha as a subtle wash behind
  // the line drawing — same shape, more presence. Keeps stroke
  // visible so reduced-contrast viewers still see the icon outline.
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 32 32',
    fill: filled ? 'rgba(92,107,63,0.18)' : ('none' as const),
    stroke,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    style: { flexShrink: 0, marginTop: 2 } as React.CSSProperties,
  };

  // Clear / sun
  if (code === 0) {
    return (
      <svg {...props}>
        <circle cx="16" cy="16" r="5" />
        <path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2.1 2.1M22.4 22.4l2.1 2.1M7.5 24.5l2.1-2.1M22.4 9.6l2.1-2.1" />
      </svg>
    );
  }

  // Partly cloudy — sun behind a cloud
  if (code >= 1 && code <= 3) {
    return (
      <svg {...props}>
        <circle cx="11" cy="12" r="3.5" />
        <path d="M11 5v2M5 12h2M6.4 7.4l1.4 1.4M15.6 7.4l-1.4 1.4" strokeWidth={sw * 0.9} />
        <path d="M22 21h-9a4 4 0 1 1 .8-7.92A5 5 0 0 1 23 14a3 3 0 0 1-1 7Z" />
      </svg>
    );
  }

  // Fog — horizontal wavy lines
  if (code === 45 || code === 48) {
    return (
      <svg {...props}>
        <path d="M5 10c2-1.5 4 1 6.5-.5S17 9 19 11s5 .8 6 0" />
        <path d="M4 16c2-1.5 4 1 6.5-.5S17 15 19 17s5 .8 7 0" />
        <path d="M5 22c2-1.5 4 1 6.5-.5S17 21 19 23s5 .8 6 0" />
      </svg>
    );
  }

  // Drizzle — small drops
  if (code >= 51 && code <= 57) {
    return (
      <svg {...props}>
        <path d="M22 17h-9a4 4 0 1 1 .8-7.92A5 5 0 0 1 23 10a3 3 0 0 1-1 7Z" />
        <path d="M11 22v2M16 22v2M21 22v2" stroke={accent} strokeWidth={sw * 1.2} />
      </svg>
    );
  }

  // Rain — angled drops
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return (
      <svg {...props}>
        <path d="M22 16h-9a4 4 0 1 1 .8-7.92A5 5 0 0 1 23 9a3 3 0 0 1-1 7Z" />
        <path d="M11 21l-1 4M16 21l-1 4M21 21l-1 4" stroke={accent} strokeWidth={sw * 1.1} />
      </svg>
    );
  }

  // Snow — six-point flakes
  if (code >= 71 && code <= 77) {
    return (
      <svg {...props}>
        <path d="M22 16h-9a4 4 0 1 1 .8-7.92A5 5 0 0 1 23 9a3 3 0 0 1-1 7Z" />
        <path d="M11.5 22v3M11 22.5l1 2M12 22.5l-1 2" strokeWidth={sw * 0.9} />
        <path d="M16.5 22v3M16 22.5l1 2M17 22.5l-1 2" strokeWidth={sw * 0.9} />
        <path d="M21.5 22v3M21 22.5l1 2M22 22.5l-1 2" strokeWidth={sw * 0.9} />
      </svg>
    );
  }

  // Storm — cloud + lightning bolt
  if (code >= 95) {
    return (
      <svg {...props}>
        <path d="M22 14h-9a4 4 0 1 1 .8-7.92A5 5 0 0 1 23 7a3 3 0 0 1-1 7Z" />
        <path d="M15 17l-2 5h3l-2 5" stroke={accent} strokeWidth={sw * 1.2} fill="none" />
      </svg>
    );
  }

  // Default — partly cloudy
  return (
    <svg {...props}>
      <circle cx="11" cy="12" r="3.5" />
      <path d="M22 21h-9a4 4 0 1 1 .8-7.92A5 5 0 0 1 23 14a3 3 0 0 1-1 7Z" />
    </svg>
  );
}
