'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/wizard/WizardTimePicker.tsx
//
// Custom time picker matching WizardDatePicker's paper + Fraunces
// system. Replaces the native <select> the schedule pills briefly
// wore — native pickers don't respect our fonts, palette, or
// spacing, and "we went full custom UI" is the rule.
//
//   - Trigger renders as the inline time text (the caller styles
//     the pill; this component is the time region + its popover)
//   - Opens a grouped column — Morning / Afternoon / Evening —
//     gold hairlines between groups, selected row in olive,
//     auto-scrolled into view
//   - Emits the same "7:00 pm" wall-time strings the schedule
//     already stores
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';

export const WALL_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 6; h < 24; h++) {
    for (const mm of ['00', '30'] as const) {
      const ampm = h < 12 ? 'am' : 'pm';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      out.push(`${h12}:${mm} ${ampm}`);
    }
  }
  return out;
})();

const GROUPS: Array<{ label: string; test: (t: string) => boolean }> = [
  { label: 'Morning', test: (t) => t.endsWith('am') },
  { label: 'Afternoon', test: (t) => t.endsWith('pm') && ['12:', '1:', '2:', '3:', '4:'].some((h) => t.startsWith(h)) },
  { label: 'Evening', test: (t) => t.endsWith('pm') && !['12:', '1:', '2:', '3:', '4:'].some((h) => t.startsWith(h)) },
];

export function WizardTimePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (t: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* Land the open panel with the current time centered. */
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      selectedRef.current?.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const groups = useMemo(
    () => GROUPS.map((g) => ({ label: g.label, times: WALL_TIMES.filter(g.test) })),
    [],
  );

  return (
    <span ref={rootRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'stretch' }}>
      <button
        type="button"
        aria-label={`Time for ${label} — ${value}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          border: 'none',
          borderLeft: '1px solid color-mix(in srgb, var(--cream, #F5EFE2) 35%, transparent)',
          background: 'transparent',
          color: 'inherit',
          fontSize: 12.5,
          fontWeight: 700,
          fontFamily: 'inherit',
          padding: '0 12px 0 10px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {value}
        <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden style={{ opacity: 0.7 }}>
          <path d="M2 3.5 L5 6.5 L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={`Time for ${label}`}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 40,
            width: 168,
            maxHeight: 264,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            background: 'var(--cream)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            boxShadow: '0 18px 42px rgba(14,13,11,0.16)',
            padding: '8px 6px',
            animation: 'pear-datepicker-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
          }}
        >
          {groups.map((g, gi) => (
            <div key={g.label}>
              <div
                style={{
                  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                  fontSize: 9,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-muted)',
                  padding: '6px 10px 4px',
                  borderTop: gi > 0 ? '1px solid var(--line-soft)' : 'none',
                  marginTop: gi > 0 ? 4 : 0,
                }}
              >
                {g.label}
              </div>
              {g.times.map((t) => {
                const on = t === value;
                return (
                  <button
                    key={t}
                    ref={on ? selectedRef : undefined}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => { onChange(t); setOpen(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 13,
                      fontWeight: on ? 700 : 500,
                      background: on ? 'var(--pl-olive, #5C6B3F)' : 'transparent',
                      color: on ? 'var(--cream, #F5EFE2)' : 'var(--ink)',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          ))}
          {/* Reuses WizardDatePicker's keyframe name when both mount
              on the same step; declared here too so the popover never
              depends on the calendar being present. */}
          <style jsx global>{`
            @keyframes pear-datepicker-in {
              from { opacity: 0; transform: translateY(-4px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </span>
  );
}
