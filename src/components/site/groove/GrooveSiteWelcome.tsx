'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/groove/GrooveSiteWelcome.tsx
// Personal welcome statement for groove-family sites. Single
// big italic pull-quote-feeling paragraph on a wash.
// ─────────────────────────────────────────────────────────────

interface GrooveSiteWelcomeProps {
  text: string;
  eyebrow?: string;
  accent: string;
  foreground: string;
  background: string;
  headingFont: string;
}

export function GrooveSiteWelcome({
  text,
  eyebrow = 'A note from us',
  accent,
  foreground,
  background,
  headingFont,
}: GrooveSiteWelcomeProps) {
  if (!text?.trim()) return null;
  return (
    <section
      style={{
        padding: 'clamp(72px, 12vw, 140px) clamp(20px, 5vw, 64px)',
        background: `color-mix(in oklab, ${accent} 7%, ${background})`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: 360,
          height: 360,
          borderRadius: '42% 58% 70% 30% / 45% 30% 70% 55%',
          background: accent,
          opacity: 0.14,
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: '0.82rem',
            fontWeight: 700,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: accent,
            marginBottom: 24,
          }}
        >
          {eyebrow}
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: `"${headingFont}", Georgia, serif`,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(1.6rem, 3.2vw, 2.4rem)',
            lineHeight: 1.32,
            letterSpacing: '-0.015em',
            color: foreground,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        >
          {text}
        </p>
      </div>
    </section>
  );
}
