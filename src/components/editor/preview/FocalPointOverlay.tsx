'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/preview/FocalPointOverlay.tsx
//
// Fixed-position overlay that lets the user drag a crosshair
// to set imagePosition (x/y focal point, 0–100) on a chapter
// photo. Renders via createPortal so it sits above the canvas.
//
// Activated by: clicking a chapter image on the canvas
// → SiteRenderer fires 'pearloom-focal-point-start' CustomEvent
// → EditorCanvas mounts this overlay
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

export interface FocalPointOverlayProps {
  chapterId: string;
  /** getBoundingClientRect() of the image element at open time */
  rect: DOMRect;
  /** Current focal point X, 0–100 */
  currentX: number;
  /** Current focal point Y, 0–100 */
  currentY: number;
  /** Called on every pointer move (RAF-throttled) for live preview */
  onPositionChange: (x: number, y: number) => void;
  /** Called on pointerup — commits the final position */
  onCommit: (x: number, y: number) => void;
  onClose: () => void;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function FocalPointOverlay({
  chapterId: _chapterId,
  rect,
  currentX,
  currentY,
  onPositionChange,
  onCommit,
  onClose,
}: FocalPointOverlayProps) {
  const [posX, setPosX] = useState(currentX);
  const [posY, setPosY] = useState(currentY);
  const isDragging = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Compute crosshair position in viewport coordinates
  const crosshairX = rect.left + (posX / 100) * rect.width;
  const crosshairY = rect.top + (posY / 100) * rect.height;

  const computePos = useCallback((clientX: number, clientY: number) => {
    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    return { x, y };
  }, [rect]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const { x, y } = computePos(e.clientX, e.clientY);
    setPosX(x);
    setPosY(y);
    onPositionChange(x, y);
  }, [computePos, onPositionChange]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const { x, y } = computePos(e.clientX, e.clientY);
        setPosX(x);
        setPosY(y);
        onPositionChange(x, y);
      });
    };
    const onUp = (e: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      const { x, y } = computePos(e.clientX, e.clientY);
      setPosX(x);
      setPosY(y);
      onCommit(x, y);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [computePos, onPositionChange, onCommit]);

  // Escape to cancel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const content = (
    <AnimatePresence>
      <motion.div
        key="focal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onPointerDown={handlePointerDown}
        style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          cursor: 'crosshair',
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        {/* Image highlight border */}
        <div style={{
          position: 'fixed',
          left: rect.left, top: rect.top,
          width: rect.width, height: rect.height,
          border: '2px solid rgba(255,255,255,0.7)',
          borderRadius: '4px',
          pointerEvents: 'none',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.2)',
        }} />

        {/* Crosshair handle */}
        <div
          style={{
            position: 'fixed',
            left: crosshairX,
            top: crosshairY,
            transform: 'translate(-50%, -50%)',
            width: '40px', height: '40px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.92)',
            border: '1.5px solid #18181B',
            boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Crosshair lines */}
          <div style={{ position: 'absolute', left: '50%', top: 4, bottom: 4, width: '1px', background: '#18181B', transform: 'translateX(-50%)' }} />
          <div style={{ position: 'absolute', top: '50%', left: 4, right: 4, height: '1px', background: '#18181B', transform: 'translateY(-50%)' }} />
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#18181B' }} />
        </div>

        {/* Instructions pill */}
        <div
          style={{
            position: 'fixed',
            bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#18181B',
            color: '#fff',
            borderRadius: '100px',
            padding: '8px 14px',
            fontSize: '0.72rem',
            fontWeight: 600,
            fontFamily: 'system-ui, sans-serif',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap',
            pointerEvents: 'auto',
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          <span style={{ opacity: 0.7 }}>Click or drag to set focal point</span>
          <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)' }} />
          <button
            onClick={e => { e.stopPropagation(); onCommit(posX, posY); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '3px 8px', borderRadius: '6px',
              border: 'none', background: 'rgba(255,255,255,0.15)',
              color: '#fff', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
            }}
          >
            <Check size={11} /> Done
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '22px', height: '22px', borderRadius: '50%',
              border: 'none', background: 'rgba(255,255,255,0.1)',
              color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={11} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
