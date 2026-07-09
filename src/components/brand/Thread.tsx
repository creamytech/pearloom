'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/Thread.tsx
//
// The Thread is the visual atom of the Pearloom brand — two
// strands (olive + gold) that act as dividers, rules, and
// editorial flourishes across the product. Replaces every
// loose <hr /> and one-off rule stroke.
//
// Variants:
//   weave    — two strands cross at the middle (default)
//   straight — two parallel hairlines
//   single   — one gold leaf hairline
//   bullet   — short rule with a centered glyph
// ─────────────────────────────────────────────────────────────

import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ThreadProps {
  variant?: 'weave' | 'straight' | 'single' | 'bullet';
  /** Animate the strands drawing in (use in heroes / modals). */
  animated?: boolean;
  /** Width — any valid CSS length, default 100%. */
  width?: string;
  /** Total height in px — controls visual weight. */
  height?: number;
  /** First strand color (defaults to olive token). */
  color?: string;
  /** Second strand color (defaults to gold token). */
  color2?: string;
  /** Thickness in px. */
  weight?: number;
  /** Decorative glyph for `bullet` variant. */
  glyph?: string;
  className?: string;
  style?: React.CSSProperties;
  ariaHidden?: boolean;
}

export function Thread({
  variant = 'weave',
  animated = false,
  width = '100%',
  height = 14,
  color = 'var(--pl-olive)',
  color2 = 'var(--pl-gold)',
  weight = 1,
  glyph = '\u2022',
  className,
  style,
  ariaHidden = true,
}: ThreadProps) {
  const reduced = useReducedMotion();
  const animate = animated && !reduced;
  const reactId = useId();
  const id = `pl-thread-${reactId.replace(/:/g, '')}`;

  // Bullet variant is its own composition.
  if (variant === 'bullet') {
    return (
      <div
        aria-hidden={ariaHidden}
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width,
          color: color,
          ...style,
        }}
      >
        <span style={{ flex: 1, height: weight, background: `linear-gradient(90deg, transparent, ${color2} 60%, ${color2})` }} />
        <span
          style={{
            width: Math.max(6, height * 0.5),
            height: Math.max(6, height * 0.5),
            borderRadius: '50%',
            background: color2,
            display: 'inline-block',
          }}
          aria-hidden
        >
          <span style={{ display: 'none' }}>{glyph}</span>
        </span>
        <span style={{ flex: 1, height: weight, background: `linear-gradient(90deg, ${color2}, ${color2} 40%, transparent)` }} />
      </div>
    );
  }

  if (variant === 'single') {
    return (
      <span
        aria-hidden={ariaHidden}
        className={className}
        style={{ display: 'block', width, height: weight, background: color2, ...style }}
      />
    );
  }

  if (variant === 'straight') {
    return (
      <div
        aria-hidden={ariaHidden}
        className={className}
        style={{ width, display: 'flex', flexDirection: 'column', gap: Math.max(2, height / 4), ...style }}
      >
        <span style={{ display: 'block', height: weight, background: color }} />
        <span style={{ display: 'block', height: weight, background: color2 }} />
      </div>
    );
  }

  // Default: weave — two cubic curves crossing the midline.
  // SVG so the curves render crisp at any size and animate the
  // pathLength to draw in like type being threaded.
  const w = 200;
  const h = height;
  const path1 = `M 0 ${h - 1} C ${w * 0.25} ${h - 1}, ${w * 0.25} 1, ${w * 0.5} 1 S ${w * 0.75} ${h - 1}, ${w} ${h - 1}`;
  const path2 = `M 0 1 C ${w * 0.25} 1, ${w * 0.25} ${h - 1}, ${w * 0.5} ${h - 1} S ${w * 0.75} 1, ${w} 1`;

  return (
    <svg
      role={ariaHidden ? undefined : 'img'}
      aria-hidden={ariaHidden}
      className={className}
      width={width}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color2} stopOpacity="0.15" />
          <stop offset="50%" stopColor={color2} stopOpacity="1" />
          <stop offset="100%" stopColor={color2} stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <motion.path
        d={path1}
        stroke={`url(#${id}-a)`}
        strokeWidth={weight}
        strokeLinecap="round"
        fill="none"
        initial={animate ? { pathLength: 0, opacity: 0 } : false}
        animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.path
        d={path2}
        stroke={`url(#${id}-b)`}
        strokeWidth={weight}
        strokeLinecap="round"
        fill="none"
        initial={animate ? { pathLength: 0, opacity: 0 } : false}
        animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
        transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

