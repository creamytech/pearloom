'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/brand/PearloomMark.tsx
// The Pearloom logo mark (rebrand 2026-06-10): the woven pear.
// The fruit is ONE continuous thread, open at the top where the
// loose end rises into the stem; a gold weft passes through the
// waist (under the left edge, over the right); a single pearl
// sits at the crossing. Pear · loom · pearl in one mark.
//
// Canonical static version lives in pearloom/motifs.tsx
// (PearloomGlyph) — this file is the framer-motion draw-in
// variant used by ceremonial surfaces (PasswordGate).
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';

interface PearloomMarkProps {
  size?: number;
  color?: string;
  color2?: string;    // weft + pearl color (defaults to brand gold)
  animated?: boolean; // thread draw-in animation
  className?: string;
  style?: React.CSSProperties;
}

const BODY =
  'M 52 29 C 59 32, 63 39, 62 48 C 73 56, 79 69, 76 83 C 72 98, 61 106, 48 106 ' +
  'C 35 106, 24 98, 20 83 C 17 69, 23 56, 34 48 C 33 39, 37 32, 44 29';
const STEM = 'M 48 27 C 49 21, 52 15, 58 10';
const LEAF = 'M 58 10 C 63 2.5, 74 2, 80 8 C 76 16.5, 64 17.5, 58 10 Z';
const WEFT_L = 'M 4 67 C 9 63, 13 62.5, 17 64.5';
const WEFT_R =
  'M 26 68 C 35 71.5, 42 60, 55 62.5 C 64 64.5, 73 69, 80 69.5 C 85 70, 90 67, 93 63';

export function PearloomMark({
  size = 40,
  color = 'var(--pl-olive, #5C6B3F)',
  color2,
  animated = false,
  className,
  style,
}: PearloomMarkProps) {
  const gold = color2 || 'var(--pl-gold, #C19A4B)';
  const body = { fill: 'none', stroke: color, strokeWidth: 5, strokeLinecap: 'round' as const };
  const weft = { fill: 'none', stroke: gold, strokeWidth: 3.6, strokeLinecap: 'round' as const };

  if (animated) {
    return (
      <svg
        width={size * (96 / 112)}
        height={size}
        viewBox="0 0 96 112"
        className={className}
        style={style}
        aria-hidden
      >
        <motion.path
          d={BODY}
          {...body}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
        <motion.path
          d={STEM}
          {...body}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 1.3 }}
        />
        <motion.path
          d={LEAF}
          fill={color}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 1.6 }}
          style={{ transformOrigin: '58px 11px' }}
        />
        <motion.path
          d={WEFT_L}
          {...weft}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeInOut', delay: 0.7 }}
        />
        <motion.path
          d={WEFT_R}
          {...weft}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeInOut', delay: 1.0 }}
        />
        <motion.circle
          cx={46}
          cy={64}
          r={5}
          fill={gold}
          stroke="var(--pl-cream, #FDFAF0)"
          strokeWidth={2}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1], delay: 1.8 }}
          style={{ transformOrigin: '46px 64px' }}
        />
      </svg>
    );
  }

  return (
    <svg
      width={size * (96 / 112)}
      height={size}
      viewBox="0 0 96 112"
      className={className}
      style={style}
      aria-hidden
    >
      <path d={BODY} {...body} />
      <path d={STEM} {...body} />
      <path d={LEAF} fill={color} />
      <path d={WEFT_L} {...weft} />
      <path d={WEFT_R} {...weft} />
      <circle cx={46} cy={64} r={5} fill={gold} stroke="var(--pl-cream, #FDFAF0)" strokeWidth={2} />
    </svg>
  );
}

/**
 * Circular container with a woven-border effect.
 * Replaces the old PearShape for wrapping icons.
 */
export function WovenCircle({
  size = 52,
  color = 'rgba(163,177,138,0.1)',
  borderColor = 'rgba(163,177,138,0.25)',
  children,
  style,
}: {
  size?: number;
  color?: string;
  borderColor?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        border: `1.5px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
