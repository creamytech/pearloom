'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / effects/GradientMesh.tsx
// Animated multi-radial-gradient mesh backdrop.
// Each preset is a curated set of colors. Speed controls the
// CSS animation duration. Renders behind all content via z-index.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';

type MeshPreset = 'none' | 'aurora' | 'sunset' | 'ocean' | 'forest' | 'rose' | 'champagne' | 'twilight' | 'custom';
type MeshSpeed = 'still' | 'slow' | 'medium' | 'fast';

interface GradientMeshProps {
  preset: MeshPreset;
  speed: MeshSpeed;
  opacity: number; // 0–100
  accentColor?: string; // used by 'custom' preset
}

const PRESETS: Record<Exclude<MeshPreset, 'none'>, { blobs: string[] }> = {
  aurora: {
    blobs: ['#00C6FF', '#7B2FF7', '#00FFA3', '#0F3460'],
  },
  sunset: {
    blobs: ['#FF6B6B', '#FFA500', '#FF1493', '#FFD700'],
  },
  ocean: {
    blobs: ['#006994', '#00B4D8', '#0077B6', '#90E0EF'],
  },
  forest: {
    blobs: ['#2D6A4F', '#52B788', '#B7E4C7', '#1B4332'],
  },
  rose: {
    blobs: ['#FFAFCC', '#FFC8DD', '#CDB4DB', '#BDE0FE'],
  },
  champagne: {
    blobs: ['#C9A87C', '#F5E6D0', '#E8C99A', '#D4AF80'],
  },
  twilight: {
    blobs: ['#2C1654', '#6B2FA0', '#C850C0', '#4158D0'],
  },
  custom: {
    blobs: ['#A3B18A', '#3A5A40', '#588157', '#DAD7CD'],
  },
};

const SPEED_DURATION: Record<MeshSpeed, number> = {
  still: 0,
  slow: 28,
  medium: 14,
  fast: 6,
};

// Each blob drifts between translate offsets (as % of viewport).
// Using transform: translate() so the motion is actually visible.
// [x0,y0, x1,y1, x2,y2, x3,y3, x4,y4] — 5 keyframe stops that loop.
const BLOB_DRIFT: Array<[number, number, number, number, number, number, number, number, number, number]> = [
  [  0,   0,  18, -12,  -8,  20, 14,  6,   0,   0],
  [  0,   0, -16,  14,  10, -18, -6, 12,   0,   0],
  [  0,   0,  12,  18, -14,  -8,  8,-16,   0,   0],
  [  0,   0, -10, -16,  16,  10,-12,  8,   0,   0],
];

// Blob starting positions (top/left as % of container)
const BLOB_ORIGINS = [
  { top: -10, left: -10 },
  { top:  20, left:  55 },
  { top:  40, left:  10 },
  { top: -5,  left:  65 },
];

export function GradientMesh({ preset, speed, opacity, accentColor }: GradientMeshProps) {
  if (preset === 'none' || opacity <= 0) return null;

  const colors = useMemo(() => {
    if (preset === 'custom' && accentColor) {
      return [accentColor, accentColor + '88', accentColor + '44', accentColor + 'cc'];
    }
    return PRESETS[preset as Exclude<MeshPreset, 'none'>]?.blobs ?? PRESETS.champagne.blobs;
  }, [preset, accentColor]);

  const duration = SPEED_DURATION[speed];
  const finalOpacity = (opacity / 100) * 0.7;

  // Build @keyframes that animate transform translate — actually moves the blob
  const keyframes = colors.map((_, i) => {
    const drift = BLOB_DRIFT[i] ?? BLOB_DRIFT[0];
    const name = `pl-mesh-${i}`;
    const stops = [0, 25, 50, 75, 100];
    const pairs: Array<[number, number]> = [
      [drift[0], drift[1]],
      [drift[2], drift[3]],
      [drift[4], drift[5]],
      [drift[6], drift[7]],
      [drift[8], drift[9]],
    ];
    return `@keyframes ${name} {
      ${stops.map((pct, s) => `${pct}% { transform: translate(${pairs[s][0]}%, ${pairs[s][1]}%); }`).join('\n      ')}
    }`;
  }).join('\n');

  return (
    <>
      <style>{keyframes}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          opacity: finalOpacity,
          overflow: 'hidden',
        }}
      >
        {colors.map((color, i) => {
          const name = `pl-mesh-${i}`;
          const size = 65 + i * 12;
          const origin = BLOB_ORIGINS[i] ?? BLOB_ORIGINS[0];
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: `${size}%`,
                height: `${size}%`,
                borderRadius: '50%',
                background: `radial-gradient(circle at 40% 40%, ${color}dd 0%, ${color}66 35%, transparent 70%)`,
                filter: 'blur(90px)',
                top: `${origin.top}%`,
                left: `${origin.left}%`,
                animation: duration > 0
                  ? `${name} ${duration + i * 4}s ease-in-out infinite`
                  : undefined,
                willChange: duration > 0 ? 'transform' : undefined,
              }}
            />
          );
        })}
      </div>
    </>
  );
}
