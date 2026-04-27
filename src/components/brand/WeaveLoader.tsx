'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/WeaveLoader.tsx
//
// The single Pearloom loader. Two threads weave across each
// other on a continuous loop — the brand metaphor in motion.
// Replaces every Loader2 / animate-spin / spinner across the
// product. Three sizes, optional label, single colour token.
//
// On `prefers-reduced-motion` it falls back to a quiet pulse
// of the gold strand only.
// ─────────────────────────────────────────────────────────────

import { useId } from 'react';
import { useReducedMotion } from 'framer-motion';

interface WeaveLoaderProps {
  /** xs: 14px · sm: 22px · md: 36px · lg: 56px · xl: 80px */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Optional caption. Renders mono-uppercase under the loader. */
  label?: string;
  /** First strand colour (defaults to olive). */
  color?: string;
  /** Second strand colour (defaults to gold). */
  color2?: string;
  /** Stroke weight in px. Auto-scales with size if omitted. */
  weight?: number;
  /** Inline-block alignment for use inside text or buttons. */
  inline?: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

const SIZES: Record<NonNullable<WeaveLoaderProps['size']>, { w: number; stroke: number; gap: number }> = {
  xs: { w: 14, stroke: 1.4, gap: 6 },
  sm: { w: 22, stroke: 1.6, gap: 8 },
  md: { w: 36, stroke: 1.8, gap: 12 },
  lg: { w: 56, stroke: 2.2, gap: 16 },
  xl: { w: 80, stroke: 2.6, gap: 20 },
};

export function WeaveLoader({
  size = 'md',
  label,
  color = 'var(--pl-olive)',
  color2 = 'var(--pl-gold)',
  weight,
  inline = false,
  className,
  style,
  ariaLabel = 'Threading',
}: WeaveLoaderProps) {
  const reduced = useReducedMotion();
  const reactId = useId();
  const id = `pl-weave-${reactId.replace(/:/g, '')}`;
  const cfg = SIZES[size];
  const w = cfg.w;
  const h = Math.round(w * 0.55);
  const sw = weight ?? cfg.stroke;

  // Two crossing cubic curves — same shape as the Thread component.
  const path1 = `M 0 ${h - 1} C ${w * 0.25} ${h - 1}, ${w * 0.25} 1, ${w * 0.5} 1 S ${w * 0.75} ${h - 1}, ${w} ${h - 1}`;
  const path2 = `M 0 1 C ${w * 0.25} 1, ${w * 0.25} ${h - 1}, ${w * 0.5} ${h - 1} S ${w * 0.75} 1, ${w} 1`;

  const wrapperStyle: React.CSSProperties = inline
    ? { display: 'inline-flex', alignItems: 'center', gap: cfg.gap, verticalAlign: 'middle' }
    : { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: cfg.gap };

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      className={className}
      style={{ ...wrapperStyle, ...style }}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: 'block', overflow: 'visible' }}
        aria-hidden
      >
        <defs>
          {/* A tiny clip mask makes the dash travel along the curve without
              altering its visible length. */}
          <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="50%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color2} stopOpacity="0.18" />
            <stop offset="50%" stopColor={color2} stopOpacity="1" />
            <stop offset="100%" stopColor={color2} stopOpacity="0.18" />
          </linearGradient>
        </defs>

        {/* Static rest paths */}
        <path d={path1} stroke={`url(#${id}-a)`} strokeOpacity={reduced ? 0.85 : 0.18} strokeWidth={sw} fill="none" strokeLinecap="round" />
        <path d={path2} stroke={`url(#${id}-b)`} strokeOpacity={reduced ? 0 : 0.18} strokeWidth={sw} fill="none" strokeLinecap="round" />

        {/* Animated dash that travels along each strand */}
        {!reduced && (
          <>
            <path
              d={path1}
              stroke={color}
              strokeWidth={sw}
              fill="none"
              strokeLinecap="round"
              pathLength={1}
              style={{
                strokeDasharray: '0.32 1',
                animation: `pl-weave-${size}-a 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
              }}
            />
            <path
              d={path2}
              stroke={color2}
              strokeWidth={sw}
              fill="none"
              strokeLinecap="round"
              pathLength={1}
              style={{
                strokeDasharray: '0.32 1',
                animation: `pl-weave-${size}-b 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                animationDelay: '0.4s',
              }}
            />
          </>
        )}
      </svg>

      {label && (
        <span
          style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: size === 'xs' || size === 'sm' ? '0.6rem' : '0.66rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--pl-muted)',
          }}
        >
          {label}
        </span>
      )}

      {/* Per-size keyframes scoped via CSS-in-JSX so multiple loaders
          can coexist without colliding. */}
      <style jsx>{`
        @keyframes pl-weave-${size}-a {
          0%   { stroke-dashoffset: 1; }
          100% { stroke-dashoffset: -0.32; }
        }
        @keyframes pl-weave-${size}-b {
          0%   { stroke-dashoffset: 1; }
          100% { stroke-dashoffset: -0.32; }
        }
      `}</style>
    </span>
  );
}
