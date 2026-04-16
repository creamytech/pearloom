'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/editor-utils.tsx
// Shared styles and components for editor panels
// Organic glass design system with consistent spacing
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { parseLocalDate } from '@/lib/date';

// ── Spacing system (4px base unit) ───────────────────────────
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
} as const;

// ── Font size hierarchy ──────────────────────────────────────
export const fontSize = {
  '2xs': '0.55rem',  // Tiny badges
  xs: '0.6rem',      // Labels, captions
  sm: '0.65rem',     // Hints, meta
  md: '0.75rem',     // Body text, chips
  lg: '0.8rem',      // Inputs, prominent text
  xl: '0.9rem',      // Panel headings
} as const;

// ── Shared label style ────────────────────────────────────────
// Mirrors PanelField's label tokens so inputs built on editor-utils
// look identical to those built on the new Panel primitives.
export const lbl: React.CSSProperties = {
  display: 'block', fontSize: fontSize.xs, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--pl-chrome-text-muted)', marginBottom: '6px',
  lineHeight: 1.4,
};

// ── Section heading (bigger than field labels) ────────────────
export const sectionHeading: React.CSSProperties = {
  fontSize: fontSize.xs, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--pl-chrome-text-soft)', marginBottom: spacing.sm,
  lineHeight: 1.3,
};

// ── Shared input style ───────────────────────────────────────
export const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid var(--pl-chrome-border)',
  background: 'var(--pl-chrome-surface)',
  color: 'var(--pl-chrome-text)',
  fontSize: 'max(16px, 0.8rem)',
  outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
  minHeight: '36px',
};

// ── Focus/blur handlers ──────────────────────────────────────
const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--pl-chrome-accent)';
  e.currentTarget.style.boxShadow = 'var(--pl-chrome-focus)';
};
const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--pl-chrome-border)';
  e.currentTarget.style.boxShadow = 'none';
};

