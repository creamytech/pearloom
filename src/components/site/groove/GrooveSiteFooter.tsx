'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/groove/GrooveSiteFooter.tsx
//
// Footer for groove-family sites. Warm radial wash, a single
// big italic signature line (names), optional closing line,
// wavy divider tailing the previous section, one tiny
// "Made with Pearloom" mark in mono.
// ─────────────────────────────────────────────────────────────

interface GrooveSiteFooterProps {
  /** Display names — ["Emma", "James"] or ["Retiring with joy"]. */
  names: [string, string];
  /** Poetic closing line from manifest.poetry.closingLine. */
  closingLine?: string;
  /** Optional subtitle override. */
  subtitle?: string;
  accent: string;
  accent2?: string;
  foreground: string;
  background: string;
  muted?: string;
  headingFont: string;
  bodyFont: string;
}

export function GrooveSiteFooter({
  names,
  closingLine,
  subtitle,
  accent,
  foreground,
  background,
  muted,
  headingFont,
}: GrooveSiteFooterProps) {
  const displayNames = names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0];

  return (
    <footer
      style={{
        position: 'relative',
        padding: 'clamp(72px, 10vw, 120px) clamp(20px, 5vw, 64px) clamp(48px, 6vw, 72px)',
        background: `radial-gradient(ellipse at 50% 100%, color-mix(in oklab, ${accent} 18%, ${background}) 0%, ${background} 60%)`,
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Wavy divider at the top — tails the previous section */}
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: -1,
          width: '100%',
          height: 80,
          transform: 'scaleY(-1)',
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

      {/* Soft blob drifting behind the signature */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 420,
          height: 420,
          borderRadius: '62% 38% 43% 57% / 65% 55% 45% 35%',
          background: accent,
          opacity: 0.14,
          filter: 'blur(60px)',
          animation: 'pl-groove-blob-morph 20s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>
        <div
          aria-hidden
          style={{
            fontSize: '1.4rem',
            color: accent,
            marginBottom: 16,
            opacity: 0.7,
          }}
        >
          ✦
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: `"${headingFont}", Georgia, serif`,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(2rem, 5vw, 3.4rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.02em',
            color: foreground,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        >
          {displayNames}
        </h2>
        {(closingLine || subtitle) && (
          <p
            style={{
              margin: '24px auto 0',
              maxWidth: '46ch',
              fontFamily: `"${headingFont}", Georgia, serif`,
              fontStyle: 'italic',
              fontSize: 'clamp(1.02rem, 1.4vw, 1.18rem)',
              lineHeight: 1.55,
              color: muted ?? foreground,
              opacity: 0.76,
            }}
          >
            {subtitle || closingLine}
          </p>
        )}

        <div
          style={{
            marginTop: 56,
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            color: muted ?? foreground,
            opacity: 0.5,
          }}
        >
          Woven with Pearloom
        </div>
      </div>
    </footer>
  );
}
