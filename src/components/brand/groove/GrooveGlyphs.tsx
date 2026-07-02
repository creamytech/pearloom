'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/GrooveGlyphs.tsx
//
// Small decorative SVG primitives from the groovy design brief:
// Bloom (six-petal breathing flower), Worm (wavy dashed segment
// path), Sparkle (four-point asterisk), Swirl (groovy spiral),
// ThreadStrand (two-strand olive + gold weave).
//
// Each respects prefers-reduced-motion via a `reduced` flag or
// a motion-safe class. Use them as atmosphere inside hero and
// orbit sections — NEVER as load-bearing content.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';

interface BaseProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
  animated?: boolean;
}

// Six-petal breathing flower — each petal breathes on its own
// stagger so the whole bloom pulses like it's alive.
interface BloomProps extends BaseProps {
  centerColor?: string;
  speed?: number;
}
export function Bloom({
  size = 140,
  color = 'var(--pl-groove-butter)',
  centerColor = 'var(--pl-groove-terra)',
  animated = true,
  speed = 6,
  style,
  className,
}: BloomProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{ display: 'block', animation: animated ? `pl-spin-slow ${speed * 8}s linear infinite` : undefined, ...style }}
    >
      <g transform="translate(60 60)">
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <ellipse
            key={a}
            cx="0"
            cy="-28"
            rx="14"
            ry="22"
            fill={color}
            opacity={0.9}
            transform={`rotate(${a})`}
            style={
              animated
                ? {
                    transformOrigin: 'center',
                    animation: `pl-bloom-breathe ${speed}s ease-in-out infinite`,
                    animationDelay: `${(a / 360) * speed}s`,
                  }
                : undefined
            }
          />
        ))}
        <circle r="10" fill={centerColor} />
      </g>
    </svg>
  );
}

// Worm — a wavy dashed path between two points; animates via
// stroke-dashoffset so it reads like a piece of thread being
// pulled through the page.
interface WormProps {
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  segments?: number;
  animated?: boolean;
  style?: CSSProperties;
}
export function Worm({
  width = 400,
  height = 80,
  color = 'var(--pl-groove-terra)',
  strokeWidth = 2.5,
  segments = 3,
  animated = true,
  style,
}: WormProps) {
  const step = width / segments;
  let d = `M 4 ${height / 2}`;
  for (let i = 0; i < segments; i++) {
    const up = i % 2 === 0 ? -height * 0.35 : height * 0.35;
    d += ` q ${step / 2} ${up}, ${step} 0`;
  }
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={animated ? '6 8' : undefined}
        style={animated ? { animation: 'pl-thread-dash 2s linear infinite' } : undefined}
      />
    </svg>
  );
}

// Four-point asterisk sparkle — slow spin makes it feel alive
// without drawing attention to itself.
export function Sparkle({
  size = 20,
  color = 'var(--pl-groove-terra)',
  animated = true,
  style,
}: BaseProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      style={{ display: 'block', animation: animated ? 'pl-spin-slow 14s linear infinite' : undefined, ...style }}
    >
      <path
        d="M10 1 C 10 6, 14 10, 19 10 C 14 10, 10 14, 10 19 C 10 14, 6 10, 1 10 C 6 10, 10 6, 10 1 Z"
        fill={color}
      />
    </svg>
  );
}

// Groovy inward spiral — draws in on first render when animated.
interface SwirlProps extends BaseProps {
  strokeWidth?: number;
}
export function Swirl({
  size = 120,
  color = 'var(--pl-groove-sage)',
  strokeWidth = 2,
  animated = false,
  style,
}: SwirlProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', ...style }}>
      <path
        d="M50 50 m-30 0 a30 30 0 1 1 60 0 a30 30 0 1 1 -55 8 a22 22 0 1 1 45 -6 a16 16 0 1 1 -30 4 a10 10 0 1 1 20 -2"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={
          animated
            ? {
                strokeDasharray: 400,
                strokeDashoffset: 400,
                animation: 'pl-draw-in 2.4s cubic-bezier(.2,.8,.2,1) forwards',
              }
            : undefined
        }
      />
    </svg>
  );
}

// Two-strand thread — olive weft + gold warp. Core motion atom
// of the brand (see BRAND.md §3, §6).
interface ThreadStrandProps {
  length?: number;
  height?: number;
  vertical?: boolean;
  animated?: boolean;
  style?: CSSProperties;
}
export function ThreadStrand({
  length = 800,
  height = 24,
  vertical = false,
  animated = true,
  style,
}: ThreadStrandProps) {
  const w = vertical ? height : length;
  const h = vertical ? length : height;
  const d1 = vertical
    ? `M${height / 2 - 3} 0 Q ${height / 2 + 6} ${length / 4}, ${height / 2 - 3} ${length / 2} T ${height / 2 - 3} ${length}`
    : `M0 ${height / 2 - 3} Q ${length / 4} ${height / 2 + 6}, ${length / 2} ${height / 2 - 3} T ${length} ${height / 2 - 3}`;
  const d2 = vertical
    ? `M${height / 2 + 3} 0 Q ${height / 2 - 6} ${length / 4}, ${height / 2 + 3} ${length / 2} T ${height / 2 + 3} ${length}`
    : `M0 ${height / 2 + 3} Q ${length / 4} ${height / 2 - 6}, ${length / 2} ${height / 2 + 3} T ${length} ${height / 2 + 3}`;
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible', ...style }}>
      <path d={d1} stroke="var(--pl-groove-sage)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path
        d={d2}
        stroke="var(--pl-groove-gold, var(--pl-groove-butter))"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="3 4"
        style={animated ? { animation: 'pl-thread-dash 2s linear infinite' } : undefined}
      />
    </svg>
  );
}
