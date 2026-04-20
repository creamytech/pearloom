'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/editor-utils.tsx
// Shared styles and components for editor panels
// Organic glass design system with consistent spacing
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { parseLocalDate } from '@/lib/date';
import { VoiceDictateButton } from './VoiceDictateButton';

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
// Editorial eyebrow — mono, uppercase, tracked to 0.22em. Reads as
// the masthead/dossier kicker that labels each field.
export const lbl: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
  fontSize: fontSize.xs,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--pl-chrome-text-faint)',
  marginBottom: '8px',
  lineHeight: 1.2,
};

// ── Section heading (bigger than field labels) ────────────────
export const sectionHeading: React.CSSProperties = {
  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
  fontSize: fontSize.xs,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--pl-chrome-text-soft)',
  marginBottom: spacing.sm,
  lineHeight: 1.3,
};

// ── Shared input style ───────────────────────────────────────
// Editorial ledger line — thin bottom rule on a near-transparent
// surface that promotes to a heavier gold hairline on focus. Keeps
// input chrome whisper-thin so the typed value dominates.
export const inp: React.CSSProperties = {
  width: '100%',
  padding: '9px 4px 8px',
  borderRadius: '2px',
  border: '1px solid transparent',
  borderBottom: '1px solid var(--pl-chrome-border)',
  background: 'color-mix(in srgb, var(--pl-chrome-accent) 3%, transparent)',
  color: 'var(--pl-chrome-text)',
  fontSize: 'max(16px, 0.82rem)',
  fontFamily: 'var(--pl-font-body, system-ui, sans-serif)',
  outline: 'none',
  transition:
    'border-color 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease, background 0.18s ease',
  boxSizing: 'border-box',
  minHeight: '36px',
};

// ── Focus/blur handlers ──────────────────────────────────────
// On focus the bottom rule thickens to a gold hairline, and a
// subtle gold wash lifts the paper. Top/side borders stay invisible
// so the input reads as a notebook-margin line.
const focusStyle = (
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
) => {
  e.currentTarget.style.borderBottomColor = 'var(--pl-chrome-accent)';
  e.currentTarget.style.borderBottomWidth = '1.5px';
  e.currentTarget.style.background =
    'color-mix(in srgb, var(--pl-chrome-accent) 6%, transparent)';
};
const blurStyle = (
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
) => {
  e.currentTarget.style.borderBottomColor = 'var(--pl-chrome-border)';
  e.currentTarget.style.borderBottomWidth = '1px';
  e.currentTarget.style.background =
    'color-mix(in srgb, var(--pl-chrome-accent) 3%, transparent)';
};

