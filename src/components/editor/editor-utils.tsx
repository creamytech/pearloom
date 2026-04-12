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
export const lbl: React.CSSProperties = {
  display: 'block', fontSize: fontSize.xs, fontWeight: 600,
  letterSpacing: '0.04em', textTransform: 'uppercase',
  color: '#A1A1AA', marginBottom: '4px',
};

// ── Section heading (bigger than field labels) ────────────────
export const sectionHeading: React.CSSProperties = {
  fontSize: fontSize.md, fontWeight: 600,
  letterSpacing: '0.04em', textTransform: 'uppercase',
  color: '#18181B', marginBottom: spacing.sm,
};

// ── Shared input style ───────────────────────────────────────
export const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #E4E4E7',
  background: '#FFFFFF',
  color: '#18181B',
  fontSize: 'max(16px, 0.8rem)',
  outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
  minHeight: '36px',
};

// ── Focus/blur handlers ──────────────────────────────────────
const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#18181B';
  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24,24,27,0.12)';
};
const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#E4E4E7';
  e.currentTarget.style.boxShadow = 'none';
};

// ── Reusable form field — glass input with label ──────────────
export function Field({ label, value, onChange, rows, placeholder, hint, type }: {
  label: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string; hint?: string;
  type?: React.HTMLInputTypeAttribute;
}) {
  if (rows) return (
    <div>
      <label style={lbl}>{label}</label>
      <textarea
        value={value} onChange={e => onChange(e.target.value)} rows={rows}
        placeholder={placeholder}
        style={{ ...inp, resize: 'vertical', lineHeight: 1.65 }}
        onFocus={focusStyle} onBlur={blurStyle}
      />
      {hint && <p style={{ fontSize: fontSize['2xs'], color: '#71717A', marginTop: spacing.xs, lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input
        type={type}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={inp}
        onFocus={focusStyle} onBlur={blurStyle}
      />
      {hint && <p style={{ fontSize: fontSize['2xs'], color: '#71717A', marginTop: spacing.xs, lineHeight: 1.4 }}>{hint}</p>}
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
      background: '#FAFAFA',
      border: '1px solid #E4E4E7',
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
    default: { bg: 'rgba(255,255,255,0.3)', border: 'rgba(255,255,255,0.25)', color: '#3F3F46' },
    danger: { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', color: '#e87a7a' },
    accent: { bg: 'rgba(24,24,27,0.06)', border: '#E4E4E7', color: '#18181B' },
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
      <span style={{ fontSize: fontSize.sm, color: '#3F3F46', fontWeight: 500 }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '36px', height: '20px', borderRadius: '8px',
          background: value ? '#18181B' : 'rgba(255,255,255,0.3)',
          border: value ? '1px solid #A1A1AA' : '1px solid rgba(255,255,255,0.3)',
          cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
          touchAction: 'manipulation',
        }}
      >
        <span style={{
          position: 'absolute', top: '2px', left: value ? '18px' : '2px',
          width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', display: 'block',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
      border: '1.5px dashed #E4E4E7',
      background: '#FAFAFA',
    }}>
      {icon && <div style={{ fontSize: '1.5rem', marginBottom: spacing.sm, opacity: 0.5 }}>{icon}</div>}
      <div style={{ fontSize: fontSize.sm, fontWeight: 700, color: '#3F3F46', marginBottom: spacing.xs }}>{title}</div>
      {description && <div style={{ fontSize: fontSize.xs, color: '#71717A', lineHeight: 1.5 }}>{description}</div>}
      {action && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: spacing.md, padding: `${spacing.sm} ${spacing.lg}`,
            borderRadius: '8px', border: '1px solid #E4E4E7',
            background: 'rgba(24,24,27,0.04)', color: '#18181B',
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
