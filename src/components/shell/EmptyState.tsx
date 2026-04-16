'use client';

// ─────────────────────────────────────────────────────────────
// EmptyState — one pattern for every "nothing here yet" surface.
// Use this everywhere instead of bespoke divs.
// ─────────────────────────────────────────────────────────────

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Compact = ~140px tall, default = ~280px tall */
  size?: 'compact' | 'default' | 'hero';
  illustration?: ReactNode;
}

export function EmptyState({
  icon,
  eyebrow,
  title,
  description,
  actions,
  size = 'default',
  illustration,
}: EmptyStateProps) {
  const minHeight = size === 'compact' ? 140 : size === 'hero' ? 420 : 280;
  return (
    <div
      style={{
        minHeight,
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: size === 'compact' ? 8 : 14,
        color: 'var(--pl-muted)',
      }}
    >
      {illustration ? (
        <div style={{ marginBottom: 6 }}>{illustration}</div>
      ) : icon ? (
        <span
          style={{
            width: size === 'compact' ? 40 : 56,
            height: size === 'compact' ? 40 : 56,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            background: 'var(--pl-olive-mist)',
            color: 'var(--pl-olive)',
            border: '1px solid var(--pl-divider)',
          }}
        >
          {icon}
        </span>
      ) : null}
      {eyebrow && <div className="pl-overline">{eyebrow}</div>}
      <h3
        style={{
          margin: 0,
          fontFamily: 'var(--pl-font-display)',
          fontWeight: 500,
          fontSize: size === 'hero' ? '1.85rem' : size === 'compact' ? '1.05rem' : '1.32rem',
          color: 'var(--pl-ink)',
          letterSpacing: '-0.01em',
          maxWidth: '24ch',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            margin: 0,
            color: 'var(--pl-muted)',
            fontSize: '0.92rem',
            lineHeight: 1.55,
            maxWidth: '44ch',
          }}
        >
          {description}
        </p>
      )}
      {actions && (
        <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