// ── Reusable form field — glass input with label ──────────────
export function Field({ label, value, onChange, rows, placeholder, hint, type, maxLength, showCount, onBlur: onBlurProp, error, required }: {
  label: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string; hint?: string;
  type?: React.HTMLInputTypeAttribute;
  maxLength?: number;
  showCount?: boolean;
  onBlur?: () => void;
  /** Item 90: optional validation error — renders red hint + red border. */
  error?: string | null;
  /** Audit finding #62 — surface required fields with a gold asterisk. */
  required?: boolean;
}) {
  // Render the label once with optional required marker so callers don't
  // have to interpolate JSX into the plain-string label prop.
  const labelNode = required ? (
    <label style={lbl}>
      {label}
      <span aria-hidden style={{ marginLeft: 4, color: 'var(--pl-gold, #B8935A)' }}>*</span>
      <span className="sr-only"> (required)</span>
    </label>
  ) : (
    <label style={lbl}>{label}</label>
  );
  const errInpStyle: React.CSSProperties = error
    ? { borderColor: 'var(--pl-chrome-danger)', boxShadow: '0 0 0 3px rgba(139,74,106,0.14)' }
    : {};
  // Textarea keeps a bordered card so multi-line writing stays contained
  const textareaStyle: React.CSSProperties = {
    ...inp,
    ...errInpStyle,
    padding: '10px 12px',
    border: '1px solid var(--pl-chrome-border)',
    borderRadius: '4px',
    background: 'color-mix(in srgb, var(--pl-chrome-accent) 3%, var(--pl-chrome-bg))',
    resize: 'vertical',
    lineHeight: 1.65,
  };
  const textareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--pl-chrome-accent)';
    e.currentTarget.style.borderBottomWidth = '1px';
    e.currentTarget.style.boxShadow = 'inset 0 -2px 0 rgba(184,147,90,0.35)';
  };
  const textareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--pl-chrome-border)';
    e.currentTarget.style.boxShadow = 'none';
  };
  if (rows) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {labelNode}
        <VoiceDictateButton value={value} onChange={onChange} size="sm" />
      </div>
      <textarea
        value={value} onChange={e => onChange(e.target.value)} rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        style={textareaStyle}
        onFocus={textareaFocus}
        onBlur={e => { textareaBlur(e); onBlurProp?.(); }}
      />
      {(hint || error || (showCount && maxLength)) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
          {error
            ? <p role="alert" style={{ fontSize: fontSize['2xs'], color: 'var(--pl-chrome-danger)', lineHeight: 1.4, margin: 0 }}>{error}</p>
            : hint ? <p style={{ fontSize: fontSize['2xs'], color: 'var(--pl-chrome-text-muted)', lineHeight: 1.4, margin: 0, fontStyle: 'italic' }}>{hint}</p> : <span />}
          {showCount && maxLength && (
            <span style={{ fontFamily: 'var(--pl-font-mono, monospace)', fontSize: fontSize['2xs'], letterSpacing: '0.14em', color: value.length >= maxLength ? 'var(--pl-chrome-danger)' : 'var(--pl-chrome-text-faint)', lineHeight: 1.4 }}>
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
  // Voice dictation only makes sense for free-form text — skip for
  // semantic types (number, date, time, email, etc.).
  const supportsVoice = !type || type === 'text' || type === 'search' || type === 'url';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {labelNode}
        {supportsVoice && (
          <VoiceDictateButton value={value} onChange={onChange} size="sm" />
        )}
      </div>
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
            : hint ? <p style={{ fontSize: fontSize['2xs'], color: 'var(--pl-chrome-text-muted)', lineHeight: 1.4, margin: 0, fontStyle: 'italic' }}>{hint}</p> : <span />}
          {showCount && maxLength && (
            <span style={{ fontFamily: 'var(--pl-font-mono, monospace)', fontSize: fontSize['2xs'], letterSpacing: '0.14em', color: value.length >= maxLength ? 'var(--pl-chrome-danger)' : 'var(--pl-chrome-text-faint)', lineHeight: 1.4 }}>
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Field group — editorial specimen for related fields ───────
// Gold hairline top rule + mono eyebrow + breathable interior, so
// stacked fields read as a bound folio rather than a boxed form.
export function FieldGroup({ title, children, columns }: {
  title?: string; children: React.ReactNode; columns?: number;
}) {
  return (
    <div style={{
      position: 'relative',
      padding: `${spacing.md} ${spacing.md} ${spacing.md}`,
      borderRadius: '2px',
      background: 'var(--pl-chrome-surface-2)',
      border: '1px solid var(--pl-chrome-border)',
      borderTop: '2px solid color-mix(in srgb, var(--pl-chrome-accent) 55%, transparent)',
      display: 'flex', flexDirection: 'column',
      gap: spacing.lg,
    }}>
      {title && <div style={sectionHeading}>{title}</div>}
      {columns ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: spacing.md }}>
          {children}
        </div>
      ) : children}
    </div>
  );
}

// ── Inline action button — editorial mono-caps ───────────────
// Mono uppercase label, tight rectangular shape (2px radius), gold
// halo around accent/default variants on hover. Reads like a
// press-proof stamp next to the fields it governs.
export function ActionButton({ label, icon, onClick, variant = 'default', size = 'sm' }: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'accent';
  size?: 'sm' | 'md';
}) {
  const colors = {
    default: { bg: 'transparent', border: 'var(--pl-chrome-border)', color: 'var(--pl-chrome-text-soft)' },
    danger: { bg: 'rgba(139,74,106,0.08)', border: 'var(--pl-chrome-danger)', color: 'var(--pl-chrome-danger)' },
    accent: { bg: 'var(--pl-chrome-accent-soft)', border: 'var(--pl-chrome-accent)', color: 'var(--pl-chrome-accent)' },
  }[variant];

  const padding = size === 'sm' ? `5px 11px` : `8px 14px`;

  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => {
        if (variant === 'accent') {
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 0 0 3px rgba(184,147,90,0.18)';
        } else if (variant === 'default') {
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            'var(--pl-chrome-accent)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        if (variant === 'default') {
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            'var(--pl-chrome-border)';
        }
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: spacing.xs,
        padding, borderRadius: '2px', cursor: 'pointer',
        border: `1px solid ${colors.border}`,
        background: colors.bg, color: colors.color,
        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
        fontSize: size === 'sm' ? '0.54rem' : '0.62rem',
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        transition: 'all var(--pl-dur-fast) var(--pl-ease-out)',
        touchAction: 'manipulation',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Pill toggle — for on/off options ─────────────────────────
// Label in Fraunces italic, state stamped in mono (ON/OFF), switch
// rendered as a rectangular ledger toggle with a gold puck.
export function PillToggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: `${spacing.sm} 0`,
      gap: spacing.md,
    }}>
      <span style={{
        fontFamily: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
        fontStyle: 'italic',
        fontSize: '0.92rem',
        letterSpacing: '-0.005em',
        color: 'var(--pl-chrome-text)',
        fontWeight: 400,
      }}>{label}</span>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.sm }}>
        <span style={{
          fontFamily: 'var(--pl-font-mono, monospace)',
          fontSize: '0.46rem',
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: value ? 'var(--pl-chrome-accent)' : 'var(--pl-chrome-text-faint)',
          transition: 'color 0.18s ease',
        }}>{value ? 'On' : 'Off'}</span>
        <button
          onClick={() => onChange(!value)}
          aria-pressed={value}
          style={{
            width: '40px', height: '18px', borderRadius: '2px',
            background: value
              ? 'color-mix(in srgb, var(--pl-chrome-accent) 22%, transparent)'
              : 'var(--pl-chrome-surface-2)',
            border: `1px solid ${value ? 'var(--pl-chrome-accent)' : 'var(--pl-chrome-border)'}`,
            cursor: 'pointer', position: 'relative',
            transition: 'all var(--pl-dur-fast) var(--pl-ease-out)',
            touchAction: 'manipulation',
            padding: 0,
          }}
        >
          <span style={{
            position: 'absolute', top: '2px', left: value ? '22px' : '2px',
            width: '12px', height: '12px', borderRadius: '1px',
            background: value ? 'var(--pl-chrome-accent)' : 'var(--pl-chrome-text-faint)',
            transition: 'left 0.22s cubic-bezier(0.22, 1, 0.36, 1), background 0.22s ease',
            display: 'block',
            boxShadow: value ? '0 0 0 2px rgba(184,147,90,0.22)' : 'none',
          }} />
        </button>
      </div>
    </div>
  );
}

