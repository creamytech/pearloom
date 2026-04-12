'use client';
import React from 'react';

// ─────────────────────────────────────────────────────────────
// Pearloom / PearMascot.tsx — Minimal Pear Logomark
// Clean geometric silhouette — no face, no expressions, no
// bounce. Used as a brand mark in nav and favicon only.
// ─────────────────────────────────────────────────────────────

export type PearMood = 'idle' | 'thinking' | 'happy' | 'error' | 'celebrating' | 'greeting';

interface PearMascotProps {
  size?: number;
  mood?: PearMood;
  color?: string;
  leafColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function PearMascot({
  size = 80,
  mood: _mood = 'idle',
  color = 'currentColor',
  leafColor,
  className,
  style,
}: PearMascotProps) {
  const lc = leafColor || color;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      style={style}
      aria-label="Pearloom"
    >
      {/* Pear silhouette — single clean path */}
      <path
        d="
          M20 12
          C20 12 16.5 13.5 15 16
          C13 19 12.5 21 13 24
          C11.5 25.5 10 27.5 10 30
          C10 34.5 14.5 38 20 38
          C25.5 38 30 34.5 30 30
          C30 27.5 28.5 25.5 27 24
          C27.5 21 27 19 25 16
          C23.5 13.5 20 12 20 12 Z
        "
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Stem */}
      <path
        d="M20 12 C20 10 20.5 7.5 19.5 5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Leaf — simple, no rotation */}
      <path
        d="M20 8 C22 5.5 27 5 27 8 C25 7 22.5 6.8 20 8 Z"
        fill={lc}
        stroke="none"
        opacity="0.6"
      />
    </svg>
  );
}
