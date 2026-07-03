'use client';

/* ─────────────────────────────────────────────────────────────
   PlColorPicker — the custom color well.

   Replaces every <input type="color"> in host-facing chrome
   ("we never want native, we went full custom UI"): the OS
   color dialog ignores our type, palette, and spacing entirely.

   A swatch button opens a glass popover with:
     · a saturation/brightness field (drag anywhere)
     · a hue strip
     · a hex field for exact values
   onChange fires live during drags so the canvas re-presses in
   real time (autosave is already debounced upstream).

   Portals to <body> (ancestor overflow can't clip it), measures
   from the trigger rect, flips above when the viewport runs out
   below — same pattern as WizardTimePicker.
   ───────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';

/* ── color math (HSV ↔ hex) ── */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}
function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rn = 0, gn = 0, bn = 0;
  if (h < 60)       { rn = c; gn = x; }
  else if (h < 120) { rn = x; gn = c; }
  else if (h < 180) { gn = c; bn = x; }
  else if (h < 240) { gn = x; bn = c; }
  else if (h < 300) { rn = x; bn = c; }
  else              { rn = c; bn = x; }
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${to(rn)}${to(gn)}${to(bn)}`.toUpperCase();
}

const PANEL_W = 216;
const PANEL_H = 252; // estimate for flip math
const MARGIN = 8;

interface Pos { top: number; left: number }

export function PlColorPicker({
  value,
  onChange,
  onPreview,
  label,
  swatchStyle,
}: {
  /** Current color (#rrggbb). Non-hex values render as grey. */
  value: string;
  onChange: (hex: string) => void;
  /** When provided, drags + hex typing fire THIS live instead of
   *  onChange, and onChange fires once on release / Done / close —
   *  so a drag is one manifest write (one undo entry, one autosave
   *  arm, one canvas re-render), not one per pointer move. Callers
   *  typically paint the preview imperatively (useCanvasTryOn).
   *  Without it, behavior is unchanged: onChange fires live. */
  onPreview?: (hex: string) => void;
  label: string;
  /** Styles the trigger swatch (the caller owns its footprint). */
  swatchStyle?: CSSProperties;
}) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [hsv, setHsv] = useState<[number, number, number]>([30, 0.5, 0.8]);
  const [hexDraft, setHexDraft] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  const measure = useCallback((): Pos | null => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return null;
    const left = Math.max(MARGIN, Math.min(r.left, window.innerWidth - PANEL_W - MARGIN));
    const below = r.bottom + MARGIN;
    const top = below + PANEL_H > window.innerHeight - MARGIN
      ? Math.max(MARGIN, r.top - MARGIN - PANEL_H)
      : below;
    return { top, left };
  }, []);

  /* Drag closures read the LATEST hsv through a ref — state alone
     would freeze the other two channels at drag start. */
  const hsvRef = useRef(hsv);
  useEffect(() => { hsvRef.current = hsv; }, [hsv]);

  /* Preview-mode bookkeeping — while onPreview is wired, live()
     paints without committing; commitPending() writes onChange
     once at rest points (pointer up, hex Enter/blur, Done, close).
     `uncommitted` guards against duplicate commits of the same
     value (pointer up already committed → closing is a no-op). */
  const uncommitted = useRef(false);
  const live = useCallback((hex: string) => {
    if (onPreview) {
      uncommitted.current = true;
      onPreview(hex);
    } else {
      onChange(hex);
    }
  }, [onPreview, onChange]);
  const commitPending = useCallback((hex: string) => {
    if (!onPreview || !uncommitted.current) return;
    uncommitted.current = false;
    onChange(hex);
  }, [onPreview, onChange]);

  const openPanel = () => {
    const rgb = hexToRgb(value);
    const next: [number, number, number] = rgb ? rgbToHsv(...rgb) : [30, 0.5, 0.8];
    uncommitted.current = false;
    setHsv(next);
    setHexDraft(rgb ? hsvToHex(...next) : '#888888');
    setPos(measure());
  };
  /* Close from anywhere (outside click, Escape, Done) — flush any
     uncommitted preview so the canvas + manifest can't diverge. */
  const closePanel = useCallback(() => {
    commitPending(hsvToHex(...hsvRef.current));
    setPos(null);
  }, [commitPending]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) closePanel();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel(); };
    const onMove = () => setPos(measure());
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onMove);
    };
  }, [open, measure, closePanel]);

  const commit = useCallback((next: [number, number, number]) => {
    setHsv(next);
    const hex = hsvToHex(...next);
    setHexDraft(hex);
    live(hex);
  }, [live]);

  /* Drag handlers — pointer capture so the drag survives leaving
     the element. Live commit on every move. */
  const dragSv = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = svRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const apply = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      const s = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const v = 1 - Math.min(1, Math.max(0, (clientY - r.top) / r.height));
      commit([hsvRef.current[0], s, v]);
    };
    apply(e.clientX, e.clientY);
    const move = (ev: globalThis.PointerEvent) => apply(ev.clientX, ev.clientY);
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      commitPending(hsvToHex(...hsvRef.current));
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };
  const dragHue = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = hueRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const apply = (clientX: number) => {
      const r = el.getBoundingClientRect();
      const h = Math.min(359.9, Math.max(0, ((clientX - r.left) / r.width) * 360));
      commit([h, hsvRef.current[1], hsvRef.current[2]]);
    };
    apply(e.clientX);
    const move = (ev: globalThis.PointerEvent) => apply(ev.clientX);
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      commitPending(hsvToHex(...hsvRef.current));
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };
  const [h, s, v] = hsv;
  const current = hsvToHex(h, s, v);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label} color — ${value}`}
        aria-expanded={open}
        onClick={() => (open ? closePanel() : openPanel())}
        style={{
          display: 'block',
          padding: 0,
          border: '1px solid var(--line, rgba(14,13,11,0.16))',
          borderRadius: 8,
          background: hexToRgb(value) ? value : '#888888',
          cursor: 'pointer',
          ...swatchStyle,
        }}
      />
      {pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Pick the ${label.toLowerCase()} color`}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 360,
            width: PANEL_W,
            padding: 10,
            borderRadius: 14,
            background: 'var(--pl-glass)',
            backgroundImage: 'var(--pl-glass-sheen)',
            backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
            WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
            border: '1px solid var(--pl-glass-border)',
            boxShadow: 'var(--pl-glass-shadow-lg, 0 18px 42px rgba(14,13,11,0.2))',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            animation: 'pear-datepicker-in 160ms cubic-bezier(0.22, 1, 0.36, 1) both',
          }}
        >
          {/* Saturation / brightness field. */}
          <div
            ref={svRef}
            onPointerDown={dragSv}
            style={{
              position: 'relative',
              height: 132,
              borderRadius: 10,
              cursor: 'crosshair',
              touchAction: 'none',
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))`,
              border: '1px solid rgba(14,13,11,0.14)',
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: `${s * 100}%`,
                top: `${(1 - v) * 100}%`,
                width: 14, height: 14,
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                border: '2px solid #fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.2)',
                background: current,
                pointerEvents: 'none',
              }}
            />
          </div>
          {/* Hue strip. */}
          <div
            ref={hueRef}
            onPointerDown={dragHue}
            style={{
              position: 'relative',
              height: 16,
              borderRadius: 999,
              cursor: 'ew-resize',
              touchAction: 'none',
              background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
              border: '1px solid rgba(14,13,11,0.14)',
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: `${(h / 360) * 100}%`,
                top: '50%',
                width: 16, height: 16,
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                border: '2px solid #fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                background: `hsl(${h}, 100%, 50%)`,
                pointerEvents: 'none',
              }}
            />
          </div>
          {/* Hex field + live swatch. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span aria-hidden style={{ width: 24, height: 24, borderRadius: 7, background: current, border: '1px solid rgba(14,13,11,0.16)', flexShrink: 0 }} />
            <input
              value={hexDraft}
              onChange={(e) => {
                const next = e.target.value;
                setHexDraft(next);
                const rgb = hexToRgb(next);
                if (rgb) {
                  const nextHsv = rgbToHsv(...rgb);
                  setHsv(nextHsv);
                  live(hsvToHex(...nextHsv));
                }
              }}
              onBlur={() => commitPending(hsvToHex(...hsvRef.current))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitPending(hsvToHex(...hsvRef.current));
              }}
              spellCheck={false}
              aria-label={`${label} hex value`}
              style={{
                flex: 1, minWidth: 0,
                padding: '6px 9px',
                borderRadius: 8,
                border: '1px solid var(--line, rgba(14,13,11,0.16))',
                background: 'var(--cream-2, rgba(255,255,255,0.5))',
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: 12, fontWeight: 600,
                color: 'var(--ink, #0E0D0B)',
                outline: 'none',
                textTransform: 'uppercase',
              }}
            />
            <button
              type="button"
              onClick={closePanel}
              style={{
                padding: '6px 11px', borderRadius: 999, border: 'none',
                background: 'var(--ink, #0E0D0B)', color: 'var(--cream, #F5EFE2)',
                fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                flexShrink: 0,
              }}
            >
              Done
            </button>
          </div>
          <style jsx global>{`
            @keyframes pear-datepicker-in {
              from { opacity: 0; transform: translateY(-4px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>,
        document.body,
      )}
    </>
  );
}
