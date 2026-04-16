'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/PanelColorPicker.tsx
// Compact swatch + hex input. Clicking the swatch opens the native
// OS color picker; the hex text input stays editable for keyboard
// driven tweaks (and for pasting palette codes). Matches panel input
// chrome so it slots cleanly into PanelField.
// ─────────────────────────────────────────────────────────────

import type { ChangeEvent, CSSProperties } from 'react';
import { useRef } from 'react';
import { panelInputStyle } from './PanelField';

export interface PanelColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  /** Render an inline preset row below the picker. */
  presets?: string[];
  disabled?: boolean;
  style?: CSSProperties;
}

function normalize(hex: string): string {
  const t = hex.trim();
  if (!t) return '#000000';
  if (t.startsWith('#')) return t.toUpperCase();
  return `#${t}`.toUpperCase();
}

export function PanelColorPicker({
  value,
  onChange,
  presets,
  disabled,
  style,
}: PanelColorPickerProps) {
  const nativeRef = useRef<HTMLInputElement | null>(null);
  const hex = normalize(value || '#000000');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'stretch',
          gap: 8,
          width: '100%',
        }}
      >
        <button
          type="button"
          aria-label="Pick color"
          disabled={disabled}
          onClick={() => nativeRef.current?.click()}
          style={{
            width: 36,
            minHeight: 36,
            borderRadius: 6,
            background: hex,
            border: '1px solid var(--pl-chrome-border)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            flex: '0 0 36px',
          }}
        />
        <input
          ref={nativeRef}
          type="color"
          value={hex}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value.toUpperCase())}
          disabled={disabled}
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            opacity: 0,
            pointerEvents: 'none',
          }}
          aria-hidden
          tabIndex={-1}
        />
        <input
          type="text"
          value={hex}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(normalize(e.target.value))}
          disabled={disabled}
          style={{
            ...panelInputStyle,
            fontFamily: 'var(--font-geist-mono, ui-monospace), Menlo, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--pl-chrome-accent)';
            e.currentTarget.style.boxShadow = 'var(--pl-chrome-focus)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--pl-chrome-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {presets && presets.length > 0 && (
        <div
          role="group"
          aria-label="Color presets"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}
        >
          {presets.map((p) => {
            const pn = normalize(p);
            const active = pn === hex;
            return (
              <button
                key={p}
                type="button"
                aria-label={`Use ${pn}`}
                onClick={() => onChange(pn)}
                disabled={disabled}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: pn,
                  border: active ? '2px solid var(--pl-chrome-accent)' : '1px solid var(--pl-chrome-border)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  padding: 0,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
