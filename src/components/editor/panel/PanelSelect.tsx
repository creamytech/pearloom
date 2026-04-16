'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/PanelSelect.tsx
// Canonical <select> dropdown for editor panels. Matches the same
// input chrome as PanelInput / PanelTextarea so the whole form
// feels like one system.
// ─────────────────────────────────────────────────────────────

import type { ChangeEvent, CSSProperties } from 'react';
import { panelInputStyle } from './PanelField';

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
        ...panelInputStyle,
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        paddingRight: 30,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' stroke='%2371717A' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
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
