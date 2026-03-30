'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/editor-utils.tsx
// Shared styles, helpers, and small components used across
// the editor panel modules.
// ─────────────────────────────────────────────────────────────

import React from 'react';

// ── Shared label/input styles ──────────────────────────────────
export const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.82rem', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--eg-muted, #9A9488)', marginBottom: '0.5rem',
};

export const inp: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.8rem', borderRadius: '0.5rem',
  border: '1px solid var(--eg-divider, #E6DFD2)', background: 'rgba(255,255,255,0.8)',
  color: 'var(--eg-fg, #2B2B2B)', fontSize: 'max(16px, 0.88rem)', outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
  minHeight: '38px',
};

// ── Reusable form field ────────────────────────────────────────
export function Field({ label, value, onChange, rows, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string;
}) {
  if (rows) return (
    <div>
      <label style={lbl}>{label}</label>
      <textarea
        value={value} onChange={e => onChange(e.target.value)} rows={rows}
        placeholder={placeholder}
        style={{ ...inp, resize: 'vertical', lineHeight: 1.65 }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={inp}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────
export function slugDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }
  catch { return ''; }
}
