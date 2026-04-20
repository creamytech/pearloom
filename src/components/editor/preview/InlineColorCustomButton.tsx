'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/preview/InlineColorCustomButton.tsx
// Compact custom-color swatch button for inline editor bars.
// Renders as a small rainbow circle (same footprint as the
// fixed preset swatches) and opens a lightweight popover with
// hue / saturation / lightness sliders + hex input so users
// can pick ANY color — not just the curated palette.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

function hexToHSL(hex: string): [number, number, number] {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return [140, 40, 55];
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

interface InlineColorCustomButtonProps {
  value: string;
  onChange: (hex: string) => void;
  /** Swatch diameter in pixels. */
  size?: number;
  /** True when the current `value` matches one of the preset swatches —
   *  we display a rainbow ring instead of the selected color to signal
   *  "custom" vs "preset". */
  presetActive?: boolean;
  title?: string;
}

const RAINBOW = 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';

export function InlineColorCustomButton({
  value,
  onChange,
  size = 18,
  presetActive = false,
  title = 'Custom color',
}: InlineColorCustomButtonProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [hex, setHex] = useState(value || '#5C6B3F');
  const [hsl, setHSL] = useState<[number, number, number]>(() => hexToHSL(value || '#5C6B3F'));
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) return;
    setHex(value);
    setHSL(hexToHSL(value));
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const updateFromHSL = (h: number, s: number, l: number) => {
    setHSL([h, s, l]);
    const next = hslToHex(h, s, l);
    setHex(next);
    onChange(next);
  };

  const handleHexInput = (v: string) => {
    setHex(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      onChange(v);
      setHSL(hexToHSL(v));
    }
  };

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setAnchor({ x: r.left + r.width / 2, y: r.bottom + 6 });
    }
    setOpen(v => !v);
  };

  // Preview — use rainbow if preset-active OR if value is empty; otherwise show the custom color.
  const swatchBg = !presetActive && value ? value : RAINBOW;
  const ringActive = !presetActive && !!value;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={title}
        aria-label={title}
        aria-haspopup="dialog"
        aria-expanded={open}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleOpen(); }}
        style={{
          width: size,
          height: size,
          padding: 0,
          borderRadius: '50%',
          background: swatchBg,
          border: ringActive
            ? '2px solid var(--pl-olive)'
            : '1.5px solid rgba(255,255,255,0.3)',
          boxShadow: ringActive ? '0 0 0 1px rgba(163,177,138,0.5)' : 'none',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />

      {typeof document !== 'undefined' && anchor && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={popRef}
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              role="dialog"
              aria-label="Pick a custom color"
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: anchor.y,
                left: Math.max(8, Math.min(anchor.x - 120, (typeof window !== 'undefined' ? window.innerWidth : 320) - 248)),
                zIndex: 10000,
                width: 240,
                padding: 12,
                borderRadius: 'var(--pl-radius-lg)',
                background: 'rgba(24,24,27,0.96)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              {/* Hue */}
              <label style={lblStyle}>Hue</label>
              <input
                type="range" min={0} max={360} value={hsl[0]}
                onChange={(e) => updateFromHSL(parseInt(e.target.value, 10), hsl[1], hsl[2])}
                style={{
                  width: '100%', height: 10, borderRadius: 'var(--pl-radius-full)', cursor: 'pointer',
                  background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                  appearance: 'none', WebkitAppearance: 'none',
                  margin: '4px 0 10px',
                }}
              />

              {/* Sat + Light */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={lblStyle}>Sat</label>
                  <input
                    type="range" min={0} max={100} value={hsl[1]}
                    onChange={(e) => updateFromHSL(hsl[0], parseInt(e.target.value, 10), hsl[2])}
                    style={{ width: '100%', accentColor: 'var(--pl-olive)', marginTop: 4 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lblStyle}>Light</label>
                  <input
                    type="range" min={0} max={100} value={hsl[2]}
                    onChange={(e) => updateFromHSL(hsl[0], hsl[1], parseInt(e.target.value, 10))}
                    style={{ width: '100%', accentColor: 'var(--pl-olive)', marginTop: 4 }}
                  />
                </div>
              </div>

              {/* Hex input + preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 'var(--pl-radius-md)',
                  background: hex,
                  border: '1px solid rgba(255,255,255,0.12)',
                  flexShrink: 0,
                }} />
                <input
                  type="text"
                  value={hex}
                  onChange={(e) => handleHexInput(e.target.value)}
                  maxLength={7}
                  spellCheck={false}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: 'var(--pl-radius-sm)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#FAF7F2',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

const lblStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.45)',
};
