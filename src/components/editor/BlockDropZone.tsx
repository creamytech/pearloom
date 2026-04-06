'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/BlockDropZone.tsx
// Visual drop indicator that appears between blocks when dragging
// a new block type from the add palette. Shows a blue line with
// a "Drop here" label at the insertion point.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

interface BlockDropZoneProps {
  /** Index where the block would be inserted */
  index: number;
  /** Whether a block is currently being dragged */
  isDragging: boolean;
  /** Called when a block is dropped at this position */
  onDrop: (index: number) => void;
}

export function BlockDropZone({ index, isDragging, onDrop }: BlockDropZoneProps) {
  const [isOver, setIsOver] = useState(false);

  if (!isDragging) return <div style={{ height: '4px' }} />;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); onDrop(index); }}
      style={{
        position: 'relative',
        height: isOver ? '48px' : '16px',
        transition: 'height 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AnimatePresence>
        {isOver && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            style={{
              position: 'absolute',
              left: '16px', right: '16px',
              height: '3px',
              borderRadius: '2px',
              background: 'var(--pl-olive)',
              boxShadow: '0 0 8px rgba(163,177,138,0.4)',
            }}
          />
        )}
      </AnimatePresence>
      {isOver && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'absolute',
            padding: '3px 10px',
            borderRadius: '100px',
            background: 'var(--pl-olive-deep)',
            color: 'white',
            fontSize: '0.58rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 5,
          }}
        >
          <Plus size={10} /> Drop here
        </motion.div>
      )}
    </div>
  );
}
