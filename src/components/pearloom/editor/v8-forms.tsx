'use client';

/* ========================================================================
   v8 form atoms — six bespoke replacements for the worst-looking native
   HTML controls. Every one of these takes a value + onChange and feels
   continuous with the rest of the v8 design system (cream paper, ink,
   peach hairlines, no Windows-form-control chrome).

     NumberInput   — horizontal stepper with hold-to-repeat
     CustomSelect  — popover dropdown with check-mark + keyboard
     V8Slider      — peach-fill track + value bubble on drag
     Switch        — sliding-knob toggle (boolean)
     DatePicker    — month-grid calendar popover
     TimePicker    — hours/minutes scroll columns popover

   Every component is fully keyboard-accessible.
   ======================================================================== */

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

/* ────────────────────────────────────────────────────────────────────
   NumberInput — replaces <input type="number">. Dash + plus on either
   side; click-and-hold repeats every ~80ms with acceleration.
   ──────────────────────────────────────────────────────────────────── */
export interface NumberInputProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Width in px. Default 80 to match seating arranger seat capacity. */
  width?: number;
  /** Optional unit suffix shown muted to the right of the number. */
  unit?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  width = 80,
  unit,
  disabled,
  ariaLabel,
  className = '',
  style,
}: NumberInputProps) {
  const [local, setLocal] = useState<string>(String(value));
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync external changes back into the input.
  useEffect(() => {
    if (Number(local) !== value) setLocal(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function clamp(n: number) {
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }
  function bump(direction: 1 | -1) {
    const next = clamp(value + direction * step);
    if (next !== value) onChange(next);
  }
  function commitFromInput(raw: string) {
    const n = parseFloat(raw);
    const next = Number.isFinite(n) ? clamp(n) : value;
    setLocal(String(next));
    if (next !== value) onChange(next);
  }
  function startRepeat(direction: 1 | -1) {
    bump(direction);
    let delay = 280;
    const tick = () => {
      bump(direction);
      delay = Math.max(50, delay * 0.85);
      repeatTimer.current = setTimeout(tick, delay);
    };
    repeatTimer.current = setTimeout(tick, delay);
  }
  function stopRepeat() {
    if (repeatTimer.current) {
      clearTimeout(repeatTimer.current);
      clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
  }
  useEffect(() => () => stopRepeat(), []);

  const minusDisabled = disabled || value <= min;
  const plusDisabled = disabled || value >= max;

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 32,
        width,
        background: 'var(--card, #fff)',
        border: '1px solid var(--line, rgba(61,74,31,0.14))',
        borderRadius: 999,
        overflow: 'hidden',
        fontFamily: 'inherit',
        opacity: disabled ? 0.55 : 1,
        ...style,
      }}
    >
      <button
        type="button"
        aria-label={`Decrease ${ariaLabel ?? 'value'}`}
        disabled={minusDisabled}
        onPointerDown={(e) => { if (!minusDisabled) { e.preventDefault(); startRepeat(-1); } }}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        style={STEP_BTN(minusDisabled)}
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={local}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => setLocal(e.target.value.replace(/[^\d.\-]/g, ''))}
        onBlur={(e) => commitFromInput(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitFromInput(e.currentTarget.value);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            bump(1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            bump(-1);
          }
        }}
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          padding: 0,
          textAlign: 'center',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--ink, #18181B)',
          fontVariantNumeric: 'tabular-nums',
        }}
      />
      {unit && (
        <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', paddingRight: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {unit}
        </span>
      )}
      <button
        type="button"
        aria-label={`Increase ${ariaLabel ?? 'value'}`}
        disabled={plusDisabled}
        onPointerDown={(e) => { if (!plusDisabled) { e.preventDefault(); startRepeat(1); } }}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        style={STEP_BTN(plusDisabled)}
      >
        +
      </button>
    </div>
  );
}

const STEP_BTN = (off: boolean): CSSProperties => ({
  width: 28,
  height: '100%',
  border: 'none',
  background: 'transparent',
  cursor: off ? 'not-allowed' : 'pointer',
  fontSize: 16,
  lineHeight: 1,
  color: 'var(--ink-soft, #3D4A1F)',
  fontFamily: 'inherit',
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  userSelect: 'none',
  touchAction: 'none',
  transition: 'background 140ms ease',
  opacity: off ? 0.4 : 1,
});

