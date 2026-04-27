'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/ObituaryBlock.tsx
//
// Gentle, long-form obituary for memorial and funeral sites.
// Name, dates, optional photo, body text, optional
// "in-memory-of" donation line. Intentionally understated —
// no parallax, no pearl, no decorative weight.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';

interface ObituaryBlockProps {
  name: string;
  /** "1942 — 2026" or "Born May 3, 1942 · Died April 18, 2026". */
  dates?: string;
  /** Optional portrait photo URL. */
  photoUrl?: string;
  /** Long-form body — supports soft line breaks. */
  body: string;
  /** "In lieu of flowers, donations to ___." */
  inMemoryOf?: string;
  accent?: string;
  foreground?: string;
  muted?: string;
  headingFont?: string;
  bodyFont?: string;
  style?: CSSProperties;
}

export function ObituaryBlock({
  name,
  dates,
  photoUrl,
  body,
  inMemoryOf,
  accent = 'var(--pl-olive)',
  foreground = 'var(--pl-ink)',
  muted = 'var(--pl-muted)',
  headingFont = 'var(--pl-font-display, Georgia, serif)',
  bodyFont = 'var(--pl-font-body, system-ui, sans-serif)',
  style,
}: ObituaryBlockProps) {
  return (
    <section
      style={{
        padding: 'clamp(64px, 10vw, 128px) clamp(20px, 5vw, 64px)',
        color: foreground,
        fontFamily: bodyFont,
        ...style,
      }}
      data-pe-section="obituary"
    >
      <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
        {photoUrl && (
          <div
            style={{
              margin: '0 auto 28px',
              width: 'clamp(140px, 22vw, 200px)',
              height: 'clamp(140px, 22vw, 200px)',
              borderRadius: '50%',
              overflow: 'hidden',
              border: `2px solid color-mix(in oklab, ${accent} 40%, transparent)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        <h2
          style={{
            margin: 0,
            fontFamily: headingFont,
            fontStyle: 'italic',
            fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
            color: foreground,
            letterSpacing: '-0.01em',
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        >
          {name}
        </h2>
        {dates && (
          <p
            style={{
              margin: '10px 0 0',
              fontFamily: 'var(--pl-font-mono, ui-monospace)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: muted,
            }}
          >
            {dates}
          </p>
        )}
        <div
          style={{
            margin: '36px auto 0',
            maxWidth: '52ch',
            fontFamily: bodyFont,
            fontSize: 'clamp(1rem, 1.3vw, 1.08rem)',
            lineHeight: 1.7,
            color: 'var(--pl-ink-soft)',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
          }}
        >
          {body}
        </div>
        {inMemoryOf && (
          <p
            style={{
              margin: '40px auto 0',
              maxWidth: '44ch',
              padding: '16px 22px',
              borderTop: `1px solid ${accent}`,
              borderBottom: `1px solid ${accent}`,
              fontFamily: headingFont,
              fontStyle: 'italic',
              fontSize: '1rem',
              color: foreground,
              lineHeight: 1.6,
            }}
          >
            {inMemoryOf}
          </p>
        )}
      </div>
    </section>
  );
}
