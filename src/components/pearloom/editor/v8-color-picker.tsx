'use client';

// ─────────────────────────────────────────────────────────────
// V8ColorPicker — replaces native <input type="color">. Native
// readers an OS-default Mac/Windows colour wheel that sticks out
// against the cream/peach v8 palette. This swatch popover stays
// inside the editor language: a small chip trigger + a paper-
// surface popover with a 2D saturation/value canvas, hue slider,
// hex input, and a curated swatch row.
//
// API matches the standard React change pattern (`value` + `onChange`
// of a hex string `#RRGGBB`) so swap-in callers don't change.
// ─────────────────────────────────────────────────────────────

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  value: string;
  onChange: (next: string) => void;
  /** Curated swatches that sit below the picker so hosts can
   *  pick from on-brand colours quickly. Optional. */
  swatches?: string[];
  ariaLabel?: string;
  /** Compact mode — 28×28 trigger chip. Default: 36×28. */
  size?: 'sm' | 'md';
  className?: string;
  style?: CSSProperties;
  /** Called with `undefined` to clear / reset. Caller decides
   *  what to do (e.g. revert to a default). When omitted, no
   *  reset button renders. */
  onClear?: () => void;
}

const DEFAULT_SWATCHES = [
  '#0E0D0B', '#3A332C', '#6F6557', '#A89F8E',
  '#F5EFE2', '#FBF7EE', '#E5DCC4', '#C6703D',
  '#B8935A', '#5C6B3F', '#7A2D2D', '#8B6F8E',
  '#C49A6F', '#A14A2C', '#D4A95D', '#A4B57A',
];

