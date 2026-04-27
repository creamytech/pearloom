'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/ItineraryBlock.tsx
//
// Multi-day hourly itinerary. Used by bachelor/ette parties,
// family reunions, destination-wedding welcome parties, and
// morning-after brunches. Each day is a card; each slot within
// the day is a single row: time · title · optional detail.
//
// Data source: PageBlock.config.days — an array of day objects.
// Falls back to a single empty-state card in edit mode so hosts
// see what they're adding.
//
// Kept intentionally lean — no fancy parallax or hover
// choreography. The itinerary's job is to be glanceable at 3am
// when a guest is wondering when brunch is.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';

export interface ItinerarySlot {
  /** 24h time string, e.g. "09:30" — also accepts free-form like "All day". */
  time?: string;
  /** Short title for the slot, e.g. "Hotel check-in". */
  title: string;
  /** Optional longer detail shown under the title. */
  detail?: string;
  /** Optional location / venue for the slot. */
  location?: string;
}

export interface ItineraryDay {
  /** Short day label — "Friday" or "Day 1" or "Arrival day". */
  label: string;
  /** Optional ISO date ("2026-07-18") — shown as a subtitle if provided. */
  date?: string;
  slots: ItinerarySlot[];
}

interface ItineraryBlockProps {
  title?: string;
  subtitle?: string;
  days: ItineraryDay[];
  /** Accent colour from the site's palette. */
  accent?: string;
  /** Foreground ink colour. */
  foreground?: string;
  /** Muted / subtitle colour. */
  muted?: string;
  /** Heading font stack. */
  headingFont?: string;
  /** Body font stack. */
  bodyFont?: string;
  /** Wraps the whole block with the parent section's background/padding tokens. */
  style?: CSSProperties;
}

export function ItineraryBlock({
  title,
  subtitle,
  days,
  accent = 'var(--pl-olive)',
  foreground = 'var(--pl-ink)',
  muted = 'var(--pl-muted)',
  headingFont = 'var(--pl-font-display, Georgia, serif)',
  bodyFont = 'var(--pl-font-body, system-ui, sans-serif)',
  style,
}: ItineraryBlockProps) {
  return (
    <section
      style={{
        padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 64px)',
        color: foreground,
        fontFamily: bodyFont,
        ...style,
      }}
      data-pe-section="itinerary"
    >
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        {(title || subtitle) && (
          <header style={{ textAlign: 'center', marginBottom: 48 }}>
            {title && (
              <h2
                className="pl-display"
                style={{
                  margin: 0,
                  fontFamily: headingFont,
                  fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                  color: foreground,
                  fontStyle: 'italic',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                style={{
                  margin: '12px auto 0',
                  maxWidth: '58ch',
                  color: muted,
                  fontSize: 'clamp(0.96rem, 1.2vw, 1.06rem)',
                  lineHeight: 1.6,
                }}
              >
                {subtitle}
              </p>
            )}
          </header>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {days.map((day, dayIdx) => (
            <article
              key={`${day.label}-${dayIdx}`}
              style={{
                border: '1px solid var(--pl-divider)',
                borderRadius: 'var(--pl-radius-lg)',
                background: 'var(--pl-cream-card)',
                overflow: 'hidden',
              }}
            >
              <header
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--pl-divider-soft)',
                  background: `color-mix(in oklab, ${accent} 8%, transparent)`,
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 14,
                }}
              >
                <span
                  style={{
                    fontFamily: headingFont,
                    fontStyle: 'italic',
                    fontSize: '1.35rem',
                    color: foreground,
                    letterSpacing: '-0.01em',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  {day.label}
                </span>
                {day.date && (
                  <span
                    style={{
                      fontFamily: 'var(--pl-font-mono, ui-monospace)',
                      fontSize: '0.62rem',
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: muted,
                    }}
                  >
                    {formatItineraryDate(day.date)}
                  </span>
                )}
              </header>

              <ol
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {day.slots.length === 0 ? (
                  <li
                    style={{
                      padding: '20px 24px',
                      color: muted,
                      fontStyle: 'italic',
                      fontSize: '0.9rem',
                    }}
                  >
                    Nothing yet. Begin a thread.
                  </li>
                ) : (
                  day.slots.map((slot, slotIdx) => (
                    <li
                      key={`${slot.title}-${slotIdx}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(80px, 120px) 1fr',
                        gap: 20,
                        padding: '16px 24px',
                        borderTop: slotIdx > 0 ? '1px solid var(--pl-divider-soft)' : undefined,
                        alignItems: 'baseline',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--pl-font-mono, ui-monospace)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          letterSpacing: '0.2em',
                          textTransform: 'uppercase',
                          color: accent,
                        }}
                      >
                        {slot.time || '—'}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span
                          style={{
                            fontFamily: headingFont,
                            fontSize: '1.05rem',
                            fontWeight: 500,
                            color: foreground,
                            letterSpacing: '-0.005em',
                          }}
                        >
                          {slot.title}
                        </span>
                        {slot.location && (
                          <span
                            style={{
                              fontSize: '0.82rem',
                              color: muted,
                              fontStyle: 'italic',
                            }}
                          >
                            {slot.location}
                          </span>
                        )}
                        {slot.detail && (
                          <span
                            style={{
                              marginTop: 2,
                              fontSize: '0.9rem',
                              color: 'var(--pl-ink-soft)',
                              lineHeight: 1.55,
                            }}
                          >
                            {slot.detail}
                          </span>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ol>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatItineraryDate(iso: string): string {
  try {
    const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'));
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}
