'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/wizard/WizardDatePicker.tsx
//
// Custom calendar picker matching the v8 paper + Fraunces system.
// Replaces <input type="date"> which is ugly on every OS and
// spawns the native picker (which doesn't respect our fonts,
// spacing, or palette). This component:
//
//   - Renders a cream-paper trigger with a Fraunces italic label
//     showing the selected date (or "Select a date")
//   - Opens a month-view calendar panel below, gold hairlines
//     between weeks, editorial header, chevron nav
//   - Emits the ISO yyyy-mm-dd string on select (same shape as
//     the native input) so the wizard doesn't care
//
// No framer-motion dep; uses pearloom/motion Reveal + a tiny
// CSS scale-in keyframe for the panel.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  value: string;                    // ISO yyyy-mm-dd, or ''
  onChange: (iso: string) => void;
  placeholder?: string;
  /** Minimum selectable date (ISO). Defaults to today. Pass '' to allow past dates. */
  minDate?: string;
  /** Optional max (ISO). */
  maxDate?: string;
}

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIso(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function sameYMD(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatLong(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function WizardDatePicker({ value, onChange, placeholder = 'Select a date', minDate, maxDate }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);
  const parsed = parseIso(value);

  // Month the calendar is currently paged to
  const [month, setMonth] = useState<Date>(() => parsed ?? new Date(today.getFullYear(), today.getMonth(), 1));

  // When the external value changes, realign the month view
  useEffect(() => {
    if (parsed) setMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }, [parsed]);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const minBound = useMemo(() => (minDate === undefined ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : parseIso(minDate ?? '')), [minDate, today]);
  const maxBound = useMemo(() => parseIso(maxDate ?? ''), [maxDate]);

  const grid = useMemo(() => {
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = firstOfMonth.getDay(); // 0..6, 0=Sun
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: Array<{ date: Date | null; key: string }> = [];
    for (let i = 0; i < startOffset; i++) cells.push({ date: null, key: `b${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      cells.push({ date, key: date.toISOString() });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, key: `a${cells.length}` });
    return cells;
  }, [month]);

  function pick(d: Date) {
    onChange(iso(d));
    setOpen(false);
  }

  function isDisabled(d: Date): boolean {
    if (minBound && d < minBound) return true;
    if (maxBound && d > maxBound) return true;
    return false;
  }

  const label = parsed ? formatLong(parsed) : placeholder;

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="input"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: '10px 14px',
          fontFamily: parsed ? 'var(--font-display, Fraunces, serif)' : 'var(--font-ui)',
          fontStyle: parsed ? 'italic' : 'normal',
          fontSize: parsed ? 16 : 14,
          color: parsed ? 'var(--ink)' : 'var(--ink-muted)',
        }}
      >
        <span>{label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 30,
            width: 320,
            background: 'var(--cream)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            boxShadow: '0 18px 42px rgba(14,13,11,0.16)',
            padding: 16,
            animation: 'pear-datepicker-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
          }}
        >
          {/* Month header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              aria-label="Previous month"
              style={chevStyle}
            >
              ‹
            </button>
            <div
              className="display"
              style={{
                fontSize: 18,
                fontStyle: 'italic',
                color: 'var(--ink)',
              }}
            >
              {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              aria-label="Next month"
              style={chevStyle}
            >
              ›
            </button>
          </div>

          {/* Gold hairline */}
          <div style={{ height: 1, background: 'var(--line)', opacity: 0.7, margin: '4px 0 10px' }} />

          {/* Weekday header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
            {WEEKDAYS.map((d, i) => (
              <div
                key={i}
                style={{
                  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                  fontSize: 10,
                  textAlign: 'center',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-muted)',
                  fontWeight: 600,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {grid.map(({ date, key }) => {
              if (!date) return <div key={key} />;
              const selected = parsed ? sameYMD(parsed, date) : false;
              const isToday = sameYMD(today, date);
              const disabled = isDisabled(date);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(date)}
                  style={{
                    aspectRatio: '1 / 1',
                    display: 'grid',
                    placeItems: 'center',
                    border: selected ? '1px solid var(--ink)' : isToday ? '1px dashed var(--ink-muted)' : '1px solid transparent',
                    background: selected ? 'var(--ink)' : disabled ? 'transparent' : 'var(--cream-2)',
                    color: selected ? 'var(--cream)' : disabled ? 'var(--ink-muted)' : 'var(--ink)',
                    opacity: disabled ? 0.32 : 1,
                    fontFamily: selected ? 'var(--font-display, Fraunces, serif)' : 'var(--font-ui)',
                    fontStyle: selected ? 'italic' : 'normal',
                    fontSize: selected ? 15 : 13,
                    fontWeight: selected ? 500 : 500,
                    borderRadius: 10,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'background 140ms ease, transform 140ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled && !selected) e.currentTarget.style.background = 'var(--sage-tint, #EDEFE1)';
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled && !selected) e.currentTarget.style.background = 'var(--cream-2)';
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Quick picks + clear */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
            <button
              type="button"
              onClick={() => {
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                pick(today);
              }}
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-ui)',
                color: 'var(--ink)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                letterSpacing: '0.02em',
              }}
            >
              Today
            </button>
            {parsed && (
              <button
                type="button"
                onClick={() => onChange('')}
                style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-ui)',
                  color: 'var(--ink-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                Clear
              </button>
            )}
          </div>

          <style jsx>{`
            @keyframes pear-datepicker-in {
              from { opacity: 0; transform: translateY(-6px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

const chevStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  border: '1px solid var(--line)',
  background: 'var(--cream)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  fontSize: 18,
  color: 'var(--ink)',
  lineHeight: 1,
  transition: 'background 140ms ease',
};