export function V8ColorPicker({
  value,
  onChange,
  swatches = DEFAULT_SWATCHES,
  ariaLabel,
  size = 'md',
  className = '',
  style,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; flipped: boolean }>({ top: 0, left: 0, flipped: false });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const POPOVER_W = 248;
  const POPOVER_H = 320;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const flip = r.bottom + POPOVER_H > window.innerHeight - 16;
    setPos({
      top: flip ? r.top - 8 : r.bottom + 8,
      left: Math.max(16, Math.min(r.left, window.innerWidth - POPOVER_W - 16)),
      flipped: flip,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    function onDocClick(e: MouseEvent) {
      if (popoverRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => document.addEventListener('mousedown', onDocClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [open]);

  const w = size === 'sm' ? 28 : 36;
  const h = 28;
  const safeValue = isHex(value) ? value : '#000000';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel ?? 'Open colour picker'}
        className={className}
        style={{
          width: w,
          height: h,
          borderRadius: 6,
          padding: 0,
          border: '1px solid var(--line, rgba(61,74,31,0.14))',
          background: 'var(--card, #fff)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
      >
        {/* Inner swatch — show a mini checkerboard behind in case
            the value is transparent / unreadable. */}
        <span
          aria-hidden
          style={{
            position: 'absolute', inset: 4, borderRadius: 4,
            background: `${safeValue}`,
            boxShadow: 'inset 0 0 0 1px rgba(14,13,11,0.12)',
          }}
        />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <ColorPopover
          ref={popoverRef}
          pos={pos}
          width={POPOVER_W}
          value={safeValue}
          onChange={onChange}
          swatches={swatches}
          onClear={onClear ? () => { onClear(); setOpen(false); } : undefined}
        />,
        document.body,
      )}
    </>
  );
}

function ColorPopover({
  pos,
  width,
  value,
  onChange,
  swatches,
  onClear,
  ref,
}: {
  pos: { top: number; left: number; flipped: boolean };
  width: number;
  value: string;
  onChange: (next: string) => void;
  swatches: string[];
  onClear?: () => void;
  ref: React.RefObject<HTMLDivElement | null>;
}) {
  const hsv = useMemo(() => hexToHsv(value), [value]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [hexDraft, setHexDraft] = useState(value);

  // Keep hexDraft in sync when value changes externally (e.g. swatch click).
  useEffect(() => { setHexDraft(value); }, [value]);

  function commitHex(next: string) {
    const cleaned = next.startsWith('#') ? next : `#${next}`;
    if (isHex(cleaned)) onChange(cleaned.toLowerCase());
  }

  function setHsv(next: { h: number; s: number; v: number }) {
    onChange(hsvToHex(next.h, next.s, next.v));
  }

  function onCanvasMove(clientX: number, clientY: number) {
    if (!canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
    setHsv({ h: hsv.h, s: x, v: 1 - y });
  }

  function onPointerDownCanvas(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onCanvasMove(e.clientX, e.clientY);
  }
  function onPointerMoveCanvas(e: React.PointerEvent<HTMLDivElement>) {
    if (e.buttons !== 1) return;
    onCanvasMove(e.clientX, e.clientY);
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Colour picker"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width,
        zIndex: 9100,
        padding: 12,
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(61,74,31,0.16))',
        borderRadius: 12,
        boxShadow: '0 24px 56px rgba(14,13,11,0.18)',
        transform: pos.flipped ? 'translateY(-100%)' : 'none',
        animation: 'pl8-color-pop 180ms cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      {/* 2D saturation/value plane */}
      <div
        ref={canvasRef}
        role="application"
        tabIndex={0}
        aria-label={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%. Use arrow keys to nudge, Shift + arrow for larger jumps.`}
        onPointerDown={onPointerDownCanvas}
        onPointerMove={onPointerMoveCanvas}
        onKeyDown={(e) => {
          // Keyboard parity for the pointer-only saturation/value
          // plane. Arrows nudge by 0.02 (2% of the plane), Shift +
          // arrow by 0.1 (10%). Brightness goes UP when the visual
          // dot moves UP, hence the inverted sign on ArrowUp/Down.
          const step = e.shiftKey ? 0.1 : 0.02;
          let s = hsv.s;
          let v = hsv.v;
          if (e.key === 'ArrowLeft')       s = Math.max(0, hsv.s - step);
          else if (e.key === 'ArrowRight') s = Math.min(1, hsv.s + step);
          else if (e.key === 'ArrowUp')    v = Math.min(1, hsv.v + step);
          else if (e.key === 'ArrowDown')  v = Math.max(0, hsv.v - step);
          else return;
          e.preventDefault();
          setHsv({ h: hsv.h, s, v });
        }}
        style={{
          position: 'relative',
          height: 140,
          borderRadius: 8,
          overflow: 'hidden',
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
          cursor: 'crosshair',
          touchAction: 'none',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            width: 12, height: 12,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: '2px solid #fff',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Hue slider */}
      <input
        type="range"
        min={0}
        max={360}
        value={Math.round(hsv.h)}
        onChange={(e) => setHsv({ h: Number(e.target.value), s: hsv.s, v: hsv.v })}
        aria-label="Hue"
        style={{
          width: '100%',
          height: 14,
          margin: '10px 0 8px',
          appearance: 'none',
          WebkitAppearance: 'none',
          borderRadius: 7,
          background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
          outline: 'none',
        }}
        className="pl8-hue-slider"
      />

      {/* Hex input + clear */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: swatches.length > 0 ? 10 : 0 }}>
        <span aria-hidden style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 600 }}>#</span>
        <input
          type="text"
          spellCheck={false}
          value={hexDraft.replace('#', '')}
          onChange={(e) => {
            const next = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
            setHexDraft(`#${next}`);
            if (next.length === 6 || next.length === 3) commitHex(`#${next}`);
          }}
          onBlur={() => commitHex(hexDraft)}
          style={{
            flex: 1,
            padding: '6px 8px',
            border: '1px solid var(--line, rgba(61,74,31,0.14))',
            borderRadius: 6,
            background: 'var(--cream, #FBF7EE)',
            fontSize: 12,
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            outline: 'none',
            color: 'var(--ink)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        />
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            title="Clear"
            style={{
              padding: '6px 8px',
              fontSize: 11,
              fontWeight: 700,
              border: '1px solid var(--line, rgba(61,74,31,0.14))',
              background: 'transparent',
              borderRadius: 6,
              cursor: 'pointer',
              color: 'var(--ink-soft)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {swatches.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
          {swatches.map((s) => {
            const active = s.toLowerCase() === value.toLowerCase();
            return (
              <button
                key={s}
                type="button"
                onClick={() => onChange(s)}
                title={s}
                aria-label={`Use ${s}`}
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: 4,
                  border: active ? '1.5px solid var(--ink)' : '1px solid var(--line, rgba(61,74,31,0.14))',
                  background: s,
                  padding: 0,
                  cursor: 'pointer',
                }}
              />
            );
          })}
        </div>
      )}

      <style jsx global>{`
        @keyframes pl8-color-pop {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pl8-hue-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #0E0D0B;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          cursor: ew-resize;
        }
        .pl8-hue-slider::-moz-range-thumb {
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #0E0D0B;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          cursor: ew-resize;
        }
      `}</style>
    </div>
  );
}

// ── Color math ─────────────────────────────────────────────
function isHex(s: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s.trim());
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let H = 0;
  if (d !== 0) {
    if (max === r) H = ((g - b) / d) % 6;
    else if (max === g) H = (b - r) / d + 2;
    else H = (r - g) / d + 4;
    H *= 60;
    if (H < 0) H += 360;
  }
  const S = max === 0 ? 0 : d / max;
  const V = max;
  return { h: H, s: S, v: V };
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60)        { r = c; g = x; b = 0; }
  else if (h < 120)  { r = x; g = c; b = 0; }
  else if (h < 180)  { r = 0; g = c; b = x; }
  else if (h < 240)  { r = 0; g = x; b = c; }
  else if (h < 300)  { r = x; g = 0; b = c; }
  else               { r = c; g = 0; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}
