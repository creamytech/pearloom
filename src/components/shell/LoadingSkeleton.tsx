'use client';

// ─────────────────────────────────────────────────────────────
// LoadingSkeleton — paper-shimmer skeletons. Use these instead
// of "Loading…" text. Two pieces:
//   <Skeleton />     — single bar
//   <SkeletonStack/> — vertical column of bars (article shape)
// ─────────────────────────────────────────────────────────────

import { CSSProperties } from 'react';

export function Skeleton({
  width = '100%',
  height = 14,
  radius = 6,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: 'inline-block',
        width,
        height,
        borderRadius: radius,
        background:
          'linear-gradient(90deg, var(--pl-cream-deep) 0%, var(--pl-divider-soft) 50%, var(--pl-cream-deep) 100%)',
        backgroundSize: '200% 100%',
        animation: 'pl-shimmer 1.6s linear infinite',
        ...style,
      }}
      aria-hidden
    />
  );
}

export function SkeletonStack({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          height={i === 0 ? 22 : 14}
          width={i === 0 ? '40%' : i === rows - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-divider)',
        borderRadius: 'var(--pl-radius-lg)',
        padding: 22,
      }}
    >
      <SkeletonStack rows={4} />
    </div>
  );
}