// ── Empty state — dashed-gold editorial specimen ─────────────
// Tiny "Blank" folio kicker + Fraunces italic title + optional
// mono-cap action stamped with a gold halo.
export function EmptyState({ icon, title, description, action, onAction }: {
  icon?: string; title: string; description?: string;
  action?: string; onAction?: () => void;
}) {
  return (
    <div style={{
      position: 'relative',
      padding: `${spacing.xl} ${spacing.lg}`, textAlign: 'center',
      borderRadius: '2px',
      border: '1px dashed color-mix(in srgb, var(--pl-chrome-accent) 45%, transparent)',
      background: 'color-mix(in srgb, var(--pl-chrome-accent) 3%, transparent)',
    }}>
      <div style={{
        fontFamily: 'var(--pl-font-mono, monospace)',
        fontSize: '0.46rem',
        fontWeight: 700,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        color: 'var(--pl-chrome-accent)',
        marginBottom: spacing.sm,
      }}>Blank folio</div>
      {icon && <div style={{ fontSize: '1.4rem', marginBottom: spacing.xs, opacity: 0.6 }}>{icon}</div>}
      <div style={{
        fontFamily: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
        fontStyle: 'italic',
        fontSize: '1.05rem',
        fontWeight: 400,
        color: 'var(--pl-chrome-text)',
        letterSpacing: '-0.01em',
        lineHeight: 1.15,
        marginBottom: description ? spacing.xs : 0,
      }}>{title}</div>
      {description && <div style={{
        fontSize: fontSize.xs,
        color: 'var(--pl-chrome-text-muted)',
        lineHeight: 1.55,
        maxWidth: '32ch',
        margin: '0 auto',
      }}>{description}</div>}
      {action && onAction && (
        <button
          onClick={onAction}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 0 0 3px rgba(184,147,90,0.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
          style={{
            marginTop: spacing.md,
            padding: `7px 14px`,
            borderRadius: '2px',
            border: '1px solid var(--pl-chrome-accent)',
            background: 'var(--pl-chrome-accent-soft)',
            color: 'var(--pl-chrome-accent)',
            fontFamily: 'var(--pl-font-mono, monospace)',
            fontSize: '0.54rem', fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            transition: 'all var(--pl-dur-fast) var(--pl-ease-out)',
            touchAction: 'manipulation',
          }}
        >
          {action} →
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
