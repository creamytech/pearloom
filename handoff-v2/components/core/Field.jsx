import React, { useState } from 'react';

/**
 * Field — a labelled text input. Mono editorial label above a warm
 * paper input with a hairline border that warms to olive on focus.
 * Supports textarea via `multiline`. Plain-word labels (BRAND §7).
 */
export function Field({
  label,
  hint,
  value,
  defaultValue,
  onChange,
  placeholder,
  type = 'text',
  multiline = false,
  rows = 3,
  disabled = false,
  id,
  className,
  style,
}) {
  const [focus, setFocus] = useState(false);
  const controlStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: multiline ? '12px 14px' : '11px 14px',
    background: 'var(--pl-cream-card)',
    border: `1px solid ${focus ? 'var(--pl-olive)' : 'var(--pl-divider)'}`,
    borderRadius: 'var(--pl-radius-md)',
    boxShadow: focus ? 'var(--pl-shadow-focus)' : 'none',
    color: 'var(--pl-ink)',
    fontFamily: 'var(--pl-font-body)',
    fontSize: 'var(--pl-text-base)',
    lineHeight: 1.5,
    outline: 'none',
    resize: multiline ? 'vertical' : undefined,
    transition: 'border-color var(--pl-dur-quick) var(--pl-ease-out), box-shadow var(--pl-dur-base) var(--pl-ease-out)',
    opacity: disabled ? 0.55 : 1,
  };
  const common = {
    id,
    value,
    defaultValue,
    placeholder,
    disabled,
    onChange: onChange ? (e) => onChange(e.target.value, e) : undefined,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: controlStyle,
  };
  return (
    <label className={className} style={{ display: 'flex', flexDirection: 'column', gap: 7, ...style }}>
      {label ? (
        <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 'var(--pl-text-2xs)', fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--pl-muted)' }}>{label}</span>
      ) : null}
      {multiline ? <textarea rows={rows} {...common}></textarea> : <input type={type} {...common}></input>}
      {hint ? <span style={{ fontFamily: 'var(--pl-font-body)', fontSize: 'var(--pl-text-xs)', color: 'var(--pl-muted)' }}>{hint}</span> : null}
    </label>
  );
}
