'use client';

// -----------------------------------------------------------------
// Pearloom / editor/SpacingOverlay.tsx
// Shows spacing values between adjacent sections in the preview.
// Listens for SECTION_GAP_HOVER messages from the iframe and
// renders an olive pill with dashed connector lines.
//
// Message from iframe:
//   { type: 'SECTION_GAP_HOVER',
//     topRect: { bottom: number },
//     bottomRect: { top: number },
//     left: number,
//     width: number,
//     spacing: number }
//   { type: 'SECTION_GAP_HOVER_OUT' }
// -----------------------------------------------------------------

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GapInfo {
  /** Y position of the top section's bottom edge (relative to canvas) */
  topBottom: number;
  /** Y position of the bottom section's top edge (relative to canvas) */
  bottomTop: number;
  /** X center position */
  centerX: number;
  /** The spacing value in px */
  spacing: number;
}

export function SpacingOverlay() {
  const [gap, setGap] = useState<GapInfo | null>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'SECTION_GAP_HOVER') {
        const { topRect, bottomRect, left, width, spacing } = e.data;
        setGap({
          topBottom: topRect.bottom,
          bottomTop: bottomRect.top,
          centerX: left + width / 2,
          spacing: Math.round(spacing),
        });
      }
      if (e.data?.type === 'SECTION_GAP_HOVER_OUT') {
        setGap(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (!gap) return null;

  const midY = (gap.topBottom + gap.bottomTop) / 2;
  const lineHeight = gap.bottomTop - gap.topBottom;

  return (
    <AnimatePresence>
      {gap && (
        <motion.div
          key="spacing-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 45,
          }}
        >
          {/* Top dashed line */}
          <div
            style={{
              position: 'absolute',
              top: gap.topBottom,
              left: gap.centerX - 60,
              width: 120,
              height: 0,
              borderTop: '1px dashed rgba(163,177,138,0.5)',
            }}
          />

          {/* Bottom dashed line */}
          <div
            style={{
              position: 'absolute',
              top: gap.bottomTop,
              left: gap.centerX - 60,
              width: 120,
              height: 0,
              borderTop: '1px dashed rgba(163,177,138,0.5)',
            }}
          />

          {/* Vertical connector */}
          {lineHeight > 20 && (
            <div
              style={{
                position: 'absolute',
                top: gap.topBottom,
                left: gap.centerX,
                width: 0,
                height: lineHeight,
                borderLeft: '1px dashed rgba(163,177,138,0.35)',
              }}
            />
          )}

          {/* Spacing pill */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            style={{
              position: 'absolute',
              top: midY,
              left: gap.centerX,
              transform: 'translate(-50%, -50%)',
              padding: '3px 10px',
              borderRadius: '100px',
              background: 'var(--pl-olive, #A3B18A)',
              color: 'white',
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(163,177,138,0.35)',
            }}
          >
            {gap.spacing}px
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
