'use client';

// ─────────────────────────────────────────────────────────────
// WeatherStrip — single editorial weather row that replaces the
// awkward stack of two side-by-side cards (live WeatherWidget +
// WeatherClimateCard) under the Details strip. Lives below the
// Details cards as its own row, full-width to the section's
// 1160px frame.
//
// Three regions on a single horizontal strip, each separated by
// a peach hairline rule:
//
//   ┌── this day (≤14 days) ────┬── on average ───┬── past 5 yrs ──┐
//   │  ☀️ 72° / 58°             │ 78° / 62°       │  ▂▃▅▄▃          │
//   │  8% rain · sunny           │ Warm + dry      │  '20 — '24      │
//   └────────────────────────────┴─────────────────┴────────────────┘
//
// "This day" only renders when the event is within ~14 days. The
// climate normals + sparkline always render once the venue has
// lat/lng. Empty states fall through gracefully — strip hides
// entirely if neither has data.
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
  /** Venue latitude — required for climate normals. */
  lat: number | undefined;
  /** Venue longitude — required for climate normals. */
  lng: number | undefined;
  /** ISO YYYY-MM-DD event date — required for both. */
  date: string | undefined;
  /** Display unit. Defaults fahrenheit until we add a per-site
   *  preference (could derive from venue country). */
  unit?: 'fahrenheit' | 'celsius';
  /** City fallback for the live forecast geocoding. */
  city?: string;
}

export function WeatherStrip({ lat, lng, date, unit = 'fahrenheit', city }: Props) {
  const [climate, setClimate] = useState<ClimateNormals | null>(null);
  const [forecast, setForecast] = useState<DayForecast | null>(null);
  const [climateError, setClimateError] = useState(false);

  // Days until event — used to decide whether the live forecast
  // is even worth fetching (Open-Meteo only goes 16 days out).
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
  // Keep showing while loading — the strip is small enough that
  // a brief skeleton beats a layout pop. But if climate failed
  // outright AND no live forecast, don't render anything.
  if (climateError && !forecast) return null;
  if (!climate && !forecast) {
    return <WeatherStripSkeleton />;
  }

  const symbol = (climate?.unit ?? unit) === 'fahrenheit' ? '°' : '°';
  const showForecast = forecast != null;

  return (
    <section
      aria-label="Weather around the event"
      style={{
        marginTop: 28,
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 'var(--pl-block-card-radius, var(--pl-card-radius, 18px))',
        boxShadow: 'var(--pl-block-card-shadow, 0 2px 8px rgba(14,13,11,0.04))',
        padding: 'var(--pl-block-card-padding, 22px) 28px',
        position: 'relative',
        color: 'var(--ink)',
        display: 'grid',
        gridTemplateColumns: showForecast && climate
          ? '1fr 1px 1fr 1px 1fr'
          : climate
            ? '1fr 1px 1.2fr'
            : '1fr',
        gap: 22,
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {showForecast && (
        <Region eyebrow="On the day" emoji={emojiFor(forecast.code)}>
          <div style={numberStackStyle}>
            <Temp value={forecast.tempMax} symbol={symbol} large />
            <Temp value={forecast.tempMin} symbol={symbol} muted />
          </div>
          <SubtleLine>
            {forecast.precip}% chance of rain · {labelFor(forecast.code).toLowerCase()}
          </SubtleLine>
        </Region>
      )}

      {showForecast && climate && <Divider />}

      {climate && (
        <Region
          eyebrow="Around this time"
          emoji={emojiFor(climate.dominantCode)}
        >
          <div style={numberStackStyle}>
            <Temp value={climate.avgHigh} symbol={symbol} large />
            <Temp value={climate.avgLow} symbol={symbol} muted />
          </div>
          <SubtleLine>
            <em style={{ fontStyle: 'italic' }}>{climate.summary}</em>
            {' · '}
            {climate.rainProbability}% rain
          </SubtleLine>
        </Region>
      )}

      {climate && climate.samples.length > 0 && <Divider />}

      {climate && climate.samples.length > 0 && (
        <Region eyebrow="Past 5 years">
          <Sparkline samples={climate.samples} symbol={symbol} />
        </Region>
      )}
    </section>
  );
}

function Region({
  eyebrow,
  emoji,
  children,
}: {
  eyebrow: string;
  emoji?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {emoji && (
          <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>
            {emoji}
          </span>
        )}
        {eyebrow}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div
      aria-hidden
      style={{
        width: 1,
        height: 56,
        background: 'linear-gradient(to bottom, transparent 0%, var(--peach-ink, #C6703D) 50%, transparent 100%)',
        opacity: 0.35,
      }}
    />
  );
}

function Temp({ value, symbol, large = false, muted = false }: { value: number; symbol: string; large?: boolean; muted?: boolean }) {
  return (
    <span
      className="display"
      style={{
        fontSize: large ? 32 : 20,
        fontWeight: 600,
        color: muted ? 'var(--ink-soft)' : 'var(--ink)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}
    >
      {Math.round(value)}{symbol}
    </span>
  );
}

const numberStackStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 10,
};

function SubtleLine({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: 'var(--ink-soft)',
        lineHeight: 1.45,
        fontFamily: 'var(--font-ui)',
        letterSpacing: 0,
      }}
    >
      {children}
    </div>
  );
}

function Sparkline({
  samples,
  symbol,
}: {
  samples: Array<{ year: number; high: number; precip: number }>;
  symbol: string;
}) {
  const min = Math.min(...samples.map((s) => s.high));
  const max = Math.max(...samples.map((s) => s.high));
  const range = Math.max(1, max - min);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          height: 38,
        }}
      >
        {samples.map((s) => {
          const t = (s.high - min) / range;
          const h = 14 + Math.round(t * 24);
          const wet = s.precip >= 5;
          return (
            <div
              key={s.year}
              title={`${s.year}: ${Math.round(s.high)}${symbol}${wet ? ' · rainy' : ''}`}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                minWidth: 0,
              }}
            >
              <div
                aria-hidden
                style={{
                  width: '100%',
                  maxWidth: 18,
                  height: h,
                  borderRadius: 3,
                  background: wet
                    ? 'rgba(149,141,176,0.6)'
                    : 'var(--peach-ink, #C6703D)',
                  opacity: 0.85,
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--ink-muted)',
                  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                  letterSpacing: '0.05em',
                }}
              >
                ’{String(s.year).slice(-2)}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-ui)',
          fontStyle: 'italic',
          letterSpacing: 0,
        }}
      >
        Climate normal · {samples[samples.length - 1]?.year}–{samples[0]?.year}
      </div>
    </div>
  );
}

function WeatherStripSkeleton() {
  return (
    <div
      aria-hidden
      style={{
        marginTop: 28,
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 'var(--pl-block-card-radius, var(--pl-card-radius, 18px))',
        padding: '22px 28px',
        display: 'flex',
        gap: 22,
        opacity: 0.55,
      }}
    >
      <div style={{ flex: 1, height: 56, background: 'var(--cream-2, #F5EFE2)', borderRadius: 8 }} />
      <div style={{ flex: 1, height: 56, background: 'var(--cream-2, #F5EFE2)', borderRadius: 8 }} />
      <div style={{ flex: 1, height: 56, background: 'var(--cream-2, #F5EFE2)', borderRadius: 8 }} />
    </div>
  );
}

// WMO weather code → emoji + label.
function emojiFor(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}
function labelFor(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95) return 'Storms';
  return 'Mixed';
}
