'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/SpacingHandle.tsx
// Visual spacing handle between sections — drag up/down to
// adjust padding. Shows a draggable bar with current pixel value.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripHorizontal } from 'lucide-react';

interface SpacingHandleProps {
  /** Current spacing value in pixels */
  value: number;
  /** Min spacing */
  min?: number;
  /** Max spacing */
  max?: number;
  /** Called when spacing changes */
  onChange: (value: number) => void;
}

export function SpacingHandle({ value, min = 16, max = 200, onChange }: SpacingHandleProps) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const startY = useRef(0);
  const startVal = useRef(value);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    startY.current = e.clientY;
    startVal.current = value;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [value]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const delta = e.clientY - startY.current;
    const next = Math.max(min, Math.min(max, startVal.current + delta));
    onChange(Math.round(next));
  }, [dragging, min, max, onChange]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const visible = hovered || dragging;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        height: `${value}px`,
        cursor: 'ns-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: dragging ? 'none' : 'height 0.2s ease',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Visible handle bar */}
      <motion.div
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          borderRadius: '8px',
          background: dragging ? '#18181B' : 'rgba(24,24,27,0.08)',
          border: `1px solid ${dragging ? '#18181B' : '#E4E4E7'}`,
          color: dragging ? 'white' : '#18181B',
          pointerEvents: 'none',
        }}
      >
        <GripHorizontal size={12} />
        <span style={{
          fontSize: '0.6rem', fontWeight: 700,
          letterSpacing: '0.06em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}px
        </span>
      </motion.div>

      {/* Dashed guide lines */}
      {visible && (
        <>
          <div style={{
            position: 'absolute', top: 0, left: '20%', right: '20%',
            height: '1px', borderTop: '1px dashed #E4E4E7',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: '20%', right: '20%',
            height: '1px', borderTop: '1px dashed #E4E4E7',
          }} />
        </>
      )}
    </div>
  );
}
