'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/groove/GrooveSiteHero.tsx
//
// Hero block for PUBLISHED sites in the groove theme family.
// Different beast from the marketing GrooveHero — this renders
// in the guest's site context (couple/honoree names are real,
// site palette drives everything, no "Begin a new site" CTA).
//
// Design vocabulary:
//   • Warm radial gradient ground from the site's accent
//   • Two soft organic blobs drifting behind the title
//   • Fraunces italic kinetic headline (names)
//   • Subtitle in mono eyebrow rhythm
//   • Wavy divider tailing the section (picks up the next
//     section's background)
//   • Scroll-linked cover photo parallax if provided
//
// Editorial-family sites keep the existing Hero component.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

interface GrooveSiteHeroProps {
  /** Display names — either ["Emma", "James"] or ["Retiring with joy"] */
  names: [string, string];
  /** Poetic subtitle (manifest.poetry.heroTagline). */
  subtitle?: string;
  /** Optional ISO date string to render in the dateline. */
  eventDate?: string;
  /** Cover photo URL — shown with subtle parallax if present. */
  coverPhoto?: string;
  /** Site palette — accent / foreground / background. */
  accent: string;
  accent2?: string;
  foreground: string;
  background: string;
  muted?: string;
  /** Site fonts. */
  headingFont: string;
  bodyFont: string;
}

export function GrooveSiteHero({
  names,
  subtitle,
  eventDate,
  coverPhoto,
  accent,
  accent2,
  foreground,
  background,
  muted,
  headingFont,
  bodyFont,
}: GrooveSiteHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollY, setScrollY] = useState(0);

  // Subtle parallax on the cover photo — no framer-motion
  // needed, just a light rAF-throttled state update.
  useEffect(() => {
    if (!coverPhoto) return;
    let raf = 0;
    const tick = () => {
      const rect = sectionRef.current?.getBoundingClientRect();
      if (rect) setScrollY(Math.max(0, -rect.top));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [coverPhoto]);

  const displayNames = names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0];
  const dateLine = eventDate ? formatEventDate(eventDate) : undefined;
  const accentSoft = accent2 ?? accent;

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        minHeight: '96vh',
        padding: 'clamp(96px, 12vw, 160px) clamp(20px, 5vw, 64px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: `radial-gradient(ellipse at 50% 0%, color-mix(in oklab, ${accentSoft} 22%, ${background}) 0%, ${background} 60%)`,
        overflow: 'hidden',
      }}
    >
      {/* Cover photo — parallaxed behind a wash */}
      {coverPhoto && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverPhoto}
            alt=""
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.35,
              transform: `translateY(${scrollY * 0.12}px) scale(1.05)`,
              filter: 'saturate(0.82) blur(1px)',
              willChange: 'transform',
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, ${background}c0 0%, ${background}80 45%, ${background}f0 100%)`,
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* Two soft accent blobs drifting behind the title */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-120px',
          right: '-120px',
          width: 520,
          height: 520,
          borderRadius: '42% 58% 70% 30% / 45% 30% 70% 55%',
          background: accent,
          opacity: 0.22,
          filter: 'blur(70px)',
          animation: 'pl-groove-blob-morph 18s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-80px',
          width: 380,
          height: 380,
          borderRadius: '62% 38% 43% 57% / 65% 55% 45% 35%',
          background: accentSoft,
          opacity: 0.2,
          filter: 'blur(60px)',
          animation: 'pl-groove-blob-morph 22s ease-in-out infinite reverse',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 880 }}>
        {dateLine && (
          <div
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: accent,
              marginBottom: 28,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ width: 28, height: 2, background: accent, borderRadius: 999, opacity: 0.7 }} />
            {dateLine}
            <span style={{ width: 28, height: 2, background: accent, borderRadius: 999, opacity: 0.7 }} />
          </div>
        )}

        <h1
          style={{
            margin: 0,
            fontFamily: `"${headingFont}", Georgia, serif`,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(3rem, 9vw, 7rem)',
            lineHeight: 0.98,
            letterSpacing: '-0.02em',
            color: foreground,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        >
          {displayNames}
        </h1>

        {subtitle && (
          <p
            style={{
              margin: '32px auto 0',
              maxWidth: '48ch',
              fontFamily: `"${headingFont}", Georgia, serif`,
              fontStyle: 'italic',
              fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
              lineHeight: 1.3,
              color: muted ?? foreground,
              opacity: 0.82,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Wavy divider tailing the section */}
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -1,
          width: '100%',
          height: 96,
          display: 'block',
          pointerEvents: 'none',
        }}
      >
        <path
          d="M0,60 C200,10 500,110 720,60 C940,10 1240,110 1200,60 L1200,120 L0,120 Z"
          fill={background}
          opacity={1}
        />
      </svg>
    </section>
  );
}

function formatEventDate(raw: string): string {
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return raw;
  }
}
