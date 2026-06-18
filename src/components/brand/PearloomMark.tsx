'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/brand/PearloomMark.tsx
// The Pearloom logo mark (final, signed off 2026-06-18): the solid
// pear silhouette with a spiral core carved out as true negative
// space, stem + angled leaf on top. One `color` paints the whole
// mark (the spiral is a real hole), so it reverses to a cream
// knockout and re-skins per theme.
//
// Canonical static version lives in pearloom/motifs.tsx
// (PearloomGlyph) — this file is the framer-motion variant used by
// ceremonial surfaces (PasswordGate, sign-in). The old woven-pear
// (olive thread + gold weft + pearl) was retired with this rebrand;
// `color2` is still accepted for call-site compatibility but unused.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';

interface PearloomMarkProps {
  size?: number;
  color?: string;
  color2?: string;    // retained for call-site compat; unused by the solid mark
  animated?: boolean; // press-in reveal
  className?: string;
  style?: React.CSSProperties;
}

// viewBox 0 0 115.4 186 — body (with carved spiral) + leaf.
const BODY =
  'm90 92c-4.4-9-5.7-15.4-7.1-25.2-1.6-10.9-8-19.3-15.9-23-2.5-1.3-6.7-1.2-8.6-1.4 0.2-6.7-0.4-12.5-2.2-20.4-1.1-3-2.9-2-4.3-1.1s-2.9 2.2-1.5 4.8 4.2 4.4 5 17c0.1 0.3-1.1-0.1-1.8 0-10.6 1.4-19.4 10.1-21.2 22.7-1.7 11.4-2.5 17.7-8.7 28.6-4.9 8.9-6.9 10.4-10.1 18-2.2 4.8-5.1 12.6-4.6 24.1 0.4 9.1 3.7 22.5 12.3 31.2 7.9 8.2 18.6 14.5 35.1 15.1 26.6 0 45.6-14.1 49.5-35.6 4.2-18.4-1.2-33.1-10.2-47.8l-5.7-7zm-31.4 77.5c-18.6 0-31.7-13.2-31.8-33.5-0.1-17.1 9-26.8 13.8-34.7 5.2-8.6 12.2-28.2 14.4-50.2h0.4c0.7 9.2-0.1 25.3-2.1 34.4-3.9 18.3-11.4 26.3-14.5 38.5-5.9 22.5 8.1 32.7 20.6 32.9 14.1 0.1 18.2-9.6 18.5-17 0.2-6.5-6-13.8-12.9-14.1-5.2-0.1-9.7 3.1-9.8 8.7-0.3 7 7.5 9.9 11.3 5.8-0.1 2.5-2.9 5.2-7.5 4.9-4-0.2-9.1-4-9.1-11.3 0.1-5.8 5.1-16.3 17.3-16.3 12.9-0.3 20.7 9.8 21.1 21 0.3 13.8-9.6 30.9-29.7 30.9zm6.3-137.2c0.5-8.1 5.7-25.3 24.5-25.7 11.5-0.5 15.5 1.3 16.3 1.8 0.5 0.2 1.6 0.6-0.6 3.4-3.4 4.8-8.8 22.1-27.5 23.3-7.9 0.3-9.7-2-13 1.5s-5.2 7.2 0.3-4.3zm0.5 1.6c3.2-4.3 13.3-16.5 25.1-17.9 9.7-1.2-12 1-23.6 17.9h-1.5z';
const LEAF =
  'm64.9 32.3c-0.1-4.7 3.1-24.3 22.4-25.5 9.7-0.9 14.7-0.2 18 1l0.2 0.1c0.7 0.2 1.3 0.6 0.6 1.5-5.1 7.7-9.4 22.2-25.6 25.4-9.1 1.3-12.3-2.7-15.6 1.2v-3.7z';

export function PearloomMark({
  size = 40,
  color = 'var(--pl-olive, #5C6B3F)',
  animated = false,
  className,
  style,
}: PearloomMarkProps) {
  const width = size * (115.4 / 186);

  if (animated) {
    return (
      <motion.svg
        width={width}
        height={size}
        viewBox="0 0 115.4 186"
        className={className}
        style={{ transformOrigin: '50% 60%', ...style }}
        aria-hidden
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.path
          d={BODY}
          fill={color}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <motion.path
          d={LEAF}
          fill={color}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.35 }}
        />
      </motion.svg>
    );
  }

  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 115.4 186"
      className={className}
      style={style}
      aria-hidden
    >
      <path d={BODY} fill={color} />
      <path d={LEAF} fill={color} />
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
