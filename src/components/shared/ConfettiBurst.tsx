'use client';

import { useMemo } from 'react';

// ─── Confetti Burst ─────────────────────────────────────────
// CSS-only confetti celebration with pastel shapes.
// Renders small circles and diamonds in olive, gold, cream, plum.
// Duration: 2.5s then fades out.

const COLORS = [
  '#A3B18A', // olive
  '#C4A96A', // gold
  '#F0EBE0', // cream
  '#6D597A', // plum
];

const SHAPES = ['circle', 'diamond'] as const;
const PIECE_COUNT = 24;

interface Piece {
  id: number;
  color: string;
  shape: (typeof SHAPES)[number];
  left: number;
  top: number;
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
  size: number;
}

function seededPieces(): Piece[] {
  const pieces: Piece[] = [];
  for (let i = 0; i < PIECE_COUNT; i++) {
    // Distribute across the area
    pieces.push({
      id: i,
      color: COLORS[i % COLORS.length],
      shape: SHAPES[i % SHAPES.length],
      left: 10 + (i * 3.5) % 80,
      top: -5 - (i % 5) * 4,
      delay: (i * 0.07) % 0.5,
      duration: 1.8 + (i % 4) * 0.25,
      drift: (i % 2 === 0 ? 1 : -1) * (8 + (i % 6) * 4),
      rotate: (i % 2 === 0 ? 1 : -1) * (180 + (i % 3) * 120),
      size: 5 + (i % 3) * 2,
    });
  }
  return pieces;
}

export function ConfettiBurst() {
  const pieces = useMemo(() => seededPieces(), []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '1px',
            transform: p.shape === 'diamond' ? 'rotate(45deg)' : undefined,
            opacity: 0,
            animation: `pl-confetti-fall ${p.duration}s ease-out ${p.delay}s both`,
            ['--pl-confetti-rotate' as string]: `${p.rotate}deg`,
            ['--pl-confetti-drift' as string]: `${p.drift}px`,
          }}
        >
          {/* Horizontal drift via nested wrapper */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              animation: `pl-confetti-drift ${p.duration * 0.8}s ease-in-out ${p.delay}s both`,
              ['--pl-confetti-drift' as string]: `${p.drift}px`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
