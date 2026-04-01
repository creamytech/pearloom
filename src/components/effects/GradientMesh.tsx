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

// Keyframe positions for each of the 4 blobs — deliberately asymmetric
const BLOB_PATHS = [
  // blob 0: top-left → center → bottom-right
  ['10% 15%', '55% 45%', '80% 75%', '25% 85%', '10% 15%'],
  // blob 1: top-right → left → bottom
  ['85% 10%', '15% 40%', '60% 90%', '85% 55%', '85% 10%'],
  // blob 2: center → corners
  ['50% 50%', '90% 20%', '10% 80%', '70% 60%', '50% 50%'],
  // blob 3: bottom-left drifter
  ['20% 80%', '75% 65%', '40% 20%', '10% 35%', '20% 80%'],
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
  const finalOpacity = (opacity / 100) * 0.65; // cap at 0.65 so text stays readable

  const keyframes = colors.map((color, i) => {
    const path = BLOB_PATHS[i] ?? BLOB_PATHS[0];
    const name = `pl-mesh-${i}`;
    return `
      @keyframes ${name} {
        ${path.map((pos, step) => `${Math.round((step / (path.length - 1)) * 100)}% { background-position: ${pos}; }`).join('\n        ')}
      }
    `;
  }).join('\n');

  return (
    <>
      <style>{keyframes}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0, // behind all page content but above the html background
          pointerEvents: 'none',
          opacity: finalOpacity,
          overflow: 'hidden',
        }}
      >
        {colors.map((color, i) => {
          const name = `pl-mesh-${i}`;
          const size = 60 + i * 15; // each blob slightly different size
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: `${size}%`,
                height: `${size}%`,
                borderRadius: '50%',
                background: `radial-gradient(circle at center, ${color}cc 0%, ${color}55 40%, transparent 70%)`,
                filter: 'blur(80px)',
                backgroundSize: '200% 200%',
                backgroundPosition: BLOB_PATHS[i]?.[0] ?? '50% 50%',
                animation: duration > 0
                  ? `${name} ${duration + i * 3}s ease-in-out infinite`
                  : undefined,
                willChange: duration > 0 ? 'background-position' : undefined,
                // Offset each blob to different quadrant
                top: `${[-20, 20, 10, 40][i]}%`,
                left: `${[-10, 40, 60, 5][i]}%`,
              }}
            />
          );
        })}
      </div>
    </>
  );
}
