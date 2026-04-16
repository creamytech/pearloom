'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/MultiSelectToolbar.tsx
// Floating toolbar for multi-selected blocks — bulk actions:
// Delete All, Hide All, Show All, Duplicate All.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Eye, EyeOff, Copy, X } from 'lucide-react';
import { deleteBlocks, toggleBlocksVisibility, duplicateBlock } from '@/lib/block-engine/block-actions';
import { ConfirmDialog } from './ConfirmDialog';
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
  // Accessible confirm dialog state (replaces native confirm() — item 83)
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (selectedIds.length < 2) return null;

  const handleDeleteAll = () => {
    setConfirmOpen(true);
  };
  const performDelete = () => {
    onUpdate(deleteBlocks(blocks, selectedIds));
    onClearSelection();
    setConfirmOpen(false);
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
    <>
    <ConfirmDialog
      open={confirmOpen}
      title={`Delete ${selectedIds.length} blocks?`}
      message="This cannot be undone."
      confirmLabel="Delete"
      onConfirm={performDelete}
      onCancel={() => setConfirmOpen(false)}
    />
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
          alignItems: 'stretch',
          gap: 0,
          padding: 0,
          borderRadius: 2,
          background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)',
          borderTop: '2px solid rgba(184,147,90,0.55)',
          borderLeft: '1px solid rgba(184,147,90,0.22)',
          borderRight: '1px solid rgba(184,147,90,0.22)',
          borderBottom: '1px solid rgba(184,147,90,0.22)',
          boxShadow: '0 18px 48px rgba(28,22,10,0.22), 0 2px 10px rgba(28,22,10,0.08)',
        } as React.CSSProperties}
      >
        {/* Selection dossier */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '8px 16px 8px 14px',
          borderRight: '1px solid rgba(184,147,90,0.28)',
          minWidth: 110,
        }}>
          <span style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: '0.48rem',
            fontWeight: 700,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'rgba(184,147,90,0.85)',
          }}>
            Ledger · multi
          </span>
          <span style={{
            fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
            fontStyle: 'italic',
            fontSize: '0.95rem',
            fontWeight: 400,
            color: '#18181B',
            lineHeight: 1.1,
            marginTop: 2,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}>
            {String(selectedIds.length).padStart(2, '0')} selected
          </span>
        </div>

        {/* Actions */}
        {([
          { icon: Copy, label: 'Duplicate', onClick: handleDuplicateAll, danger: false },
          { icon: EyeOff, label: 'Hide', onClick: handleHideAll, danger: false },
          { icon: Eye, label: 'Show', onClick: handleShowAll, danger: false },
          { icon: Trash2, label: 'Delete', onClick: handleDeleteAll, danger: true },
        ] as const).map((action, idx) => (
          <motion.button
            key={action.label}
            onClick={action.onClick}
            whileHover={{ backgroundColor: action.danger ? 'rgba(139,45,45,0.08)' : 'rgba(184,147,90,0.10)' }}
            whileTap={{ scale: 0.96 }}
            title={action.label}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '4px',
              padding: '8px 14px', borderRadius: 0,
              border: 'none',
              borderRight: '1px solid rgba(184,147,90,0.22)',
              background: 'transparent',
              cursor: 'pointer',
              color: action.danger ? '#8B2D2D' : '#18181B',
              transition: 'background 180ms cubic-bezier(0.22,1,0.36,1)',
              position: 'relative',
            }}
          >
            <span style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: '0.4rem',
              fontWeight: 700,
              letterSpacing: '0.24em',
              color: action.danger ? 'rgba(139,45,45,0.65)' : 'rgba(184,147,90,0.75)',
              position: 'absolute',
              top: 4,
              left: 6,
            }}>
              № {String(idx + 1).padStart(2, '0')}
            </span>
            <action.icon size={15} strokeWidth={1.6} />
            <span style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: '0.48rem',
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
            }}>
              {action.label}
            </span>
          </motion.button>
        ))}

        {/* Close */}
        <motion.button
          onClick={onClearSelection}
          whileHover={{ backgroundColor: 'rgba(184,147,90,0.10)' }}
          whileTap={{ scale: 0.94 }}
          aria-label="Clear selection"
          title="Clear selection"
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '4px',
            padding: '8px 14px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#52525B',
            transition: 'background 180ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <X size={13} strokeWidth={1.6} />
          <span style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: '0.48rem',
            fontWeight: 700,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
          }}>
            Close
          </span>
        </motion.button>
      </motion.div>
    </AnimatePresence>
    </>
  );
}
