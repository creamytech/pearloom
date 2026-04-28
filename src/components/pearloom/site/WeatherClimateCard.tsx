'use client';

// ─────────────────────────────────────────────────────────────
// WeatherClimateCard — climate normals around the event date,
// pulled from /api/weather/climate (Open-Meteo archive, 5-year
// average).
//
// Renders an editorial paper card with: a one-line summary
// ("Warm and mostly dry"), the avg high / low, rain probability,
// and a small sparkline of the past 5 years' high temperatures
// for the same calendar day. Lets hosts see "this week tends to
// be 78°F give or take a few" months ahead of the event when no
// forecast exists.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Icon } from '../motifs';

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

interface Props {
  lat: number;
  lng: number;
  date: string;
  /** Display unit. The host hasn't set a unit preference yet so we
   *  default to fahrenheit (US-leaning audience). Future option:
   *  derive from venue country code. */
  unit?: 'fahrenheit' | 'celsius';
}

export function WeatherClimateCard({ lat, lng, date, unit = 'fahrenheit' }: Props) {
  const [data, setData] = useState<ClimateNormals | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const u = new URL('/api/weather/climate', window.location.origin);
        u.searchParams.set('lat', String(lat));
        u.searchParams.set('lng', String(lng));
        u.searchParams.set('date', date);
        u.searchParams.set('unit', unit);
        const res = await fetch(u.toString());
        if (!res.ok) throw new Error(String(res.status));
        const d = (await res.json()) as ClimateNormals;
        if (!cancelled) setData(d);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [lat, lng, date, unit]);

  if (error || !data) return null;

  const symbol = data.unit === 'fahrenheit' ? '°F' : '°C';
  const emoji = weatherEmoji(data.dominantCode);
  // Map sample highs to a 0..1 sparkline range.
  const min = Math.min(...data.samples.map((s) => s.high));
  const max = Math.max(...data.samples.map((s) => s.high));
  const range = Math.max(1, max - min);

  return (
    <div
      style={{
        background: 'var(--card)',
        border: 'var(--pl-block-card-border-width, 1px) solid var(--card-ring)',
        borderRadius: 'var(--pl-block-card-radius, var(--pl-card-radius, 18px))',
        boxShadow: 'var(--pl-block-card-shadow, 0 2px 6px rgba(14,13,11,0.05))',
        padding: 'var(--pl-block-card-padding, 22px)',
        position: 'relative',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        alignItems: 'var(--pl-block-align-items, flex-start)' as React.CSSProperties['alignItems'],
        minWidth: 280,
        maxWidth: 360,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            background: 'var(--peach-bg, rgba(198,112,61,0.10))',
            display: 'grid',
            placeItems: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {emoji}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Around this time of year
          </div>
          <div
            className="display"
            style={{
              fontSize: 18,
              color: 'var(--ink)',
              marginTop: 2,
              lineHeight: 1.2,
            }}
          >
            {data.summary}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          width: '100%',
        }}
      >
        <Stat label="High" value={`${data.avgHigh}${symbol}`} />
        <Stat label="Low" value={`${data.avgLow}${symbol}`} />
        <Stat
          label="Rain"
          value={`${data.rainProbability}%`}
          help={data.avgRainyDays > 0 ? `${data.avgRainyDays} day${data.avgRainyDays === 1 ? '' : 's'}/wk` : undefined}
        />
      </div>

      {/* 5-year sparkline. Each bar is one year's high temp on the
          event date so hosts can see year-over-year variance at a
          glance — "78, 76, 81, 79, 80" reads steady; a wild
          swing tells them to pad the day with a backup plan. */}
      <div style={{ width: '100%' }}>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-muted)',
            marginBottom: 6,
            fontFamily: 'var(--font-ui)',
          }}
        >
          Past 5 years on this date
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 6,
            height: 44,
          }}
        >
          {data.samples.map((s) => {
            const t = (s.high - min) / range; // 0..1
            const h = 18 + Math.round(t * 22);
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
                    maxWidth: 22,
                    height: h,
                    borderRadius: 4,
                    background: wet
                      ? 'rgba(149,141,176,0.55)'
                      : 'var(--peach-ink, #C6703D)',
                    opacity: 0.85,
                  }}
                />
                <div
                  style={{
                    fontSize: 9,
                    color: 'var(--ink-muted)',
                    fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {String(s.year).slice(-2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          fontSize: 11,
          color: 'var(--ink-muted)',
          lineHeight: 1.45,
          fontFamily: 'var(--font-ui)',
          fontStyle: 'italic',
        }}
      >
        <Icon name="leaf" size={10} color="var(--ink-muted)" /> Climate normals from {data.samples[data.samples.length - 1]?.year}–{data.samples[0]?.year}
      </div>
    </div>
  );
}

function Stat({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '10px 12px',
        background: 'var(--cream-2, #F5EFE2)',
        border: '1px solid var(--line-soft)',
        borderRadius: 10,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {label}
      </div>
      <div
        className="display"
        style={{
          fontSize: 22,
          color: 'var(--ink)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {help && (
        <div
          style={{
            fontSize: 9.5,
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-ui)',
            letterSpacing: '0.04em',
          }}
        >
          {help}
        </div>
      )}
    </div>
  );
}

// WMO weather code → single emoji. We don't ship every nuance —
// just enough to give the card a recognisable mood at a glance.
function weatherEmoji(code: number): string {
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
