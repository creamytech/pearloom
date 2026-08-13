'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/Folio.tsx
//
// The editorial corner-mark — Pearloom's tiny "you are here"
// signal that gives every screen the feel of a printed page.
// Mono-uppercase label paired with a 1px gold rule.
//
//   Folio · No. 03 · Day-of
//
// Used in: page corners, panel headers, modal titles, anywhere
// a screen needs a quiet location anchor.
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';

interface FolioProps {
  /** Eyebrow text (e.g. "Edition", "Stage", "Folio"). */
  kicker?: string;
  /** The number / index. Auto-prefixed with "No.". */
  no?: number | string;
  /** The label that follows the number. */
  label?: ReactNode;
  /** Display direction: row (default), or column for large headers. */
  direction?: 'row' | 'column';
  /** Color of the rules + glyphs. */
  ruleColor?: string;
  /** Color of the text. */
  color?: string;
  /** Show or hide the rules. */
  rules?: boolean;
  /** Visual weight. */
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
}

const SIZES = {
  xs: { font: '0.54rem', tracking: '0.22em', rule: 14 },
  sm: { font: '0.62rem', tracking: '0.24em', rule: 22 },
  md: { font: '0.7rem', tracking: '0.28em', rule: 32 },
};

export function Folio({
  kicker,
  no,
  label,
  direction = 'row',
  ruleColor = 'var(--pl-gold)',
  color = 'var(--pl-muted)',
  rules = true,
  size = 'sm',
  className,
  style,
}: FolioProps) {
  const cfg = SIZES[size];

  const meta = [
    kicker,
    no !== undefined ? `No. ${typeof no === 'number' ? String(no).padStart(2, '0') : no}` : null,
    label,
  ].filter(Boolean);

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: direction === 'column' ? 'column' : 'row',
        alignItems: direction === 'column' ? 'flex-start' : 'center',
        gap: direction === 'column' ? 6 : 12,
        fontFamily: 'var(--pl-font-mono)',
        fontSize: cfg.font,
        letterSpacing: cfg.tracking,
        textTransform: 'uppercase',
        color,
        fontWeight: 600,
        ...style,
      }}
    >
      {rules && direction === 'row' && (
        <span aria-hidden style={{ width: cfg.rule, height: 1, background: ruleColor }} />
      )}
      {meta.map((m, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          {m}
          {i < meta.length - 1 && (
            <span
              aria-hidden
              style={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: ruleColor,
                opacity: 0.7,
                marginLeft: 6,
              }}
            />
          )}
        </span>
      ))}
      {rules && direction === 'row' && (
        <span aria-hidden style={{ width: cfg.rule, height: 1, background: ruleColor }} />
      )}
      {rules && direction === 'column' && (
        <span aria-hidden style={{ width: cfg.rule * 1.4, height: 1, background: ruleColor, marginTop: 6 }} />
      )}
    </div>
  );
}
