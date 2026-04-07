'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/editor-utils.tsx
// Shared styles and components for editor panels
// Organic glass design system
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { parseLocalDate } from '@/lib/date';

// ── Shared label style ────────────────────────────────────────
export const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.62rem', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--pl-muted, #7A756E)', marginBottom: '0.4rem',
};

// ── Shared input style — glass with white glow border ─────────
export const inp: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.4)',
  background: 'rgba(255,255,255,0.35)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: 'var(--pl-ink, #1A1A1A)',
  fontSize: 'max(16px, 0.85rem)',
  outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
  boxSizing: 'border-box',
  minHeight: '38px',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
} as React.CSSProperties;

// ── Reusable form field — glass input with label ──────────────
export function Field({ label, value, onChange, rows, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string;
}) {
  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'rgba(163,177,138,0.5)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1), inset 0 1px 0 rgba(255,255,255,0.3)';
    e.currentTarget.style.background = 'rgba(255,255,255,0.5)';
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
    e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.2)';
    e.currentTarget.style.background = 'rgba(255,255,255,0.35)';
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
