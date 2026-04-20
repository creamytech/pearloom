'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/PanelField.tsx
// Canonical labeled form field for editor panels.
//
// Editorial chrome (v2): Labels are mono uppercase eyebrows
// (0.58rem / 700 / 0.22em tracking / text-faint). Inputs use a
// notebook-margin underline style — no boxed surface, just a
// 1px bottom rule that promotes to olive on focus. Textareas keep
// a subtle bordered surface because usability beats austerity for
// multi-line copy.
// ─────────────────────────────────────────────────────────────

import type { ReactNode, CSSProperties, ChangeEvent, KeyboardEvent } from 'react';
import {
  panelFont,
  panelText,
  panelWeight,
  panelTracking,
} from './panel-tokens';

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
            fontFamily: panelFont.mono,
            fontSize: panelText.label,
            fontWeight: panelWeight.bold,
            letterSpacing: panelTracking.widest,
            textTransform: 'uppercase',
            color: 'var(--pl-chrome-text-faint)',
            lineHeight: 1.2,
          }}
        >
          {label}
        </label>
      )}
      {children}
      {(error || hint) && (
        <div
          style={{
            fontFamily: panelFont.body,
            fontSize: panelText.meta,
            lineHeight: 1.5,
            color: error ? 'var(--pl-chrome-danger)' : 'var(--pl-chrome-text-muted)',
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
// Editorial "notebook margin" line — no boxed surface, just a thin
// rule beneath the text that responds to focus with an olive
// treatment. The input sits on the section's cream paper so the
// typography can breathe.
export const panelInputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 2px 7px',
  borderRadius: '0',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid var(--pl-chrome-border)',
  fontFamily: panelFont.body,
  fontSize: 'max(16px, 0.82rem)',
  color: 'var(--pl-chrome-text)',
  outline: 'none',
  transition:
    'border-color 0.18s cubic-bezier(0.22, 1, 0.36, 1), color 0.18s ease',
  boxSizing: 'border-box',
  minHeight: '34px',
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
  onKeyDown,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'url' | 'number' | 'date' | 'time';
  disabled?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
      placeholder={placeholder}
      type={type}
      disabled={disabled}
      style={panelInputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderBottomColor = 'var(--pl-chrome-accent)';
        e.currentTarget.style.borderBottomWidth = '1.5px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderBottomColor = 'var(--pl-chrome-border)';
        e.currentTarget.style.borderBottomWidth = '1px';
      }}
    />
  );
}

// ── Textarea — soft boxed surface ────────────────────────────
// Multi-line input keeps a subtle bordered card (not a line) so
// the writing area stays contained and usable.
const panelTextareaStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--pl-radius-md)',
  background: 'color-mix(in srgb, var(--pl-chrome-accent) 3%, var(--pl-chrome-bg))',
  border: '1px solid var(--pl-chrome-border)',
  fontFamily: panelFont.body,
  fontSize: 'max(16px, 0.82rem)',
  lineHeight: 1.55,
  color: 'var(--pl-chrome-text)',
  outline: 'none',
  transition:
    'border-color 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease',
  boxSizing: 'border-box',
  resize: 'vertical',
  minHeight: 68,
};

/** Multi-line variant with its own chrome. */
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
      style={panelTextareaStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--pl-chrome-accent)';
        e.currentTarget.style.boxShadow = 'var(--pl-chrome-focus)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--pl-chrome-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}
