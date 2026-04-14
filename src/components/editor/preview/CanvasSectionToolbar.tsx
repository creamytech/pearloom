'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/preview/CanvasSectionToolbar.tsx
//
// Floating dark-pill toolbar for generic section hover (footer, nav).
// Pattern mirrors CanvasChapterToolbar.
// ─────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';

export type SectionToolbarAction = 'edit';

interface CanvasSectionToolbarProps {
  rect: DOMRect;
  label: string;
  onAction: (action: SectionToolbarAction) => void;
  keepEvent: string;
}

function ToolBtn({
  icon: Icon, label, onClick,
}: {
  icon: React.ElementType; label: string; onClick: (e: React.MouseEvent) => void;
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
        color: 'rgba(255,255,255,0.85)',
        cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <Icon size={13} strokeWidth={2} />
    </button>
  );
}

export function CanvasSectionToolbar({ rect, label, onAction, keepEvent }: CanvasSectionToolbarProps) {
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
      onMouseEnter={() => window.dispatchEvent(new CustomEvent(keepEvent))}
      style={{
        position: 'fixed',
        top,
        right,
        zIndex: 200,
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '3px 8px 3px 4px',
        borderRadius: '12px',
        background: '#18181B',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
    >
      <ToolBtn icon={Pencil} label={`Edit ${label}`} onClick={() => onAction('edit')} />
      <span style={{
        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </motion.div>
  );
}
