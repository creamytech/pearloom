'use client';

/* eslint-disable no-restricted-syntax */
/* Form-atom primitives — FDate (calendar picker), FSelect (custom
   dropdown), and polished FField wrappers. Shared across every
   section panel. Pearloom palette throughout. */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../../motifs';

/* ─── Date parsing + formatting ─────────────────────────────── */

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = MONTHS_FULL.map((m) => m.slice(0, 3));
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Pull a Date out of either an ISO string ("2027-04-26"), a US
 *  short ("4/26/2027"), or a long form ("Monday, April 26, 2027").
 *  Returns null when the input can't be parsed unambiguously. */
function parseLooseDate(input: string): Date | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  /* ISO yyyy-mm-dd — most reliable. */
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  /* Anything else — defer to the runtime parser. */
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

/** Format a Date for the inline-text fallback ("Monday, April 26,
 *  2027"). Matches the placeholder text the panel placeholders
 *  use, so the input value reads like prose. */
function formatLongDate(d: Date): string {
  const day = d.getDate();
  const month = MONTHS_FULL[d.getMonth()];
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

/** Round Date to local-time YYYY-MM-DD without tz drift. */
function toIsoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ─── FDate — calendar picker ───────────────────────────────── */

interface FDateProps {
  /** Current value — accepts ISO or any string parseLooseDate
   *  understands. Pass '' for empty. */
  value: string;
  /** Setter — called with the long-format string ("April 26, 2027")
   *  when the host picks a day. Pass `format: 'iso'` to emit
   *  yyyy-mm-dd instead. */
  onChange: (next: string) => void;
  /** Output format. 'long' returns "April 26, 2027" (default —
   *  matches existing free-text placeholders), 'iso' returns
   *  "2027-04-26". */
  format?: 'long' | 'iso';
  /** Placeholder when no date set. */
  placeholder?: string;
  /** Optional min selectable date (inclusive). */
  min?: Date;
  /** Optional max selectable date (inclusive). */
  max?: Date;
}

export function FDate({ value, onChange, format = 'long', placeholder = 'Pick a date', min, max }: FDateProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const parsed = parseLooseDate(value);
  /* The calendar's visible month — initialized to the parsed value
     when present, today otherwise. Reset on open so re-opening
     after a previous month-flip starts fresh on the saved date. */
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const d = parsed ?? new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  /* Close on click-outside + Escape. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* Sync the calendar's visible month to the parsed value when the
     popover opens — so opening with an existing date lands on the
     right month even if the user has navigated elsewhere previously. */
  useEffect(() => {
    if (!open) return;
    const d = parsed ?? new Date();
    setView({ y: d.getFullYear(), m: d.getMonth() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const display = parsed ? formatLongDate(parsed) : '';
  const todayIso = toIsoDay(new Date());
  const selectedIso = parsed ? toIsoDay(parsed) : '';

  function commit(d: Date) {
    onChange(format === 'iso' ? toIsoDay(d) : formatLongDate(d));
    setOpen(false);
  }
  function flipMonth(delta: number) {
    setView(({ y, m }) => {
      const next = new Date(y, m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  }

  /* Build the 42-cell month grid (6 rows × 7 days). Leading cells
     from prev month + trailing cells from next month so the grid
     always reads as a complete rectangle. */
  const firstOfMonth = new Date(view.y, view.m, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: { d: Date; inMonth: boolean }[] = [];
  /* Prev month tail. */
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(view.y, view.m, -(startWeekday - 1 - i));
    cells.push({ d, inMonth: false });
  }
  /* Current month. */
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ d: new Date(view.y, view.m, day), inMonth: true });
  }
  /* Next month head to fill to 42. */
  while (cells.length < 42) {
    const day = cells.length - startWeekday - daysInMonth + 1;
    cells.push({ d: new Date(view.y, view.m + 1, day), inMonth: false });
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Trigger — looks like FInput so the field reads consistent
          with the rest of the panel. The "open" state gets a peach
          ring. */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          width: '100%',
          padding: '10px 12px 10px 32px',
          borderRadius: 10,
          border: open ? '1px solid var(--peach-ink)' : '1px solid var(--line)',
          background: 'var(--cream-2)',
          fontSize: 13,
          color: display ? 'var(--ink)' : 'var(--ink-muted)',
          textAlign: 'left',
          cursor: 'pointer',
          outline: 'none',
          transition: 'border-color 140ms, box-shadow 140ms',
          boxShadow: open ? '0 0 0 3px rgba(198,112,61,0.12)' : 'none',
          position: 'relative',
        }}
      >
        <Icon
          name="calendar"
          size={13}
          color="var(--ink-muted)"
          style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}
        />
        {display || placeholder}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Pick a date"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 50,
            width: 280,
            padding: 12,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            boxShadow: '0 14px 38px rgba(40,28,12,0.16), 0 4px 12px rgba(40,28,12,0.08)',
          }}
        >
          {/* Header — month name + prev/next + clear */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => flipMonth(-1)}
              aria-label="Previous month"
              style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--cream-2)', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >
              <Icon name="arrow-left" size={11} color="var(--ink-soft)" />
            </button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
              {MONTHS_FULL[view.m]} {view.y}
            </div>
            <button
              type="button"
              onClick={() => flipMonth(+1)}
              aria-label="Next month"
              style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--cream-2)', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >
              <Icon name="arrow-right" size={11} color="var(--ink-soft)" />
            </button>
          </div>

          {/* Weekday header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--ink-muted)' }}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map(({ d, inMonth }, i) => {
              const iso = toIsoDay(d);
              const isSelected = iso === selectedIso;
              const isToday = iso === todayIso;
              const isDisabled =
                (min && d < startOfDay(min)) || (max && d > startOfDay(max));
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!!isDisabled}
                  onClick={() => !isDisabled && commit(d)}
                  style={{
                    aspectRatio: '1 / 1',
                    border: 'none',
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: isSelected || isToday ? 700 : 500,
                    background: isSelected
                      ? 'var(--peach-bg)'
                      : isToday
                        ? 'var(--cream-2)'
                        : 'transparent',
                    color: isDisabled
                      ? 'var(--ink-muted)'
                      : isSelected
                        ? 'var(--peach-ink)'
                        : inMonth
                          ? 'var(--ink)'
                          : 'var(--ink-muted)',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.4 : inMonth ? 1 : 0.55,
                    outline: isToday && !isSelected ? '1px solid var(--peach-ink)' : 'none',
                    outlineOffset: -2,
                    transition: 'background 100ms, transform 100ms',
                  }}
                  onMouseEnter={(e) => { if (!isSelected && !isDisabled) e.currentTarget.style.background = 'var(--lavender-bg)'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isToday ? 'var(--cream-2)' : 'transparent'; }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer — Today + Clear */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
            <button
              type="button"
              onClick={() => commit(new Date())}
              style={{ flex: 1, padding: '6px 10px', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)', background: 'var(--cream-2)', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer' }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              disabled={!display}
              style={{ flex: 1, padding: '6px 10px', fontSize: 11.5, fontWeight: 600, color: display ? 'var(--ink-soft)' : 'var(--ink-muted)', background: 'transparent', border: '1px solid var(--line)', borderRadius: 8, cursor: display ? 'pointer' : 'not-allowed' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/* ─── FSelect — custom dropdown popover ─────────────────────── */

interface FSelectOption {
  value: string;
  /** Display label — defaults to value when omitted. */
  label?: string;
  /** Sub-line shown below the label (de-emphasised). */
  hint?: string;
}

interface FSelectProps {
  value: string;
  onChange: (next: string) => void;
  options: FSelectOption[];
  placeholder?: string;
  /** Leading icon name. */
  icon?: string;
}

export function FSelect({ value, onChange, options, placeholder = 'Pick one', icon }: FSelectProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? null;
  const display = selected ? (selected.label ?? selected.value) : '';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%',
          padding: icon ? '10px 32px 10px 32px' : '10px 32px 10px 12px',
          borderRadius: 10,
          border: open ? '1px solid var(--peach-ink)' : '1px solid var(--line)',
          background: 'var(--cream-2)',
          fontSize: 13,
          color: display ? 'var(--ink)' : 'var(--ink-muted)',
          textAlign: 'left',
          cursor: 'pointer',
          outline: 'none',
          transition: 'border-color 140ms, box-shadow 140ms',
          boxShadow: open ? '0 0 0 3px rgba(198,112,61,0.12)' : 'none',
          position: 'relative',
        }}
      >
        {icon && (
          <Icon
            name={icon}
            size={13}
            color="var(--ink-muted)"
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}
          />
        )}
        {display || placeholder}
        <span
          aria-hidden
          style={{
            position: 'absolute', right: 11, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            transition: 'transform 180ms',
            fontSize: 9, color: 'var(--ink-muted)', lineHeight: 1,
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 50,
            padding: 4,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            boxShadow: '0 14px 38px rgba(40,28,12,0.16), 0 4px 12px rgba(40,28,12,0.08)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ink-muted)' }}>
              No options
            </div>
          )}
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: isSelected ? 'var(--peach-bg)' : 'transparent',
                  color: isSelected ? 'var(--peach-ink)' : 'var(--ink)',
                  fontSize: 12.5,
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  transition: 'background 100ms',
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--cream-2)'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <span>{opt.label ?? opt.value}</span>
                {opt.hint && (
                  <span style={{ fontSize: 11, color: isSelected ? 'var(--peach-ink)' : 'var(--ink-muted)', opacity: 0.8 }}>
                    {opt.hint}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── FField — labeled wrapper for any input atom ─────────── */

/** Compact label + control pair used inside dense grids (e.g.
 *  HeroPanel "Date & venue" two-column layout). Less visual weight
 *  than FGroup. */
export function FField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
        {label}
      </div>
      {children}
    </div>
  );
}
