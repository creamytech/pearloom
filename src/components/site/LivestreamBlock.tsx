'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/LivestreamBlock.tsx
//
// "Watch live" callout for memorials, destination weddings,
// graduations. A prominent CTA with start time + a time-zone
// helper so far-away guests know when to tune in.
// Intentional scope: no embedded player for now — we link out.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';

interface LivestreamBlockProps {
  title?: string;
  subtitle?: string;
  /** ISO datetime string, e.g. "2026-06-14T18:00:00-04:00". */
  startsAt?: string;
  /** URL — Zoom, YouTube, Vimeo, custom. */
  url: string;
  /** Label for the CTA. */
  buttonLabel?: string;
  accent?: string;
  foreground?: string;
  muted?: string;
  headingFont?: string;
  bodyFont?: string;
  style?: CSSProperties;
}

export function LivestreamBlock({
  title = 'Watch live',
  subtitle,
  startsAt,
  url,
  buttonLabel = 'Open the livestream',
  accent = 'var(--pl-olive)',
  foreground = 'var(--pl-ink)',
  muted = 'var(--pl-muted)',
  headingFont = 'var(--pl-font-display, Georgia, serif)',
  bodyFont = 'var(--pl-font-body, system-ui, sans-serif)',
  style,
}: LivestreamBlockProps) {
  const localTime = startsAt
    ? (() => {
        try {
          const d = new Date(startsAt);
          if (Number.isNaN(d.getTime())) return null;
          return d.toLocaleString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short',
          });
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <section
      style={{
        padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 64px)',
        color: foreground,
        fontFamily: bodyFont,
        ...style,
      }}
      data-pe-section="livestream"
    >
      <div
        style={{
          maxWidth: 620,
          margin: '0 auto',
          padding: '32px clamp(24px, 4vw, 40px)',
          border: `1px solid color-mix(in oklab, ${accent} 40%, transparent)`,
          borderRadius: 'var(--pl-radius-lg)',
          background: `color-mix(in oklab, ${accent} 6%, transparent)`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace)',
            fontSize: '0.66rem',
            fontWeight: 700,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: accent,
            marginBottom: 14,
          }}
        >
          Live
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: headingFont,
            fontStyle: 'italic',
            fontSize: 'clamp(1.6rem, 3.2vw, 2.2rem)',
            color: foreground,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '10px auto 0', maxWidth: '46ch', color: muted, fontSize: '0.96rem', lineHeight: 1.55 }}>
            {subtitle}
          </p>
        )}
        {localTime && (
          <p
            style={{
              margin: '18px 0 0',
              fontFamily: headingFont,
              fontStyle: 'italic',
              fontSize: '1.05rem',
              color: foreground,
            }}
          >
            {localTime}
            <span style={{ display: 'block', marginTop: 4, fontSize: '0.72rem', color: muted, fontStyle: 'normal' }}>
              Shown in your local time.
            </span>
          </p>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="pl-pearl-accent"
          style={{
            display: 'inline-block',
            marginTop: 24,
            padding: '12px 22px',
            borderRadius: 'var(--pl-radius-full)',
            textDecoration: 'none',
            fontFamily: 'var(--pl-font-mono, ui-monospace)',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          {buttonLabel}
        </a>
      </div>
    </section>
  );
}
