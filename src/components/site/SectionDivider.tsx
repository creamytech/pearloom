'use client';

/**
 * Generic section wave divider — renders a curve-type-specific SVG wave
 * that adapts to the site's VibeSkin curve property. Replaces the brand-specific
 * PearSectionDivider on user-generated sites.
 */

import type { VibeSkin } from '@/lib/vibe-engine';

interface SectionDividerProps {
  color?: string;
  opacity?: number;
  curve?: VibeSkin['curve'];
  className?: string;
  flip?: boolean;
}

const WAVE_PATHS: Record<VibeSkin['curve'], string> = {
  organic: `M0 32 C120 48,240 16,360 28 C480 40,600 52,720 38 C840 24,960 44,1080 36 C1200 28,1320 46,1440 34 L1440 60 L0 60 Z`,
  arch: `M0 40 Q180 10,360 40 Q540 10,720 40 Q900 10,1080 40 Q1260 10,1440 40 L1440 60 L0 60 Z`,
  geometric: `M0 30 L120 42 L240 24 L360 38 L480 20 L600 36 L720 22 L840 40 L960 26 L1080 38 L1200 22 L1320 36 L1440 28 L1440 60 L0 60 Z`,
  wave: `M0 28 C240 56,480 8,720 36 C960 64,1200 12,1440 32 L1440 60 L0 60 Z`,
  petal: `M0 36 C60 24,120 42,180 30 C240 18,300 40,360 28 C420 16,480 38,540 26 C600 14,660 36,720 24 C780 12,840 34,900 22 C960 10,1020 32,1080 20 C1140 8,1200 30,1260 18 C1320 6,1380 28,1440 20 L1440 60 L0 60 Z`,
  cascade: `M0 20 C160 20,160 40,320 40 C480 40,480 24,640 24 C800 24,800 44,960 44 C1120 44,1120 28,1280 28 C1360 28,1400 32,1440 36 L1440 60 L0 60 Z`,
  ribbon: `M0 30 C80 44,160 18,240 32 C320 46,400 14,480 34 C560 50,640 12,720 30 C800 48,880 16,960 32 C1040 48,1120 14,1200 30 C1280 46,1360 18,1440 34 L1440 60 L0 60 Z`,
  mountain: `M0 44 L180 18 L300 38 L480 10 L600 34 L780 6 L900 30 L1080 14 L1200 36 L1380 20 L1440 28 L1440 60 L0 60 Z`,
};

export function SectionDivider({
  color = 'var(--eg-bg)',
  opacity = 1,
  curve = 'organic',
  className,
  flip = false,
}: SectionDividerProps) {
  return (
    <svg
      width="100%"
      height="60"
      viewBox="0 0 1440 60"
      preserveAspectRatio="none"
      fill={color}
      style={{
        opacity,
        display: 'block',
        transform: flip ? 'scaleY(-1)' : undefined,
      }}
      className={className}
      aria-hidden="true"
    >
      <path d={WAVE_PATHS[curve]} />
    </svg>
  );
}
