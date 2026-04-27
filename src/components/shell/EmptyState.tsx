'use client';

// ─────────────────────────────────────────────────────────────
// EmptyState — one pattern for every "nothing here yet" surface.
// Use this everywhere instead of bespoke divs.
//
// Brand-styled (v7): a small italic title is centered between
// two short woven Threads, with the optional eyebrow set in
// the editorial Folio style. Honors prefers-reduced-motion via
// the Thread primitive's own opt-out.
// ─────────────────────────────────────────────────────────────

import { ReactNode } from 'react';
import { Thread } from '@/components/brand/Thread';
import { Folio } from '@/components/brand/Folio';

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
            borderRadius: 'var(--pl-radius-full)',
            background: 'var(--pl-olive-mist)',
            color: 'var(--pl-olive)',
            border: '1px solid var(--pl-divider)',
          }}
        >
          {icon}
        </span>
      ) : null}
      {eyebrow && <Folio kicker={eyebrow} size={size === 'compact' ? 'xs' : 'sm'} rules={false} />}
      <h3
        className="pl-letterpress"
        style={{
          margin: 0,
          fontFamily: 'var(--pl-font-display)',
          fontStyle: 'italic',
          fontWeight: 500,
          fontVariationSettings: '"opsz" 144, "SOFT" 60, "WONK" 0',
          fontSize: size === 'hero' ? '1.95rem' : size === 'compact' ? '1.1rem' : '1.4rem',
          color: 'var(--pl-ink)',
          letterSpacing: '-0.015em',
          maxWidth: '24ch',
        }}
      >
        {title}
      </h3>
      {/* Tiny woven thread separator — the brand's quiet visual signature. */}
      <Thread variant="weave" width={size === 'compact' ? '40px' : '64px'} height={10} weight={0.9} ariaHidden style={{ opacity: 0.55 }} />
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
