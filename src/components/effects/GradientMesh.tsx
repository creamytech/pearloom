'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / effects/GradientMesh.tsx
// WebGL mesh gradient backdrop powered by @paper-design/shaders.
// Each preset maps to a curated color set rendered as a flowing
// MeshGradient shader behind all content via fixed positioning.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { MeshGradient as PaperMeshGradient } from '@paper-design/shaders-react';

type MeshPreset = 'none' | 'aurora' | 'sunset' | 'ocean' | 'forest' | 'rose' | 'champagne' | 'twilight' | 'custom';
type MeshSpeed = 'still' | 'slow' | 'medium' | 'fast';

interface GradientMeshProps {
  preset: MeshPreset;
  speed: MeshSpeed;
  opacity: number; // 0–100
  accentColor?: string; // used by 'custom' preset
}

const PRESETS: Record<Exclude<MeshPreset, 'none'>, { colors: string[] }> = {
  aurora: {
    colors: ['#00C6FF', '#7B2FF7', '#00FFA3', '#0F3460'],
  },
  sunset: {
    colors: ['#FF6B6B', '#FFA500', '#FF1493', '#FFD700'],
  },
  ocean: {
    colors: ['#006994', '#00B4D8', '#0077B6', '#90E0EF'],
  },
  forest: {
    colors: ['#2D6A4F', '#52B788', '#B7E4C7', '#1B4332'],
  },
  rose: {
    colors: ['#FFAFCC', '#FFC8DD', '#CDB4DB', '#BDE0FE'],
  },
  champagne: {
    colors: ['#C9A87C', '#F5E6D0', '#E8C99A', '#D4AF80'],
  },
  twilight: {
    colors: ['#2C1654', '#6B2FA0', '#C850C0', '#4158D0'],
  },
  custom: {
    colors: ['#A3B18A', '#3A5A40', '#588157', '#DAD7CD'],
  },
};

const SPEED_MAP: Record<MeshSpeed, number> = {
  still: 0,
  slow: 0.15,
  medium: 0.35,
  fast: 0.7,
};

export function GradientMesh({ preset, speed, opacity, accentColor }: GradientMeshProps) {
  if (preset === 'none' || opacity <= 0) return null;

  const colors = useMemo(() => {
    if (preset === 'custom' && accentColor) {
      // Derive 4 shades from the accent color
      return [accentColor, accentColor + 'cc', accentColor + '88', accentColor + '44'];
    }
    return PRESETS[preset as Exclude<MeshPreset, 'none'>]?.colors ?? PRESETS.champagne.colors;
  }, [preset, accentColor]);

  const shaderSpeed = SPEED_MAP[speed];
  const finalOpacity = (opacity / 100) * 0.7;

  return (
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
      <PaperMeshGradient
        colors={colors}
        speed={shaderSpeed}
        distortion={0.4}
        swirl={0.3}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
