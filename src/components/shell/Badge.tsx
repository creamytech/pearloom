'use client';

// ─────────────────────────────────────────────────────────────
// Badge — small status / category marker (design system v2).
// Two shapes: a mono editorial label (default — uppercase, tracked,
// the Pearloom voice) or a soft pill. Optional leading dot. Use
// sparingly; never pepper a screen with them (BRAND §7).
// ─────────────────────────────────────────────────────────────

import { CSSProperties, ReactNode } from 'react';

type Tone = 'olive' | 'gold' | 'plum' | 'neutral' | 'ink';
type Variant = 'label' | 'pill';

const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  olive:   { bg: 'var(--pl-olive-10)',  fg: 'var(--pl-olive)', border: 'var(--pl-olive-20)' },
  gold:    { bg: 'var(--pl-gold-mist)',  fg: '#8C6E3D',         border: 'var(--pl-gold-soft)' },
  plum:    { bg: 'var(--pl-plum-mist)',  fg: 'var(--pl-plum)',  border: 'var(--pl-plum)' },
  neutral: { bg: 'var(--pl-cream-deep)', fg: 'var(--pl-muted)', border: 'var(--pl-divider)' },
  ink:     { bg: 'var(--pl-ink)',        fg: 'var(--pl-cream)', border: 'transparent' },
};

export function Badge({
  children,
  tone = 'olive',
  variant = 'label',
  dot = false,
  className,
  style,
}: {
  children: ReactNode;
  tone?: Tone;
  variant?: Variant;
  dot?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const t = TONES[tone] ?? TONES.olive;
  const isLabel = variant === 'label';
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: isLabel ? '4px 9px' : '5px 12px',
        borderRadius: isLabel ? 'var(--pl-radius-sm)' : 'var(--pl-radius-full)',
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.border}`,
        fontFamily: isLabel ? 'var(--pl-font-mono)' : 'var(--pl-font-body)',
        fontSize: isLabel ? 'var(--pl-text-2xs)' : 'var(--pl-text-xs)',
        fontWeight: isLabel ? 500 : 600,
        letterSpacing: isLabel ? '0.16em' : '0',
        textTransform: isLabel ? 'uppercase' : 'none',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot ? (
        <span
          aria-hidden
          style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }}
        />
      ) : null}
      {children}
    </span>
  );
}
