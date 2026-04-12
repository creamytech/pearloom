'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/PanelField.tsx
// Canonical labeled form field for editor panels. Wraps a text
// input / textarea / arbitrary children with the uppercase eyebrow
// label style used everywhere else in the editor (0.62rem / 700 /
// 0.1em tracking / #71717A).
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
            color: '#71717A',
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
            color: error ? '#b91c1c' : '#71717A',
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
  padding: '8px 10px',
  borderRadius: '6px',
  background: '#FFFFFF',
  border: '1px solid #E4E4E7',
  fontSize: 'max(16px, 0.8rem)', // 16px min keeps iOS from zoom-in
  color: '#18181B',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  boxSizing: 'border-box',
  minHeight: '36px',
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
        e.currentTarget.style.borderColor = '#18181B';
        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24,24,27,0.12)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#E4E4E7';
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
        e.currentTarget.style.borderColor = '#18181B';
        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24,24,27,0.12)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#E4E4E7';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}
