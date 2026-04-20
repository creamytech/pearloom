'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/groove/GrooveSiteRsvp.tsx
//
// RSVP section wrapper for groove-family sites. Wraps the
// existing PublicRsvpSection form (logic + API identical) in
// warm radial chrome: accent wash, organic blob atmosphere,
// Fraunces headline. No custom form logic — just dressing.
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';

interface GrooveSiteRsvpProps {
  children: ReactNode;
  accent: string;
  accent2?: string;
  foreground: string;
  background: string;
  muted?: string;
  headingFont: string;
  title?: string;
  eyebrow?: string;
}

export function GrooveSiteRsvp({
  children,
  accent,
  foreground,
  background,
  muted,
  headingFont,
  title = 'Will you join us?',
  eyebrow = 'RSVP',
}: GrooveSiteRsvpProps) {
  return (
    <section
      id="rsvp"
      style={{
        position: 'relative',
        padding: 'clamp(72px, 12vw, 140px) clamp(20px, 5vw, 64px)',
        background: `radial-gradient(ellipse at 50% 0%, color-mix(in oklab, ${accent} 18%, ${background}) 0%, ${background} 60%)`,
        overflow: 'hidden',
      }}
    >
      {/* Soft accent blob drifting behind the section */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-100px',
          right: '-80px',
          width: 480,
          height: 480,
          borderRadius: '42% 58% 70% 30% / 45% 30% 70% 55%',
          background: accent,
          opacity: 0.18,
          filter: 'blur(60px)',
          animation: 'pl-groove-blob-morph 22s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 48 }}>
          <div
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: accent,
              marginBottom: 18,
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
              fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              color: foreground,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            {title}
          </h2>
        </header>

        {/* The actual form, borrowed from PublicRsvpSection */}
        {children}
      </div>
    </section>
  );
}
