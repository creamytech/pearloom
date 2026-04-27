'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/groove/GrooveSiteEvents.tsx
//
// Event cards for groove-family sites — each event rendered
// as a bubble card with the accent palette, rotating tilts,
// wavy separators.
// ─────────────────────────────────────────────────────────────

import type { WeddingEvent } from '@/types';

interface GrooveSiteEventsProps {
  events: WeddingEvent[];
  title?: string;
  accent: string;
  accent2?: string;
  foreground: string;
  background: string;
  muted?: string;
  headingFont: string;
  bodyFont: string;
}

export function GrooveSiteEvents({
  events,
  title = 'The schedule',
  accent,
  foreground,
  background,
  muted,
  headingFont,
  bodyFont,
}: GrooveSiteEventsProps) {
  if (!events?.length) return null;

  return (
    <section
      id="schedule"
      style={{
        padding: 'clamp(72px, 12vw, 140px) clamp(20px, 5vw, 64px)',
        background: `color-mix(in oklab, ${accent} 7%, ${background})`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 56px' }}>
          <div
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: accent,
              marginBottom: 16,
            }}
          >
            When &amp; where
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: `"${headingFont}", Georgia, serif`,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: foreground,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            {title}
          </h2>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`,
            gap: 20,
          }}
        >
          {events.map((event, i) => {
            const tilt = (i % 2 === 0 ? -1 : 1) * (1 + (i % 3) * 0.3);
            return (
              <article
                key={event.id || i}
                style={{
                  padding: 'clamp(24px, 3.5vw, 36px)',
                  background: `color-mix(in oklab, ${accent} ${8 + (i % 3) * 6}%, ${background})`,
                  borderRadius: 28,
                  border: `1px solid color-mix(in oklab, ${accent} 22%, transparent)`,
                  transform: `rotate(${tilt}deg)`,
                  transition:
                    'transform var(--pl-dur-base) var(--pl-groove-ease-bloom),' +
                    ' box-shadow var(--pl-dur-base) var(--pl-ease-out)',
                  boxShadow: `0 2px 6px color-mix(in oklab, ${accent} 14%, transparent), 0 14px 40px color-mix(in oklab, ${accent} 10%, transparent)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'rotate(0deg) translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 4px 10px color-mix(in oklab, ${accent} 18%, transparent), 0 24px 56px color-mix(in oklab, ${accent} 20%, transparent)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = `rotate(${tilt}deg)`;
                  e.currentTarget.style.boxShadow = `0 2px 6px color-mix(in oklab, ${accent} 14%, transparent), 0 14px 40px color-mix(in oklab, ${accent} 10%, transparent)`;
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: accent,
                    marginBottom: 14,
                  }}
                >
                  № 0{i + 1}
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: `"${headingFont}", Georgia, serif`,
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)',
                    lineHeight: 1.12,
                    letterSpacing: '-0.01em',
                    color: foreground,
                  }}
                >
                  {event.name || event.type || 'Event'}
                </h3>
                {event.date && (
                  <div
                    style={{
                      marginTop: 14,
                      fontFamily: `"${bodyFont}", system-ui, sans-serif`,
                      fontSize: '0.96rem',
                      fontWeight: 600,
                      color: foreground,
                    }}
                  >
                    {formatEventDate(event.date, event.time)}
                  </div>
                )}
                {event.venue && (
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: `"${bodyFont}", system-ui, sans-serif`,
                      fontSize: '0.92rem',
                      color: muted ?? foreground,
                      opacity: 0.88,
                    }}
                  >
                    {event.venue}
                  </div>
                )}
                {event.address && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: '0.86rem',
                      color: muted ?? foreground,
                      opacity: 0.72,
                    }}
                  >
                    {event.address}
                  </div>
                )}
                {event.description && (
                  <p
                    style={{
                      margin: '18px 0 0',
                      fontSize: '0.94rem',
                      lineHeight: 1.55,
                      color: foreground,
                      opacity: 0.84,
                    }}
                  >
                    {event.description}
                  </p>
                )}
                {event.dressCode && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: '6px 12px',
                      display: 'inline-block',
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: accent,
                      border: `1px solid color-mix(in oklab, ${accent} 38%, transparent)`,
                      borderRadius: 999,
                    }}
                  >
                    {event.dressCode}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function formatEventDate(raw: string, time?: string): string {
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    const datePart = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return time ? `${datePart} · ${time}` : datePart;
  } catch {
    return raw;
  }
}
