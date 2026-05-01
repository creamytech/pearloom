'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/groove/GrooveSiteQuote.tsx
// Decorative quote block — big italic pull quote framed with
// soft glyphs, wavy divider above + below.
// ─────────────────────────────────────────────────────────────

interface GrooveSiteQuoteProps {
  text: string;
  attribution?: string;
  symbol?: string;
  accent: string;
  foreground: string;
  background: string;
  headingFont: string;
}

export function GrooveSiteQuote({
  text,
  attribution,
  symbol = '❋',
  accent,
  foreground,
  background,
  headingFont,
}: GrooveSiteQuoteProps) {
  if (!text?.trim()) return null;
  return (
    <section
      style={{
        padding: 'clamp(80px, 14vw, 160px) clamp(20px, 5vw, 64px)',
        background,
        textAlign: 'center',
      }}
    >
      <div
        aria-hidden
        style={{
          fontSize: '2rem',
          color: accent,
          marginBottom: 24,
          opacity: 0.7,
        }}
      >
        {symbol}
      </div>
      <blockquote
        style={{
          margin: 0,
          maxWidth: '52ch',
          marginLeft: 'auto',
          marginRight: 'auto',
          fontFamily: `"${headingFont}", Georgia, serif`,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
          lineHeight: 1.25,
          letterSpacing: '-0.015em',
          color: foreground,
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        }}
      >
        &ldquo;{text}&rdquo;
      </blockquote>
      {attribution && (
        <div
          style={{
            marginTop: 28,
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: accent,
          }}
        >
          — {attribution}
        </div>
      )}
    </section>
  );
}
