'use client';

// ─────────────────────────────────────────────────────────────
// StatTile — single hero metric. The "calm mission control"
// affordance for the new Event HQ. Pair these in a 3-4 col grid.
// ─────────────────────────────────────────────────────────────

import { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: { dir: 'up' | 'down' | 'flat'; label: string };
  accent?: 'olive' | 'gold' | 'plum' | 'none';
  icon?: ReactNode;
}

const accentMap = {
  olive: 'var(--pl-olive)',
  gold: 'var(--pl-gold)',
  plum: 'var(--pl-plum)',
  none: 'var(--pl-divider)',
} as const;

export function StatTile({ label, value, hint, trend, accent = 'olive', icon }: StatTileProps) {
  return (
    <article
      style={{
        position: 'relative',
        background: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-divider)',
        borderRadius: 'var(--pl-radius-lg)',
        padding: '20px 22px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accentMap[accent],
          opacity: 0.85,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && (
          <span
            style={{
              width: 32,
              height: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--pl-radius-md)',
              background: 'var(--pl-olive-mist)',
              color: 'var(--pl-olive)',
            }}
          >
            {icon}
          </span>
        )}
        <span
          className="pl-overline"
          style={{ fontSize: '0.75rem', letterSpacing: '0.18em' }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--pl-font-display)',
          fontWeight: 400,
          fontSize: 'clamp(2rem, 4vw, 2.6rem)',
          letterSpacing: '-0.025em',
          lineHeight: 1,
          color: 'var(--pl-ink)',
          fontVariationSettings: '"opsz" 144, "SOFT" 50',
        }}
      >
        {value}
      </div>
      {(hint || trend) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.78rem',
            color: 'var(--pl-muted)',
            marginTop: 4,
          }}
        >
          {trend && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color:
                  trend.dir === 'up'
                    ? 'var(--pl-olive)'
                    : trend.dir === 'down'
                    ? 'var(--pl-plum)'
                    : 'var(--pl-muted)',
                fontWeight: 600,
              }}
            >
              {trend.dir === 'up' ? '↑' : trend.dir === 'down' ? '↓' : '→'} {trend.label}
            </span>
          )}
          {hint}
        </div>
      )}
    </article>
  );
}
