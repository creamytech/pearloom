'use client';
import React from 'react';

// ─────────────────────────────────────────────────────────────
// Pearloom / PearMascot.tsx — The Elegant Pear
// Minimal line-art mascot with 6 mood expressions.
// Single continuous stroke, calligraphic leaf, subtle face.
// Changes only eye shape, leaf angle, and optional sparkle.
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
  mood = 'idle',
  color = 'var(--pl-ink-soft, #3D3530)',
  leafColor = 'var(--pl-olive, #A3B18A)',
  className,
  style,
}: PearMascotProps) {
  const w = size;
  const h = size;
  const id = `pear-mascot-${Math.random().toString(36).slice(2, 6)}`;

  // ── Expression parameters per mood ──
  const expressions: Record<PearMood, {
    leftEye: React.ReactNode;
    rightEye: React.ReactNode;
    mouth: React.ReactNode;
    leafRotate: number;
    sparkle: boolean;
    blush: boolean;
    bounce: boolean;
  }> = {
    idle: {
      leftEye: <circle cx="17.5" cy="24" r="1.2" fill={color} />,
      rightEye: <circle cx="22.5" cy="24" r="1.2" fill={color} />,
      mouth: <path d="M18.5 27.5 Q20 28.8 21.5 27.5" fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round" />,
      leafRotate: 0,
      sparkle: false,
      blush: false,
      bounce: false,
    },
    thinking: {
      // Closed crescent eyes
      leftEye: <path d="M16.5 24 Q17.5 22.5 18.5 24" fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" />,
      rightEye: <path d="M21.5 24 Q22.5 22.5 23.5 24" fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" />,
      mouth: <path d="M19 27.5 Q20 28.2 21 27.5" fill="none" stroke={color} strokeWidth="0.7" strokeLinecap="round" />,
      leafRotate: -15,
      sparkle: false,
      blush: false,
      bounce: false,
    },
    happy: {
      // Slightly larger, bright eyes
      leftEye: <circle cx="17.5" cy="23.8" r="1.4" fill={color} />,
      rightEye: <circle cx="22.5" cy="23.8" r="1.4" fill={color} />,
      mouth: <path d="M18 27 Q20 29.5 22 27" fill="none" stroke={color} strokeWidth="0.9" strokeLinecap="round" />,
      leafRotate: 8,
      sparkle: false,
      blush: true,
      bounce: false,
    },
    error: {
      // Concerned — one eye slightly lower, worried brow
      leftEye: <circle cx="17.5" cy="24.5" r="1.1" fill={color} />,
      rightEye: <circle cx="22.5" cy="24" r="1.1" fill={color} />,
      mouth: <path d="M18.5 28 Q20 27 21.5 28" fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round" />,
      leafRotate: -25,
      sparkle: false,
      blush: false,
      bounce: false,
    },
    celebrating: {
      // Bright eyes, big smile, sparkle
      leftEye: <circle cx="17.5" cy="23.5" r="1.5" fill={color} />,
      rightEye: <circle cx="22.5" cy="23.5" r="1.5" fill={color} />,
      mouth: <path d="M17.5 27 Q20 30 22.5 27" fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" />,
      leafRotate: 12,
      sparkle: true,
      blush: true,
      bounce: true,
    },
    greeting: {
      // Gentle wink (left eye closed, right open)
      leftEye: <path d="M16.5 24 Q17.5 22.8 18.5 24" fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" />,
      rightEye: <circle cx="22.5" cy="24" r="1.3" fill={color} />,
      mouth: <path d="M18 27.2 Q20 29 22 27.2" fill="none" stroke={color} strokeWidth="0.9" strokeLinecap="round" />,
      leafRotate: 5,
      sparkle: false,
      blush: true,
      bounce: false,
    },
  };

  const expr = expressions[mood];

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      style={{
        ...style,
        ...(expr.bounce ? { animation: 'pl-pear-celebrate 0.6s ease' } : {}),
      }}
      aria-label={`Pear mascot — ${mood}`}
    >
      <defs>
        {/* Subtle body gradient */}
        <linearGradient id={`${id}-body`} x1="20" y1="10" x2="20" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0.04" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
        {/* Leaf gradient — olive to gold */}
        <linearGradient id={`${id}-leaf`} x1="20" y1="4" x2="28" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={leafColor} />
          <stop offset="100%" stopColor="var(--pl-gold, #C4A96A)" />
        </linearGradient>
      </defs>

      {/* ── Pear body — single continuous line stroke ── */}
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
        fill={`url(#${id}-body)`}
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Light reflection — elegant crescent ── */}
      <path
        d="M15.5 19 C16 22 15.5 27 16.5 31"
        stroke={color}
        strokeWidth="0.4"
        opacity="0.12"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Stem — elegant curve ── */}
      <path
        d="M20 12 C20 10 20.5 7.5 19.5 5"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Leaf — calligraphic, rotates with mood ── */}
      <g
        style={{
          transformOrigin: '20px 8px',
          transform: `rotate(${expr.leafRotate}deg)`,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <path
          d="M20 8 C22 5.5 27 5 27 8 C25 7 22.5 6.8 20 8 Z"
          fill={`url(#${id}-leaf)`}
          stroke="none"
          opacity="0.85"
        />
        {/* Leaf vein */}
        <path
          d="M21 7.5 C23 6.8 25 7 26 7.5"
          stroke={leafColor}
          strokeWidth="0.3"
          opacity="0.4"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* ── Face — changes with mood ── */}
      {expr.leftEye}
      {expr.rightEye}
      {expr.mouth}

      {/* ── Blush — rosy cheeks ── */}
      {expr.blush && (
        <>
          <circle cx="15.5" cy="26" r="2" fill="#E8A090" opacity="0.15" />
          <circle cx="24.5" cy="26" r="2" fill="#E8A090" opacity="0.15" />
        </>
      )}

      {/* ── Sparkle — only on celebrating ── */}
      {expr.sparkle && (
        <>
          <g opacity="0.7">
            <path d="M8 8 L8.5 6 L9 8 L11 8.5 L9 9 L8.5 11 L8 9 L6 8.5 Z" fill="var(--pl-gold, #C4A96A)" />
          </g>
          <g opacity="0.5">
            <path d="M32 14 L32.3 12.8 L32.6 14 L33.8 14.3 L32.6 14.6 L32.3 15.8 L32 14.6 L30.8 14.3 Z" fill="var(--pl-gold, #C4A96A)" />
          </g>
          <g opacity="0.4">
            <path d="M6 20 L6.2 19.2 L6.4 20 L7.2 20.2 L6.4 20.4 L6.2 21 L6 20.4 L5.2 20.2 Z" fill={leafColor} />
          </g>
        </>
      )}
    </svg>
  );
}
