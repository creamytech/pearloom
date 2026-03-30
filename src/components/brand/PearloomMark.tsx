'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/brand/PearloomMark.tsx
// The Pearloom logo mark — two elegant threads intertwining,
// embodying "pear + loom" — an intertwined connection.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';

interface PearloomMarkProps {
  size?: number;
  color?: string;
  color2?: string;    // second thread color (defaults to slightly lighter)
  animated?: boolean; // draw-in animation
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Two intertwining curves that form an elegant infinity-like knot.
 * Represents "pear + loom" — two lives woven together.
 */
export function PearloomMark({
  size = 40,
  color = '#A3B18A',
  color2,
  animated = false,
  className,
  style,
}: PearloomMarkProps) {
  const c2 = color2 || adjustAlpha(color, 0.65);

  // The intertwined paths — two threads crossing over each other
  // Thread 1: sweeps upper-left to lower-right
  const thread1 = 'M 12 28 C 12 12, 30 8, 50 20 C 70 32, 88 28, 88 12';
  // Thread 2: sweeps lower-left to upper-right (crossing thread 1)
  const thread2 = 'M 12 12 C 12 28, 30 32, 50 20 C 70 8, 88 12, 88 28';

  const pathProps = {
    fill: 'none',
    strokeWidth: 2.5,
    strokeLinecap: 'round' as const,
  };

  if (animated) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 40"
        className={className}
        style={style}
      >
        <motion.path
          d={thread1}
          stroke={color}
          {...pathProps}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
        <motion.path
          d={thread2}
          stroke={c2}
          {...pathProps}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.3 }}
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size * 0.4}
      viewBox="0 0 100 40"
      className={className}
      style={style}
    >
      <path d={thread1} stroke={color} {...pathProps} />
      <path d={thread2} stroke={c2} {...pathProps} />
    </svg>
  );
}

/**
 * Full Pearloom wordmark with intertwined mark
 */
export function PearloomWordmark({
  size = 120,
  color = '#A3B18A',
  textColor = '#2B2B2B',
  style,
}: {
  size?: number;
  color?: string;
  textColor?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.08, ...style }}>
      <PearloomMark size={size * 0.35} color={color} />
      <span style={{
        fontFamily: 'var(--eg-font-heading)',
        fontSize: size * 0.2,
        fontWeight: 400,
        letterSpacing: '-0.02em',
        color: textColor,
      }}>
        Pearloom
      </span>
    </div>
  );
}

/**
 * Floating thread particle for background decoration.
 * Replaces the old FloatingPear.
 */
export function FloatingThread({
  x,
  y,
  size = 60,
  delay = 0,
  opacity = 0.2,
  color = '#A3B18A',
}: {
  x: string;
  y: string;
  size?: number;
  delay?: number;
  opacity?: number;
  color?: string;
}) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        pointerEvents: 'none',
      }}
      animate={{
        y: [0, -15, 0],
        rotate: [0, 8, -5, 0],
        opacity: [opacity * 0.6, opacity, opacity * 0.5, opacity * 0.6],
      }}
      transition={{
        duration: 7 + delay,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      <PearloomMark size={size} color={`${color}`} animated={false} style={{ opacity }} />
    </motion.div>
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

// ── Helpers ────────────────────────────────────────────────
function adjustAlpha(hex: string, factor: number): string {
  // Simple opacity adjustment — returns rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r)) return hex; // fallback if not a hex color
  return `rgba(${r},${g},${b},${factor})`;
}
