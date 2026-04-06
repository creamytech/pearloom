'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / ui/range-slider.tsx
// Custom styled range slider with value label and olive accent.
// Replaces native <input type="range">.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  suffix?: string;
  showValue?: boolean;
  className?: string;
}

export function RangeSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  suffix = '',
  showValue = true,
  className,
}: RangeSliderProps) {
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const pct = ((value - min) / (max - min)) * 100;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    updateFromPointer(e.clientX);
  }, [dragging]);

  const updateFromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const rawPct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawVal = min + rawPct * (max - min);
    const snapped = Math.round(rawVal / step) * step;
    onChange(Math.max(min, Math.min(max, snapped)));
  };

  return (
    <div className={className}>
      {/* Label + value */}
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-muted)]">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-[0.78rem] font-semibold text-[var(--pl-ink)] tabular-nums font-mono">
              {value}{suffix}
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragging(false)}
        className="relative h-6 flex items-center cursor-pointer touch-none"
      >
        {/* Background track */}
        <div className="absolute left-0 right-0 h-[6px] rounded-full bg-[var(--pl-cream-deep)]" />

        {/* Fill */}
        <div
          className="absolute left-0 h-[6px] rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: 'var(--pl-olive-deep)',
            transition: dragging ? 'none' : 'width 0.15s ease',
          }}
        />

        {/* Thumb */}
        <motion.div
          animate={{ scale: dragging ? 1.2 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="absolute w-[18px] h-[18px] rounded-full bg-white border-[2.5px] border-[var(--pl-olive-deep)] shadow-sm"
          style={{
            left: `calc(${pct}% - 9px)`,
            transition: dragging ? 'none' : 'left 0.15s ease',
            boxShadow: dragging
              ? '0 0 0 4px rgba(163,177,138,0.2), 0 2px 8px rgba(0,0,0,0.1)'
              : '0 1px 4px rgba(0,0,0,0.1)',
          }}
        />
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[0.58rem] text-[var(--pl-muted)]">{min}{suffix}</span>
        <span className="text-[0.58rem] text-[var(--pl-muted)]">{max}{suffix}</span>
      </div>
    </div>
  );
}
