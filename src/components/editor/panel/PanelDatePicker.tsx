'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/PanelDatePicker.tsx
// Thin wrapper around <input type="date" | "datetime-local" | "time">
// that matches the shared panel input chrome and exposes a single
// `value → ISO string` API. Use inside a PanelField for the eyebrow
// label + hint line.
// ─────────────────────────────────────────────────────────────

import type { ChangeEvent, CSSProperties } from 'react';
import { panelInputStyle } from './PanelField';

export type PanelDateVariant = 'date' | 'time' | 'datetime-local';

export interface PanelDatePickerProps {
  value: string;
  onChange: (v: string) => void;
  /** Input variant — defaults to a pure date picker. */
  variant?: PanelDateVariant;
  min?: string;
  max?: string;
  disabled?: boolean;
  style?: CSSProperties;
}

export function PanelDatePicker({
  value,
  onChange,
  variant = 'date',
  min,
  max,
  disabled,
  style,
}: PanelDatePickerProps) {
  return (
    <input
      type={variant}
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      min={min}
      max={max}
      disabled={disabled}
      style={{
        ...panelInputStyle,
        cursor: disabled ? 'not-allowed' : 'text',
        ...style,
      }}
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
