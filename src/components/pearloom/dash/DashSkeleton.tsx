'use client';

// ─────────────────────────────────────────────────────────────
// DashSkeleton — shared loading primitives that match the shape
// of the page content that follows. Replaces plain "Threading…"
// text with dimensional placeholders so loading states feel
// continuous with the rendered UI.
//
// Three pre-built compositions cover ~90% of dashboard pages:
//   - <DashSkeleton kind="card-grid" />   3-column site cards
//   - <DashSkeleton kind="stat-row" />    horizontal stat tiles
//   - <DashSkeleton kind="list" />        vertical row list
//
// Each composes from <SkeletonBlock /> primitives that pulse
// with the same pl-dot-pulse keyframe as the SaveDot — keeps
// the loading rhythm coherent across the product.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';

export interface DashSkeletonProps {
  kind?: 'card-grid' | 'stat-row' | 'list' | 'page';
  /** Card grid: how many cards. Defaults: 3. */
  count?: number;
  /** Optional label rendered above the skeleton — keeps screen
   *  readers informed. Hidden visually unless `showLabel`. */
  label?: string;
  showLabel?: boolean;
  style?: CSSProperties;
}

export function DashSkeleton({ kind = 'list', count, label = 'Loading', showLabel, style }: DashSkeletonProps) {
  const visuallyHiddenLabel: CSSProperties = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    border: 0,
  };

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        ...style,
      }}
    >
      <span style={showLabel ? { fontSize: 12, color: 'var(--ink-muted)' } : visuallyHiddenLabel}>{label}</span>

      {kind === 'card-grid' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          {Array.from({ length: count ?? 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--card-ring)',
                borderRadius: 18,
                overflow: 'hidden',
                animationDelay: `${i * 80}ms`,
              }}
            >
              <SkeletonBlock height={140} radius={0} />
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SkeletonBlock width="40%" height={10} />
                <SkeletonBlock width="80%" height={22} />
                <SkeletonBlock width="60%" height={12} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <SkeletonBlock width={64} height={26} radius={999} />
                  <SkeletonBlock width={72} height={26} radius={999} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {kind === 'stat-row' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${count ?? 4}, minmax(0, 1fr))`,
            gap: 12,
          }}
        >
          {Array.from({ length: count ?? 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--card-ring)',
                borderRadius: 14,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <SkeletonBlock width={80} height={9} />
              <SkeletonBlock width={48} height={26} />
              <SkeletonBlock width={70} height={9} />
            </div>
          ))}
        </div>
      )}

      {kind === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.from({ length: count ?? 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '54px 1fr auto',
                gap: 12,
                padding: 10,
                background: 'var(--cream-2)',
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <SkeletonBlock height={44} radius={8} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SkeletonBlock width="60%" height={13} />
                <SkeletonBlock width="80%" height={10} />
              </div>
              <SkeletonBlock width={56} height={20} radius={999} />
            </div>
          ))}
        </div>
      )}

      {kind === 'page' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <DashSkeleton kind="stat-row" />
          <DashSkeleton kind="card-grid" />
        </div>
      )}
    </div>
  );
}

function SkeletonBlock({
  width,
  height = 14,
  radius = 6,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: 'block',
        width: width ?? '100%',
        height,
        borderRadius: radius,
        background:
          'linear-gradient(90deg, rgba(14,13,11,0.06) 0%, rgba(14,13,11,0.10) 50%, rgba(14,13,11,0.06) 100%)',
        backgroundSize: '200% 100%',
        animation: 'pl8-skeleton-shimmer 1400ms ease-in-out infinite',
      }}
    />
  );
}
