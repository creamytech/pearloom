'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/groove/GrooveSiteGuestbook.tsx
//
// Wrapper section for guestbook on groove-family sites.
// Keeps the Guestbook component's form + list logic; wraps it
// in warm chrome matching the rest of the groove family.
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';

interface GrooveSiteGuestbookProps {
  children: ReactNode;
  accent: string;
  foreground: string;
  background: string;
  headingFont: string;
  title?: string;
  eyebrow?: string;
}

export function GrooveSiteGuestbook({
  children,
  accent,
  foreground,
  background,
  headingFont,
  title = 'Leave a note',
  eyebrow = 'Guestbook',
}: GrooveSiteGuestbookProps) {
  return (
    <section
      id="guestbook"
      style={{
        position: 'relative',
        padding: 'clamp(72px, 12vw, 140px) clamp(20px, 5vw, 64px)',
        background: `color-mix(in oklab, ${accent} 6%, ${background})`,
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-80px',
          left: '-60px',
          width: 360,
          height: 360,
          borderRadius: '62% 38% 43% 57% / 65% 55% 45% 35%',
          background: accent,
          opacity: 0.14,
          filter: 'blur(60px)',
          animation: 'pl-groove-blob-morph 24s ease-in-out infinite reverse',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 40 }}>
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
            {eyebrow}
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: `"${headingFont}", Georgia, serif`,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2rem, 4.5vw, 3rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: foreground,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            {title}
          </h2>
        </header>
        {children}
      </div>
    </section>
  );
}