// ── Reusable form field — glass input with label ──────────────
export function Field({ label, value, onChange, rows, placeholder, hint, type, maxLength, showCount, onBlur: onBlurProp, error }: {
  label: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string; hint?: string;
  type?: React.HTMLInputTypeAttribute;
  maxLength?: number;
  showCount?: boolean;
  onBlur?: () => void;
  /** Item 90: optional validation error — renders red hint + red border. */
  error?: string | null;
}) {
  const errInpStyle: React.CSSProperties = error
    ? { borderColor: 'var(--pl-chrome-danger)', boxShadow: '0 0 0 3px rgba(139,74,106,0.14)' }
    : {};
  if (rows) return (
    <div>
      <label style={lbl}>{label}</label>
      <textarea
        value={value} onChange={e => onChange(e.target.value)} rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        style={{ ...inp, ...errInpStyle, resize: 'vertical', lineHeight: 1.65 }}
        onFocus={focusStyle}
        onBlur={e => { blurStyle(e); onBlurProp?.(); }}
      />
      {(hint || error || (showCount && maxLength)) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
          {error
            ? <p role="alert" style={{ fontSize: fontSize['2xs'], color: 'var(--pl-chrome-danger)', lineHeight: 1.4, margin: 0 }}>{error}</p>
            : hint ? <p style={{ fontSize: fontSize['2xs'], color: 'var(--pl-chrome-text-muted)', lineHeight: 1.4, margin: 0 }}>{hint}</p> : <span />}
          {showCount && maxLength && (
            <span style={{ fontSize: fontSize['2xs'], color: value.length >= maxLength ? 'var(--pl-chrome-danger)' : 'var(--pl-chrome-text-faint)', lineHeight: 1.4 }}>
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input
        type={type}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        style={{ ...inp, ...errInpStyle }}
        onFocus={focusStyle}
        onBlur={e => { blurStyle(e); onBlurProp?.(); }}
      />
      {(hint || error || (showCount && maxLength)) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
          {error
            ? <p role="alert" style={{ fontSize: fontSize['2xs'], color: 'var(--pl-chrome-danger)', lineHeight: 1.4, margin: 0 }}>{error}</p>
            : hint ? <p style={{ fontSize: fontSize['2xs'], color: 'var(--pl-chrome-text-muted)', lineHeight: 1.4, margin: 0 }}>{hint}</p> : <span />}
          {showCount && maxLength && (
            <span style={{ fontSize: fontSize['2xs'], color: value.length >= maxLength ? 'var(--pl-chrome-danger)' : 'var(--pl-chrome-text-faint)', lineHeight: 1.4 }}>
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Field group — visual card container for related fields ────
export function FieldGroup({ title, children, columns }: {
  title?: string; children: React.ReactNode; columns?: number;
}) {
  return (
    <div style={{
      padding: spacing.md,
      borderRadius: '12px',
      background: 'var(--pl-chrome-surface-2)',
      border: '1px solid var(--pl-chrome-border)',
      display: 'flex', flexDirection: 'column',
      gap: spacing.lg,
    }}>
      {title && <div style={sectionHeading}>{title}</div>}
      {columns ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: spacing.sm }}>
          {children}
        </div>
      ) : children}
    </div>
  );
}

// ── Inline action button — consistent across panels ──────────
export function ActionButton({ label, icon, onClick, variant = 'default', size = 'sm' }: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'accent';
  size?: 'sm' | 'md';
}) {
  const colors = {
    default: { bg: 'var(--pl-chrome-surface)', border: 'var(--pl-chrome-border)', color: 'var(--pl-chrome-text-soft)' },
    danger: { bg: 'rgba(139,74,106,0.10)', border: 'var(--pl-chrome-danger)', color: 'var(--pl-chrome-danger)' },
    accent: { bg: 'var(--pl-chrome-accent-soft)', border: 'var(--pl-chrome-accent)', color: 'var(--pl-chrome-accent)' },
  }[variant];

  const padding = size === 'sm' ? `${spacing.xs} ${spacing.sm}` : `${spacing.sm} ${spacing.md}`;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: spacing.xs,
        padding, borderRadius: '8px', cursor: 'pointer',
        border: `1px solid ${colors.border}`,
        background: colors.bg, color: colors.color,
        fontSize: size === 'sm' ? fontSize.xs : fontSize.sm,
        fontWeight: 600, transition: 'all 0.15s',
        touchAction: 'manipulation',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Pill toggle — for on/off options ─────────────────────────
export function PillToggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: `${spacing.sm} 0`,
    }}>
      <span style={{ fontSize: fontSize.sm, color: 'var(--pl-chrome-text-soft)', fontWeight: 500 }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '36px', height: '20px', borderRadius: '8px',
          background: value ? 'var(--pl-chrome-accent)' : 'var(--pl-chrome-surface-2)',
          border: `1px solid ${value ? 'var(--pl-chrome-accent)' : 'var(--pl-chrome-border)'}`,
          cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
          touchAction: 'manipulation',
        }}
      >
        <span style={{
          position: 'absolute', top: '2px', left: value ? '18px' : '2px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: 'var(--pl-chrome-accent-ink)',
          transition: 'left 0.2s', display: 'block',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        }} />
      </button>
    </div>
  );
}

// ── Empty state — for sections with no content yet ───────────
export function EmptyState({ icon, title, description, action, onAction }: {
  icon?: string; title: string; description?: string;
  action?: string; onAction?: () => void;
}) {
  return (
    <div style={{
      padding: spacing.xl, textAlign: 'center',
      borderRadius: '12px',
      border: '1.5px dashed var(--pl-chrome-border)',
      background: 'var(--pl-chrome-surface-2)',
    }}>
      {icon && <div style={{ fontSize: '1.5rem', marginBottom: spacing.sm, opacity: 0.5 }}>{icon}</div>}
      <div style={{ fontSize: fontSize.sm, fontWeight: 700, color: 'var(--pl-chrome-text-soft)', marginBottom: spacing.xs }}>{title}</div>
      {description && <div style={{ fontSize: fontSize.xs, color: 'var(--pl-chrome-text-muted)', lineHeight: 1.5 }}>{description}</div>}
      {action && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: spacing.md, padding: `${spacing.sm} ${spacing.lg}`,
            borderRadius: '8px', border: '1px solid var(--pl-chrome-accent)',
            background: 'var(--pl-chrome-accent-soft)', color: 'var(--pl-chrome-accent)',
            fontSize: fontSize.xs, fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.06em', touchAction: 'manipulation',
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────
export function slugDate(iso: string) {
  try { return parseLocalDate(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }
  catch { return ''; }
}
