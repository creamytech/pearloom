'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/PanelSelect.tsx
// Canonical <select> dropdown for editor panels. Since selects
// need click affordance (unlike an underlined PanelInput), they
// keep a subtle bordered surface matching PanelTextarea so the
// form language still reads as one editorial system.
// ─────────────────────────────────────────────────────────────

import type { ChangeEvent, CSSProperties } from 'react';
import { panelFont } from './panel-tokens';

export interface PanelSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface PanelSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: PanelSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  style?: CSSProperties;
}

const panelSelectStyle: CSSProperties = {
  width: '100%',
  padding: '8px 34px 8px 12px',
  borderRadius: '8px',
  background:
    'color-mix(in srgb, var(--pl-chrome-accent) 3%, var(--pl-chrome-bg))',
  border: '1px solid var(--pl-chrome-border)',
  fontFamily: panelFont.body,
  fontSize: 'max(16px, 0.82rem)',
  color: 'var(--pl-chrome-text)',
  outline: 'none',
  transition:
    'border-color 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease',
  boxSizing: 'border-box',
  minHeight: '36px',
};

export function PanelSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  style,
}: PanelSelectProps) {
  return (
    <select
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        ...panelSelectStyle,
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' stroke='%235C6B3F' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--pl-chrome-accent)';
        e.currentTarget.style.boxShadow = 'var(--pl-chrome-focus)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--pl-chrome-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
