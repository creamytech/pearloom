'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/BubbleCard.tsx
//
// Organic asymmetric card. Replaces the editorial
// cream-card-with-hairline on product-UI surfaces. Subtle
// random rotation optional for marketing hero collages; hover
// lifts + un-rotates.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties, ReactNode } from 'react';

type CardTone = 'cream' | 'sage' | 'butter' | 'rose' | 'glass';

interface BubbleCardProps {
  tone?: CardTone;
  /** Apply a gentle random tilt (use -2 to 2). */
  tilt?: number;
  /** Interactive hover (lift + un-tilt). */
  interactive?: boolean;
  /** Override to blob shape instead of rounded rectangle. */
  blobShape?: boolean;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
}

const TONE_BG: Record<CardTone, string> = {
  cream:  'var(--pl-groove-cream)',
  sage:   'color-mix(in oklab, var(--pl-groove-sage) 18%, var(--pl-groove-cream))',
  butter: 'color-mix(in oklab, var(--pl-groove-butter) 20%, var(--pl-groove-cream))',
  rose:   'color-mix(in oklab, var(--pl-groove-rose) 22%, var(--pl-groove-cream))',
  glass:  'color-mix(in oklab, var(--pl-groove-cream) 70%, transparent)',
};

export function BubbleCard({
  tone = 'cream',
  tilt = 0,
  interactive = false,
  blobShape = false,
  children,
  style,
  className,
  onClick,
}: BubbleCardProps) {
  const isInteractive = interactive || !!onClick;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={className}
      style={{
        padding: '22px 24px',
        background: TONE_BG[tone],
        borderRadius: blobShape
          ? 'var(--pl-groove-radius-blob)'
          : '28px',
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        boxShadow:
          '0 2px 6px rgba(43,30,20,0.04), 0 18px 40px rgba(139,74,106,0.08)',
        transition:
          'transform var(--pl-dur-base) var(--pl-groove-ease-bloom),' +
          ' box-shadow var(--pl-dur-base) var(--pl-ease-out)',
        cursor: isInteractive ? 'pointer' : undefined,
        backdropFilter: tone === 'glass' ? 'blur(16px)' : undefined,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isInteractive) return;
        e.currentTarget.style.transform = 'translateY(-3px) rotate(0deg)';
        e.currentTarget.style.boxShadow =
          '0 4px 10px rgba(43,30,20,0.06), 0 24px 56px rgba(139,74,106,0.14)';
      }}
      onMouseLeave={(e) => {
        if (!isInteractive) return;
        e.currentTarget.style.transform = tilt ? `rotate(${tilt}deg)` : '';
        e.currentTarget.style.boxShadow =
          '0 2px 6px rgba(43,30,20,0.04), 0 18px 40px rgba(139,74,106,0.08)';
      }}
    >
      {children}
    </div>
  );
}
