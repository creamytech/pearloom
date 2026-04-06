'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/MultiSelectToolbar.tsx
// Floating toolbar for multi-selected blocks — bulk actions:
// Delete All, Hide All, Show All, Duplicate All.
// ─────────────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Eye, EyeOff, Copy, X } from 'lucide-react';
import { deleteBlocks, toggleBlocksVisibility, duplicateBlock } from '@/lib/block-engine/block-actions';
import type { PageBlock } from '@/types';

interface MultiSelectToolbarProps {
  selectedIds: string[];
  blocks: PageBlock[];
  onUpdate: (blocks: PageBlock[]) => void;
  onClearSelection: () => void;
}

export function MultiSelectToolbar({
  selectedIds,
  blocks,
  onUpdate,
  onClearSelection,
}: MultiSelectToolbarProps) {
  if (selectedIds.length < 2) return null;

  const handleDeleteAll = () => {
    if (!confirm(`Delete ${selectedIds.length} blocks? This cannot be undone.`)) return;
    onUpdate(deleteBlocks(blocks, selectedIds));
    onClearSelection();
  };

  const handleHideAll = () => {
    onUpdate(toggleBlocksVisibility(blocks, selectedIds, false));
  };

  const handleShowAll = () => {
    onUpdate(toggleBlocksVisibility(blocks, selectedIds, true));
  };

  const handleDuplicateAll = () => {
    let updated = [...blocks];
    for (const id of selectedIds) {
      updated = duplicateBlock(updated, id);
    }
    onUpdate(updated);
    onClearSelection();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '6px 8px',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 8px 32px rgba(43,30,20,0.12)',
        } as React.CSSProperties}
      >
        {/* Selection count */}
        <div style={{
          padding: '6px 12px',
          fontSize: '0.72rem', fontWeight: 700,
          color: 'var(--pl-olive-deep)',
          borderRight: '1px solid var(--pl-divider)',
          marginRight: '4px',
        }}>
          {selectedIds.length} selected
        </div>

        {/* Actions */}
        {[
          { icon: Copy, label: 'Duplicate', onClick: handleDuplicateAll, color: 'var(--pl-ink-soft)' },
          { icon: EyeOff, label: 'Hide', onClick: handleHideAll, color: 'var(--pl-ink-soft)' },
          { icon: Eye, label: 'Show', onClick: handleShowAll, color: 'var(--pl-olive)' },
          { icon: Trash2, label: 'Delete', onClick: handleDeleteAll, color: 'var(--pl-warning)' },
        ].map((action) => (
          <motion.button
            key={action.label}
            onClick={action.onClick}
            whileHover={{ scale: 1.08, backgroundColor: 'rgba(0,0,0,0.04)' }}
            whileTap={{ scale: 0.92 }}
            title={action.label}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '2px',
              padding: '6px 12px', borderRadius: '10px',
              border: 'none', background: 'transparent',
              cursor: 'pointer', color: action.color,
              transition: 'color 0.15s',
            }}
          >
            <action.icon size={16} />
            <span style={{ fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {action.label}
            </span>
          </motion.button>
        ))}

        {/* Close */}
        <motion.button
          onClick={onClearSelection}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '28px', height: '28px', borderRadius: '50%',
            border: '1px solid var(--pl-divider)', background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--pl-muted)', marginLeft: '4px',
          }}
        >
          <X size={12} />
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
