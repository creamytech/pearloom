'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/Pull.tsx
//
// Editorial pull-quote with hand-set Fraunces drop quote
// marks. Use anywhere a sentence deserves to feel weighed:
// landing testimonials, dashboard "what hosts said" cards,
// the about page, blog posts.
//
// Two anchor variants:
//   • plate — drop quote on the upper-left, citation below
//   • inline — quote inline within paragraph flow
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';

interface PullProps {
  children: ReactNode;
  cite?: ReactNode;
  /** When true, accentuates the quote with an italic Fraunces face. */
  italic?: boolean;
  variant?: 'plate' | 'inline';
  /** Color of the drop quote glyphs. */
  glyphColor?: string;
  /** Body text color. */
  color?: string;
  /** Set the leading metric. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_MAP = {
  sm: { quote: '3rem', body: 'clamp(1rem,1.4vw,1.1rem)', leading: 1.55 },
  md: { quote: '4.6rem', body: 'clamp(1.05rem,1.5vw,1.25rem)', leading: 1.5 },
  lg: { quote: '6.4rem', body: 'clamp(1.18rem,1.8vw,1.5rem)', leading: 1.4 },
};

export function Pull({
  children,
  cite,
  italic = true,
  variant = 'plate',
  glyphColor = 'var(--pl-gold)',
  color = 'var(--pl-ink)',
  size = 'md',
  className,
  style,
}: PullProps) {
  const cfg = SIZE_MAP[size];

  if (variant === 'inline') {
    return (
      <span
        className={className}
        style={{
          fontFamily: 'var(--pl-font-display)',
          fontStyle: italic ? 'italic' : 'normal',
          fontVariationSettings: '"opsz" 144, "SOFT" 60, "WONK" 0',
          color,
          ...style,
        }}
      >
        <span aria-hidden style={{ color: glyphColor, marginRight: '0.05em' }}>
          {'\u201C'}
        </span>
        {children}
        <span aria-hidden style={{ color: glyphColor, marginLeft: '0.05em' }}>
          {'\u201D'}
        </span>
      </span>
    );
  }

  return (
    <figure
      className={className}
      style={{
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {/* Drop quote — pulled out of the text block on its own row */}
      <span
        aria-hidden
        style={{
          fontFamily: 'var(--pl-font-display)',
          fontStyle: 'italic',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          fontSize: cfg.quote,
          lineHeight: 0.7,
          color: glyphColor,
          opacity: 0.45,
          marginBottom: 14,
          letterSpacing: '-0.04em',
        }}
      >
        {'\u201C'}
      </span>

      <blockquote
        style={{
          margin: 0,
          fontFamily: 'var(--pl-font-display)',
          fontStyle: italic ? 'italic' : 'normal',
          fontVariationSettings: '"opsz" 144, "SOFT" 60, "WONK" 0',
          fontSize: cfg.body,
          lineHeight: cfg.leading,
          color,
        }}
      >
        {children}
      </blockquote>

      {cite && (
        <figcaption
          style={{
            marginTop: 22,
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.66rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--pl-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ width: 14, height: 1, background: glyphColor }} />
          {cite}
        </figcaption>
      )}
    </figure>
  );
}
