'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/preview/CanvasEventToolbar.tsx
//
// Floating dark-pill toolbar that appears when hovering an
// event card on the canvas. Pattern mirrors CanvasChapterToolbar.
// ─────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Pencil, ArrowUp, ArrowDown, Copy, Trash2 } from 'lucide-react';

export type EventToolbarAction = 'edit' | 'moveUp' | 'moveDown' | 'duplicate' | 'delete';

interface CanvasEventToolbarProps {
  rect: DOMRect;
  eventIndex: number;
  eventCount: number;
  onAction: (action: EventToolbarAction) => void;
}

function ToolBtn({
  icon: Icon, label, danger, onClick,
}: {
  icon: React.ElementType; label: string; danger?: boolean; onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: '28px', height: '28px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: '8px',
        background: 'transparent',
        color: danger ? '#f87171' : 'rgba(255,255,255,0.85)',
        cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = danger
          ? 'rgba(248,113,113,0.18)'
          : 'rgba(255,255,255,0.12)';
      }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <Icon size={13} strokeWidth={2} />
    </button>
  );
}

export function CanvasEventToolbar({ rect, eventIndex, eventCount, onAction }: CanvasEventToolbarProps) {
  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  const top = rect.top + 10;
  const right = window.innerWidth - rect.right + 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      onMouseDown={stop}
      onClick={stop}
      onMouseEnter={() => window.dispatchEvent(new CustomEvent('pearloom-event-hover-keep'))}
      style={{
        position: 'fixed',
        top,
        right,
        zIndex: 200,
        display: 'flex', alignItems: 'center', gap: '2px',
        padding: '3px 4px',
        borderRadius: '12px',
        background: '#18181B',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
    >
      <ToolBtn icon={Pencil} label="Edit in sidebar" onClick={() => onAction('edit')} />

      {eventIndex > 0 && (
        <ToolBtn icon={ArrowUp} label="Move up" onClick={() => onAction('moveUp')} />
      )}
      {eventIndex < eventCount - 1 && (
        <ToolBtn icon={ArrowDown} label="Move down" onClick={() => onAction('moveDown')} />
      )}

      <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />

      <ToolBtn icon={Copy} label="Duplicate" onClick={() => onAction('duplicate')} />
      <ToolBtn icon={Trash2} label="Delete" danger onClick={() => onAction('delete')} />
    </motion.div>
  );
}
