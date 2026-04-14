'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / ui/color-picker.tsx
// Custom color picker — no native <input type="color">.
// Glass panel with hue slider, saturation/brightness area,
// hex input, and preset swatches.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pipette, Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const PRESET_COLORS = [
  '#1A1A1A', '#3D3530', '#6B665F', '#A3B18A', '#6E8C5C',
  '#C4A96A', '#6D597A', '#C45D3E', '#FFFFFF', '#FAF7F2',
  '#F0EBE0', '#E0D8CA', '#c9706a', '#3a7ca8', '#d4829a',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

function hexToHSL(hex: string): [number, number, number] {
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
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function ColorPicker({ value, onChange, label, className }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const [hsl, setHSL] = useState<[number, number, number]>(() => {
    try { return hexToHSL(value); } catch { return [140, 40, 55]; }
  });
  // Item #55: swatch hover preview state
  const [hoverSwatch, setHoverSwatch] = useState<{ color: string; x: number; y: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexInput(value);
    try { setHSL(hexToHSL(value)); } catch {}
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const updateFromHSL = (h: number, s: number, l: number) => {
    setHSL([h, s, l]);
    const hex = hslToHex(h, s, l);
    setHexInput(hex);
    onChange(hex);
  };

  const handleHexInput = (v: string) => {
    setHexInput(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      onChange(v);
      try { setHSL(hexToHSL(v)); } catch {}
    }
  };

  return (
    <div ref={pickerRef} className={cn('relative', className)}>
      {label && (
        <span className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-muted)] mb-1.5">
          {label}
        </span>
      )}

      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--pl-radius-sm)] border-[1.5px] border-[var(--pl-divider)] bg-white cursor-pointer hover:border-[var(--pl-olive)] transition-colors"
      >
        <div
          className="w-6 h-6 rounded-md border border-[rgba(0,0,0,0.1)]"
          style={{ background: value }}
        />
        <span className="text-[0.82rem] font-mono text-[var(--pl-ink)]">{value}</span>
      </button>

      {/* Dropdown picker — rendered via portal to escape overflow:hidden */}
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            ref={(el) => {
              if (el && pickerRef.current) {
                const rect = pickerRef.current.getBoundingClientRect();
                el.style.position = 'fixed';
                el.style.top = `${rect.bottom + 4}px`;
                el.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 252))}px`;
              }
            }}
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="z-[10000] w-[240px] p-3 rounded-[16px] bg-white/95 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] shadow-[0_8px_32px_rgba(43,30,20,0.12)]"
          >
            {/* Hue slider */}
            <div className="mb-3">
              <input
                type="range"
                min={0}
                max={360}
                value={hsl[0]}
                onChange={(e) => updateFromHSL(parseInt(e.target.value), hsl[1], hsl[2])}
                className="w-full h-3 rounded-full cursor-pointer appearance-none"
                style={{
                  background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                }}
              />
            </div>

            {/* Saturation + Lightness sliders */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <span className="text-[0.55rem] font-bold uppercase tracking-[0.08em] text-[var(--pl-muted)] mb-1 block">Sat</span>
                <input
                  type="range" min={0} max={100} value={hsl[1]}
                  onChange={(e) => updateFromHSL(hsl[0], parseInt(e.target.value), hsl[2])}
                  className="w-full h-2 rounded-full cursor-pointer"
                  style={{ accentColor: 'var(--pl-olive)' }}
                />
              </div>
              <div className="flex-1">
                <span className="text-[0.55rem] font-bold uppercase tracking-[0.08em] text-[var(--pl-muted)] mb-1 block">Light</span>
                <input
                  type="range" min={0} max={100} value={hsl[2]}
                  onChange={(e) => updateFromHSL(hsl[0], hsl[1], parseInt(e.target.value))}
                  className="w-full h-2 rounded-full cursor-pointer"
                  style={{ accentColor: 'var(--pl-olive)' }}
                />
              </div>
            </div>

            {/* Hex input */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg border border-[rgba(0,0,0,0.1)] flex-shrink-0"
                style={{ background: value }}
              />
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                maxLength={7}
                className="flex-1 px-2 py-1.5 rounded-md border-[1.5px] border-[var(--pl-divider)] bg-[var(--pl-cream-deep)] font-mono text-[0.78rem] text-[var(--pl-ink)] outline-none pl-focus-glow"
              />
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => { onChange(color); setHexInput(color); try { setHSL(hexToHSL(color)); } catch {} }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoverSwatch({ color, x: rect.left + rect.width / 2, y: rect.top });
                  }}
                  onMouseLeave={() => setHoverSwatch(null)}
                  className="w-5 h-5 rounded-md border cursor-pointer transition-transform hover:scale-110"
                  style={{
                    background: color,
                    borderColor: value === color ? 'var(--pl-olive)' : 'rgba(0,0,0,0.08)',
                    boxShadow: value === color ? '0 0 0 2px rgba(163,177,138,0.3)' : 'none',
                  }}
                  title={color}
                />
              ))}
            </div>

            {/* Item #55: hover preview tooltip */}
            {hoverSwatch && typeof document !== 'undefined' && createPortal(
              <div
                style={{
                  position: 'fixed',
                  left: `${hoverSwatch.x}px`,
                  top: `${hoverSwatch.y - 58}px`,
                  transform: 'translateX(-50%)',
                  zIndex: 10001,
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: hoverSwatch.color,
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                />
                <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: '#18181B' }}>
                  {hoverSwatch.color}
                </span>
              </div>,
              document.body,
            )}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
}
