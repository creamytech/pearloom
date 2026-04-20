'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/preview/CanvasPhotoBlockOverlay.tsx
//
// Floating "Add Photos" prompt that appears centered over an
// empty photo gallery block. Fires pearloom-select-block to
// open the block config panel.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { ImagePlus } from 'lucide-react';

interface CanvasPhotoBlockOverlayProps {
  rect: DOMRect;
  blockId: string;
}

export function CanvasPhotoBlockOverlay({ rect, blockId }: CanvasPhotoBlockOverlayProps) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed',
        left: cx,
        top: cy,
        transform: 'translate(-50%, -50%)',
        zIndex: 200,
        pointerEvents: 'auto',
      }}
    >
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('pearloom-select-block', { detail: { blockType: 'photos', blockId } }))}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 18px',
          borderRadius: 'var(--pl-radius-full)',
          background: '#18181B',
          color: 'rgba(255,255,255,0.9)',
          border: 'none', cursor: 'pointer',
          fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em',
          boxShadow: '0 4px 24px rgba(0,0,0,0.28)',
          transition: 'background var(--pl-dur-instant)',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#27272A'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#18181B'; }}
      >
        <ImagePlus size={14} strokeWidth={2} />
        Add Photos
      </button>
    </motion.div>
  );
}
