'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/editor-utils.tsx
// Shared styles, helpers, and small components used across
// the editor panel modules.
// Light cream theme — matches marketing site aesthetic.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { parseLocalDate } from '@/lib/date';

// ── Shared label/input styles ──────────────────────────────────
export const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.68rem', fontWeight: 700,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  color: 'var(--pl-muted, #7A756E)', marginBottom: '0.35rem',
};

export const inp: React.CSSProperties = {
  width: '100%', padding: '0.55rem 0.7rem', borderRadius: '0.5rem',
  border: '1px solid var(--pl-divider, #E0D8CA)', background: '#fff',
  color: 'var(--pl-ink, #1A1A1A)', fontSize: 'max(16px, 0.88rem)', outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
  minHeight: '36px',
};

// ── Reusable form field ────────────────────────────────────────
export function Field({ label, value, onChange, rows, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string;
}) {
  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--pl-olive, #A3B18A)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)';
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--pl-divider, #E0D8CA)';
    e.currentTarget.style.boxShadow = 'none';
  };

  if (rows) return (
    <div>
      <label style={lbl}>{label}</label>
      <textarea
        value={value} onChange={e => onChange(e.target.value)} rows={rows}
        placeholder={placeholder}
        style={{ ...inp, resize: 'vertical', lineHeight: 1.65 }}
        onFocus={focusStyle} onBlur={blurStyle}
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
        onFocus={focusStyle} onBlur={blurStyle}
      />
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────
export function slugDate(iso: string) {
  try { return parseLocalDate(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }
  catch { return ''; }
}
