'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/PanelField.tsx
// Canonical labeled form field for editor panels. Wraps a text
// input / textarea / arbitrary children with the uppercase eyebrow
// label style used everywhere else in the editor (0.62rem / 700 /
// 0.1em tracking / var(--pl-muted)).
//
// Intentionally thin — we don't own the input element because the
// same wrapper is used for native inputs, selects, and custom
// pickers. Pass your input as `children`.
// ─────────────────────────────────────────────────────────────

import type { ReactNode, CSSProperties, ChangeEvent } from 'react';
import { panelText, panelWeight, panelTracking } from './panel-tokens';

export interface PanelFieldProps {
  /** Uppercase eyebrow label shown above the input. */
  label?: string;
  /** Optional helper text shown below the input. */
  hint?: string;
  /** Optional error text — replaces hint when provided. */
  error?: string;
  /** The input or custom control. */
  children: ReactNode;
  /** Extra inline styles for the wrapper. */
  style?: CSSProperties;
}

export function PanelField({
  label,
  hint,
  error,
  children,
  style,
}: PanelFieldProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        ...style,
      }}
    >
      {label && (
        <label
          style={{
            fontSize: panelText.label,
            fontWeight: panelWeight.bold,
            letterSpacing: panelTracking.wider,
            textTransform: 'uppercase',
            color: 'var(--pl-muted)',
            lineHeight: 1.4,
          }}
        >
          {label}
        </label>
      )}
      {children}
      {(error || hint) && (
        <div
          style={{
            fontSize: panelText.meta,
            lineHeight: 1.5,
            color: error ? '#b91c1c' : 'var(--pl-muted)',
            fontStyle: error ? 'normal' : 'italic',
          }}
        >
          {error || hint}
        </div>
      )}
    </div>
  );
}

// ── Shared input style for panels ────────────────────────────
// The single source of truth for <input>/<textarea> chrome used
// inside a PanelField. Panels should spread `panelInputStyle` onto
// their native inputs to get consistent glass look + focus ring
// (via :focus CSS, see globals.css / editor-utils).
export const panelInputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.6)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(163,177,138,0.25)',
  fontSize: 'max(16px, 0.82rem)', // 16px min keeps iOS from zoom-in
  color: 'var(--pl-ink)',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  boxSizing: 'border-box',
};

/**
 * Opinionated plain text input that matches the panel design
 * language. Use this when you don't need the full `<Input>` from
 * `ui/input.tsx` (which ships its own prefix/suffix/label system).
 */
export function PanelInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'url' | 'number' | 'date' | 'time';
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      disabled={disabled}
      style={panelInputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--pl-olive)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.22)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'rgba(163,177,138,0.25)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}

/** Multi-line variant sharing the same chrome. */
export function PanelTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      style={{ ...panelInputStyle, resize: 'vertical', minHeight: 60 }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--pl-olive)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.22)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'rgba(163,177,138,0.25)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}