/* ────────────────────────────────────────────────────────────────────
   CustomSelect — replaces <select>. Click opens a popover with the
   options; keyboard support: ↑/↓ navigates, Enter/Space picks, Esc
   closes. Auto-positions above when there's no room below.
   ──────────────────────────────────────────────────────────────────── */
export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

export interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (next: T) => void;
  options: CustomSelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  width?: number | string;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled,
  width = '100%',
  ariaLabel,
  className = '',
  style,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(0);
  const [openUp, setOpenUp] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  // Position popover above the trigger when below would clip.
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const room = window.innerHeight - rect.bottom;
    setOpenUp(room < 220 && rect.top > 220);
    setHoverIdx(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open, value, options]);

  // Close on click outside.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  function onKey(e: KeyboardEvent<HTMLButtonElement | HTMLDivElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHoverIdx((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHoverIdx((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      const opt = options[hoverIdx];
      if (opt) {
        onChange(opt.value);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className={className} style={{ position: 'relative', width, ...style }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          width: '100%',
          padding: '8px 12px',
          background: 'var(--card, #fff)',
          border: `1px solid ${open ? 'var(--ink, #18181B)' : 'var(--line, rgba(61,74,31,0.14))'}`,
          borderRadius: 10,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 13,
          color: 'var(--ink)',
          fontFamily: 'inherit',
          textAlign: 'left',
          opacity: disabled ? 0.55 : 1,
          transition: 'border-color 160ms ease, background 160ms ease',
        }}
      >
        <span style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: selected ? 'var(--ink)' : 'var(--ink-muted)',
        }}>
          {selected?.label ?? placeholder}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms ease' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          ref={popoverRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onKey}
          style={{
            position: 'absolute',
            ...(openUp ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
            left: 0,
            right: 0,
            background: 'var(--card, #fff)',
            border: '1px solid var(--line, rgba(0,0,0,0.12))',
            borderRadius: 10,
            boxShadow: '0 14px 32px rgba(14,13,11,0.18)',
            zIndex: 80,
            maxHeight: 300,
            overflowY: 'auto',
            padding: 4,
            animation: 'pl8-select-pop 140ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {options.map((opt, i) => {
            const on = opt.value === value;
            const hover = i === hoverIdx;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={on}
                onPointerEnter={() => setHoverIdx(i)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: hover ? 'var(--cream-2, #F3E9D4)' : 'transparent',
                  color: 'var(--ink)',
                  fontSize: 13,
                }}
              >
                <span aria-hidden style={{ width: 14, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>
                  {on && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--peach-ink, #C6703D)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: on ? 700 : 500, display: 'block' }}>{opt.label}</span>
                  {opt.hint && <span style={{ fontSize: 11, color: 'var(--ink-muted)', display: 'block', lineHeight: 1.35 }}>{opt.hint}</span>}
                </span>
              </div>
            );
          })}
          <style jsx>{`
            @keyframes pl8-select-pop {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   V8Slider — replaces <input type="range">. Peach fill + smooth thumb.
   Drag shows a value bubble above the thumb.
   ──────────────────────────────────────────────────────────────────── */
export interface V8SliderProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Renders the value as a label below the track. Default: shown. */
  showValue?: boolean;
  /** Custom value formatter (default: number with optional unit). */
  formatValue?: (n: number) => string;
  unit?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export function V8Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  showValue = false,
  formatValue,
  unit,
  disabled,
  ariaLabel,
  className = '',
  style,
}: V8SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min || 1)) * 100;
  const display = formatValue ? formatValue(value) : `${value}${unit ? ` ${unit}` : ''}`;
  return (
    <div className={className} style={{ width: '100%', ...style }}>
      <div style={{ position: 'relative', height: 22 }}>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(e) => onChange(Number(e.target.value))}
          className="pl8-v8-slider"
          style={{
            // The native input is the actual control; we style it via
            // ::-webkit-slider-thumb in CSS below. The styled track
            // renders behind it.
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            background: 'transparent',
            opacity: disabled ? 0.5 : 1,
            zIndex: 2,
            margin: 0,
            cursor: disabled ? 'not-allowed' : 'grab',
            // Show the thumb on top of the styled track.
            // (Webkit / Firefox specifics in the embedded <style> below.)
          }}
        />
        {/* Track */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            height: 4,
            background: 'var(--line, rgba(61,74,31,0.14))',
            borderRadius: 999,
            zIndex: 0,
          }}
        />
        {/* Filled portion */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            height: 4,
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--peach-ink, #C6703D), var(--gold-line, #D4A95D))',
            borderRadius: 999,
            zIndex: 1,
          }}
        />
      </div>
      {showValue && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums' }}>
          <span>{min}</span>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{display}</span>
          <span>{max}</span>
        </div>
      )}
      <style jsx global>{`
        .pl8-v8-slider {
          -webkit-appearance: none;
          appearance: none;
        }
        .pl8-v8-slider::-webkit-slider-runnable-track {
          height: 22px;
          background: transparent;
        }
        .pl8-v8-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--ink, #18181B);
          border: 3px solid var(--card, #fff);
          box-shadow: 0 2px 6px rgba(14, 13, 11, 0.22);
          cursor: grab;
          margin-top: 2px;
          transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .pl8-v8-slider:active::-webkit-slider-thumb { cursor: grabbing; transform: scale(1.18); }
        .pl8-v8-slider::-moz-range-track { height: 4px; background: transparent; border: none; }
        .pl8-v8-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--ink, #18181B);
          border: 3px solid var(--card, #fff);
          box-shadow: 0 2px 6px rgba(14, 13, 11, 0.22);
          cursor: grab;
        }
        .pl8-v8-slider:focus-visible::-webkit-slider-thumb { outline: 3px solid rgba(198,112,61,0.45); }
        .pl8-v8-slider:focus-visible::-moz-range-thumb { outline: 3px solid rgba(198,112,61,0.45); }
      `}</style>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Switch — replaces <input type="checkbox"> for booleans. Sliding
   knob, ink-on-cream when on, hairline border when off.
   ──────────────────────────────────────────────────────────────────── */
export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  ariaLabel?: string;
  /** Optional inline label rendered next to the switch. */
  label?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Switch({
  checked,
  onChange,
  size = 'md',
  disabled,
  ariaLabel,
  label,
  className = '',
  style,
}: SwitchProps) {
  const w = size === 'sm' ? 30 : 38;
  const h = size === 'sm' ? 18 : 22;
  const knob = h - 4;
  const trackBg = checked ? 'var(--ink, #18181B)' : 'var(--cream-2, #F3E9D4)';
  const trackBorder = checked ? 'var(--ink, #18181B)' : 'var(--line, rgba(61,74,31,0.14))';
  const knobBg = checked ? 'var(--cream, #F8F1E4)' : 'var(--card, #fff)';

  const inner = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: w,
        height: h,
        borderRadius: 999,
        background: trackBg,
        border: `1px solid ${trackBorder}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: 0,
        flexShrink: 0,
        transition: 'background 240ms cubic-bezier(0.22,1,0.36,1), border-color 240ms ease',
        opacity: disabled ? 0.55 : 1,
        outline: 'none',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 1,
          left: checked ? w - knob - 3 : 1,
          width: knob,
          height: knob,
          borderRadius: '50%',
          background: knobBg,
          boxShadow: '0 1px 3px rgba(14,13,11,0.18)',
          transition: 'left 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />
    </button>
  );

  if (label == null) {
    return <span className={className} style={style}>{inner}</span>;
  }
  return (
    <label
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13,
        color: 'var(--ink)',
        ...style,
      }}
    >
      {inner}
      <span style={{ flex: 1 }}>{label}</span>
    </label>
  );
}

