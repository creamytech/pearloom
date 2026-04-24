'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/ResponsivePreviewFrame.tsx
// Wraps the canvas preview in a resizable viewport frame with:
//   • Drag handles on the right edge (and left) to size freely
//   • A floating ruler pill showing exact pixel width + the
//     matching Tailwind-ish breakpoint label (sm/md/lg/xl/2xl)
//   • Quick snap-to preset chips (390 / 768 / 1024 / 1280)
//
// The parent owns width state — this component is controlled.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Tablet, Monitor } from 'lucide-react';

const MIN_WIDTH = 320;
const MAX_WIDTH = 1920;

// Standard Tailwind-ish breakpoints for the ruler label.
function breakpointLabel(w: number): string {
  if (w < 640) return 'sm';
  if (w < 768) return 'md';
  if (w < 1024) return 'lg';
  if (w < 1280) return 'xl';
  return '2xl';
}

interface ResponsivePreviewFrameProps {
  width: number;
  onWidthChange: (w: number) => void;
  children: React.ReactNode;
  minHeight?: number;
  /** Show framed chrome (rounded + shadow). False = desktop. */
  framed?: boolean;
}

export function ResponsivePreviewFrame({
  width,
  onWidthChange,
  children,
  minHeight = 780,
  framed = true,
}: ResponsivePreviewFrameProps) {
  const [dragging, setDragging] = useState<null | 'left' | 'right'>(null);
  const startXRef = useRef(0);
  const startWRef = useRef(0);

  const clamp = useCallback((n: number) => Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(n))), []);

  const onHandleDown = useCallback((side: 'left' | 'right') => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(side);
    startXRef.current = e.clientX;
    startWRef.current = width;
  }, [width]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startXRef.current;
      // Dragging the right handle outward grows width; left handle is mirrored.
      const delta = dragging === 'right' ? dx * 2 : -dx * 2;
      onWidthChange(clamp(startWRef.current + delta));
    };
    const onUp = () => setDragging(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging, onWidthChange, clamp]);

  const bp = breakpointLabel(width);
  const BpIcon = width < 768 ? Smartphone : width < 1024 ? Tablet : Monitor;

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      {/* Frame body */}
      <motion.div
        animate={{ width }}
        transition={dragging
          ? { duration: 0 }
          : { type: 'spring', stiffness: 340, damping: 32 }}
        style={{
          width,
          maxWidth: '100%',
          borderRadius: framed ? 24 : 0,
          overflow: 'hidden',
          boxShadow: framed
            ? '0 12px 48px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)'
            : undefined,
          minHeight,
          background: 'var(--cream)',
          position: 'relative',
        }}
      >
        {children}
      </motion.div>

      {/* Left resize handle */}
      <button
        type="button"
        onPointerDown={onHandleDown('left')}
        aria-label="Resize viewport from left"
        style={{
          ...handleStyle,
          right: `calc(50% + ${width / 2}px - 4px)`,
        }}
      >
        <span style={handleGrip} />
      </button>

      {/* Right resize handle */}
      <button
        type="button"
        onPointerDown={onHandleDown('right')}
        aria-label="Resize viewport from right"
        style={{
          ...handleStyle,
          left: `calc(50% + ${width / 2}px - 4px)`,
        }}
      >
        <span style={handleGrip} />
      </button>

      {/* Ruler pill — shows current width + breakpoint */}
      <motion.div
        animate={{ opacity: dragging ? 1 : 0.85 }}
        style={{
          position: 'absolute',
          top: -34,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 'var(--pl-radius-full)',
          background: '#18181B',
          color: '#FAF7F2',
          fontSize: 11,
          fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          pointerEvents: 'auto',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}
      >
        <BpIcon size={12} />
        <span>{width}px</span>
        <span style={{
          padding: '1px 6px',
          borderRadius: 'var(--pl-radius-full)',
          background: 'rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.75)',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontSize: 9,
        }}>
          {bp}
        </span>
        <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.18)' }} />
        {[390, 768, 1024, 1280].map(preset => (
          <button
            key={preset}
            onClick={() => onWidthChange(preset)}
            style={{
              padding: '1px 6px',
              borderRadius: 'var(--pl-radius-sm)',
              border: 'none',
              background: width === preset ? 'rgba(255,255,255,0.18)' : 'transparent',
              color: width === preset ? '#FAF7F2' : 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
            title={`Snap to ${preset}px`}
          >
            {preset}
          </button>
        ))}
      </motion.div>
    </div>
  );
}

const handleStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 8,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'ew-resize',
  zIndex: 5,
};

const handleGrip: React.CSSProperties = {
  width: 4,
  height: 36,
  borderRadius: 'var(--pl-radius-xs)',
  background: 'rgba(24,24,27,0.35)',
};
