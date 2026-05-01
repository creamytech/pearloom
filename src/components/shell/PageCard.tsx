'use client';

// ─────────────────────────────────────────────────────────────
// PageCard — the universal card chrome. Replaces three different
// card patterns across the dashboard (elevated, flat, bare).
// Use this everywhere; if you find yourself styling a <div> with
// background+border+radius, use this instead.
// ─────────────────────────────────────────────────────────────

import { ReactNode, CSSProperties } from 'react';

interface PageCardProps {
  title?: ReactNode;
  eyebrow?: string;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  /** "ghost" = no border/shadow, "elevated" = lifted, default = subtle */
  variant?: 'default' | 'elevated' | 'ghost' | 'inset';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  accent?: 'olive' | 'gold' | 'plum' | 'none';
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

const padMap = { none: 0, sm: 14, md: 22, lg: 32 } as const;
const accentColorMap = {
  olive: 'var(--pl-olive)',
  gold:  'var(--pl-gold)',
  plum:  'var(--pl-plum)',
  none:  'transparent',
} as const;

export function PageCard({
  title,
  eyebrow,
  description,
  actions,
  footer,
  variant = 'default',
  padding = 'md',
  accent = 'none',
  children,
  style,
  className,
}: PageCardProps) {
  const pad = padMap[padding];
  const baseStyle: CSSProperties = {
    position: 'relative',
    background:
      variant === 'ghost'
        ? 'transparent'
        : variant === 'inset'
        ? 'var(--pl-cream-deep)'
        : 'var(--pl-cream-card)',
    border:
      variant === 'ghost'
        ? '1px dashed var(--pl-divider)'
        : '1px solid var(--pl-divider)',
    borderRadius: 'var(--pl-radius-lg)',
    boxShadow:
      variant === 'elevated'
        ? 'var(--pl-shadow-md)'
        : variant === 'ghost' || variant === 'inset'
        ? 'none'
        : 'var(--pl-shadow-sm)',
    overflow: 'hidden',
    ...style,
  };

  const hasHeader = title || eyebrow || description || actions;

  return (
    <section style={baseStyle} className={className}>
      {accent !== 'none' && (
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: accentColorMap[accent],
            opacity: 0.9,
          }}
        />
      )}
      {hasHeader && (
        <header
          style={{
            padding: `${pad}px ${pad}px ${footer || children ? Math.max(pad - 8, 8) : pad}px`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
            borderBottom: children ? '1px solid var(--pl-divider-soft)' : 'none',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && (
              <div className="pl-overline" style={{ marginBottom: 6 }}>
                {eyebrow}
              </div>
            )}
            {title &&
              (typeof title === 'string' ? (
                <h2
                  style={{
                    margin: 0,
                    fontFamily: 'var(--pl-font-display)',
                    fontWeight: 500,
                    fontSize: '1.18rem',
                    letterSpacing: '-0.014em',
                    color: 'var(--pl-ink)',
                    lineHeight: 1.15,
                  }}
                >
                  {title}
                </h2>
              ) : (
                title
              ))}
            {description && (
              <p
                style={{
                  margin: '6px 0 0',
                  color: 'var(--pl-muted)',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  maxWidth: '60ch',
                }}
              >
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              {actions}
            </div>
          )}
        </header>
      )}
      {children && <div style={{ padding: pad }}>{children}</div>}
      {footer && (
        <footer
          style={{
            padding: `${Math.max(pad - 4, 10)}px ${pad}px`,
            borderTop: '1px solid var(--pl-divider-soft)',
            background: 'var(--pl-cream-deep)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {footer}
        </footer>
      )}
    </section>
  );
}