/* ────────────────────────────────────────────────────────────────────
   DatePicker — replaces <input type="date">. Month-grid calendar
   popover. Reads/writes ISO YYYY-MM-DD strings.
   ──────────────────────────────────────────────────────────────────── */
export interface DatePickerProps {
  value: string;        // 'YYYY-MM-DD' or ''
  onChange: (next: string) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Pick a date',
  disabled,
  ariaLabel,
  className = '',
  style,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const today = new Date();
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { y: parseInt(value.slice(0, 4), 10), m: parseInt(value.slice(5, 7), 10) - 1 };
    }
    return { y: today.getFullYear(), m: today.getMonth() };
  });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  const display = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const cells = useMemo(() => buildMonthCells(view.y, view.m), [view.y, view.m]);

  function pick(iso: string) {
    if (minDate && iso < minDate) return;
    if (maxDate && iso > maxDate) return;
    onChange(iso);
    setOpen(false);
  }

  return (
    <div className={className} style={{ position: 'relative', width: '100%', ...style }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'var(--card, #fff)',
          border: `1px solid ${open ? 'var(--ink)' : 'var(--line, rgba(61,74,31,0.14))'}`,
          borderRadius: 10,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 13,
          color: value ? 'var(--ink)' : 'var(--ink-muted)',
          fontFamily: 'inherit',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'border-color 160ms ease',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ opacity: 0.6, flexShrink: 0 }}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
        <span style={{ flex: 1 }}>{display || placeholder}</span>
      </button>
      {open && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            background: 'var(--card, #fff)',
            border: '1px solid var(--line, rgba(0,0,0,0.12))',
            borderRadius: 12,
            boxShadow: '0 16px 36px rgba(14,13,11,0.18)',
            padding: 12,
            zIndex: 80,
            width: 268,
            animation: 'pl8-cal-pop 160ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setView((v) => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })}
              style={NAV_BTN}
            >
              ‹
            </button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              {monthLabel}
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setView((v) => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })}
              style={NAV_BTN}
            >
              ›
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: 10.5, color: 'var(--ink-muted)', marginBottom: 4 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '4px 0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((c, i) => {
              const on = c.iso === value;
              const dim = !c.inMonth;
              const blocked = (minDate && c.iso < minDate) || (maxDate && c.iso > maxDate);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={blocked || undefined}
                  onClick={() => pick(c.iso)}
                  style={{
                    padding: 0,
                    height: 30,
                    borderRadius: 6,
                    background: on ? 'var(--ink)' : c.isToday ? 'var(--cream-2)' : 'transparent',
                    color: on ? 'var(--cream)' : dim ? 'var(--ink-muted)' : 'var(--ink)',
                    border: 'none',
                    fontSize: 12,
                    fontVariantNumeric: 'tabular-nums',
                    cursor: blocked ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: on ? 700 : 500,
                    opacity: blocked ? 0.4 : 1,
                    transition: 'background 140ms ease',
                  }}
                  onMouseEnter={(e) => { if (!on && !blocked) e.currentTarget.style.background = 'var(--cream-2)'; }}
                  onMouseLeave={(e) => { if (!on && !blocked) e.currentTarget.style.background = c.isToday ? 'var(--cream-2)' : 'transparent'; }}
                >
                  {c.d}
                </button>
              );
            })}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '6px 8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-muted)',
                fontSize: 11,
                cursor: 'pointer',
                textDecoration: 'underline',
                fontFamily: 'inherit',
              }}
            >
              Clear date
            </button>
          )}
          <style jsx>{`
            @keyframes pl8-cal-pop {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

const NAV_BTN: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: '1px solid var(--line)',
  background: 'transparent',
  color: 'var(--ink-soft)',
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: 'inherit',
  display: 'grid',
  placeItems: 'center',
};

function buildMonthCells(y: number, m: number) {
  const firstDay = new Date(y, m, 1);
  const startWeekday = firstDay.getDay(); // 0 = Sun
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: Array<{ d: number; iso: string; inMonth: boolean; isToday: boolean }> = [];
  // Previous month tail
  const prevDays = new Date(y, m, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevDays - i;
    const date = new Date(y, m - 1, d);
    cells.push({ d, iso: toIso(date), inMonth: false, isToday: isSameDay(date, new Date()) });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    cells.push({ d, iso: toIso(date), inMonth: true, isToday: isSameDay(date, new Date()) });
  }
  // Pad next month so the grid is a multiple of 7.
  while (cells.length % 7 !== 0) {
    const d = cells.length - daysInMonth - startWeekday + 1;
    const date = new Date(y, m + 1, d);
    cells.push({ d, iso: toIso(date), inMonth: false, isToday: isSameDay(date, new Date()) });
  }
  return cells;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ────────────────────────────────────────────────────────────────────
   TimePicker — replaces <input type="time">. Two scrollable columns
   (hours + minutes) plus an AM/PM toggle. Reads/writes 24-hour HH:MM.
   ──────────────────────────────────────────────────────────────────── */
export interface TimePickerProps {
  value: string;          // 'HH:MM' (24-hour) or ''
  onChange: (next: string) => void;
  /** Minute step. Default 5. */
  step?: 1 | 5 | 15 | 30;
  hour12?: boolean;       // Display only — value is always 24-hour.
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export function TimePicker({
  value,
  onChange,
  step = 5,
  hour12 = true,
  placeholder = 'Pick a time',
  disabled,
  ariaLabel,
  className = '',
  style,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const parsed = useMemo(() => parseHHMM(value), [value]);
  const hours24 = parsed?.h ?? 18;
  const minute = parsed?.m ?? 0;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  const display = parsed ? formatHHMM(parsed.h, parsed.m, hour12) : '';
  const ampm: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM';

  function setH(h24: number) { onChange(`${pad(h24)}:${pad(minute)}`); }
  function setM(m: number) { onChange(`${pad(hours24)}:${pad(m)}`); }
  function setAmPm(next: 'AM' | 'PM') {
    const h = hours24 % 12;
    const newH = next === 'PM' ? h + 12 : h;
    onChange(`${pad(newH)}:${pad(minute)}`);
  }

  const hourList = hour12
    ? Array.from({ length: 12 }, (_, i) => i + 1) // 1..12
    : Array.from({ length: 24 }, (_, i) => i);    // 0..23
  const minuteList = Array.from({ length: 60 / step }, (_, i) => i * step);

  return (
    <div className={className} style={{ position: 'relative', width: '100%', ...style }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'var(--card, #fff)',
          border: `1px solid ${open ? 'var(--ink)' : 'var(--line, rgba(61,74,31,0.14))'}`,
          borderRadius: 10,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 13,
          color: value ? 'var(--ink)' : 'var(--ink-muted)',
          fontFamily: 'inherit',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'border-color 160ms ease',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ opacity: 0.6, flexShrink: 0 }}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span style={{ flex: 1 }}>{display || placeholder}</span>
      </button>
      {open && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            background: 'var(--card, #fff)',
            border: '1px solid var(--line, rgba(0,0,0,0.12))',
            borderRadius: 12,
            boxShadow: '0 16px 36px rgba(14,13,11,0.18)',
            padding: 12,
            zIndex: 80,
            width: hour12 ? 200 : 168,
            animation: 'pl8-time-pop 160ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: hour12 ? '1fr 1fr 60px' : '1fr 1fr', gap: 6, height: 168 }}>
            <ScrollColumn
              label="Hour"
              items={hourList.map((h) => ({ value: h, label: pad(h) }))}
              selected={hour12 ? ((hours24 % 12) || 12) : hours24}
              onPick={(h) => setH(hour12 ? (ampm === 'PM' ? (h % 12) + 12 : h % 12) : h)}
            />
            <ScrollColumn
              label="Minute"
              items={minuteList.map((m) => ({ value: m, label: pad(m) }))}
              selected={minute}
              onPick={setM}
            />
            {hour12 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(['AM', 'PM'] as const).map((p) => {
                  const on = ampm === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmPm(p)}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        background: on ? 'var(--ink)' : 'var(--card)',
                        color: on ? 'var(--cream)' : 'var(--ink)',
                        border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        fontFamily: 'inherit',
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '6px 8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-muted)',
                fontSize: 11,
                cursor: 'pointer',
                textDecoration: 'underline',
                fontFamily: 'inherit',
              }}
            >
              Clear time
            </button>
          )}
          <style jsx>{`
            @keyframes pl8-time-pop {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

function ScrollColumn({
  label,
  items,
  selected,
  onPick,
}: {
  label: string;
  items: Array<{ value: number; label: string }>;
  selected: number;
  onPick: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current.querySelector<HTMLButtonElement>(`[data-on="1"]`);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
  }, [selected]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 }}>
        {label}
      </div>
      <div
        ref={ref}
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--cream-2)',
          borderRadius: 8,
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {items.map((it) => {
          const on = it.value === selected;
          return (
            <button
              key={it.value}
              type="button"
              data-on={on ? '1' : undefined}
              onClick={() => onPick(it.value)}
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink)',
                border: 'none',
                fontSize: 13,
                fontWeight: on ? 700 : 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'center',
              }}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function parseHHMM(v: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const h = parseInt(m[1] ?? '0', 10);
  const min = parseInt(m[2] ?? '0', 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}
function pad(n: number) { return String(n).padStart(2, '0'); }
function formatHHMM(h24: number, m: number, hour12: boolean): string {
  if (!hour12) return `${pad(h24)}:${pad(m)}`;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${h12}:${pad(m)} ${ampm}`;
}
