'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / FloatingToolbar.tsx — Glassmorphic floating action bar
// Hovering over the canvas bottom with: Move, Style, Add (+), Undo
// Matches the Stitch "Photo Atelier" and "Parchment Overlay Editor"
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Move, Paintbrush, Plus, Undo2, Blend } from 'lucide-react';
import { useEditor } from '@/lib/editor-state';

const TOOLS = [
  { id: 'move',  Icon: Move,       label: 'Move',  tab: null },
  { id: 'style', Icon: Paintbrush, label: 'Style', tab: 'design' as const },
  { id: 'add',   Icon: Plus,       label: 'Add',   tab: 'canvas' as const, primary: true },
  { id: 'undo',  Icon: Undo2,      label: 'Undo',  tab: null },
  { id: 'fade',  Icon: Blend,      label: 'Fade',  tab: 'design' as const },
] as const;

export function FloatingToolbar() {
  const { state, dispatch, actions } = useEditor();

  const handleClick = (tool: typeof TOOLS[number]) => {
    if (tool.id === 'undo') {
      actions.undo();
      return;
    }
    if (tool.tab) {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: tool.tab });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 8px',
        borderRadius: '100px',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(24px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 24px rgba(43,30,20,0.1), 0 1px 4px rgba(43,30,20,0.06)',
      } as React.CSSProperties}
    >
      {TOOLS.map((tool) => {
        const Icon = tool.Icon;
        const isPrimary = 'primary' in tool && tool.primary;
        const isActive = tool.tab && state.activeTab === tool.tab;

        return (
          <motion.button
            key={tool.id}
            onClick={() => handleClick(tool)}
            disabled={tool.id === 'undo' && !state.canUndo}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            title={tool.label}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px',
              border: 'none',
              cursor: tool.id === 'undo' && !state.canUndo ? 'not-allowed' : 'pointer',
              borderRadius: isPrimary ? '50%' : '12px',
              padding: isPrimary ? '0' : '8px 14px',
              width: isPrimary ? '44px' : 'auto',
              height: isPrimary ? '44px' : 'auto',
              background: isPrimary
                ? 'var(--pl-olive-deep)'
                : isActive
                  ? 'rgba(163,177,138,0.12)'
                  : 'transparent',
              color: isPrimary
                ? '#fff'
                : isActive
                  ? 'var(--pl-olive-deep)'
                  : 'var(--pl-muted)',
              opacity: tool.id === 'undo' && !state.canUndo ? 0.35 : 1,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <Icon size={isPrimary ? 20 : 16} strokeWidth={isPrimary ? 2.5 : 2} />
            {!isPrimary && (
              <span style={{
                fontSize: '0.55rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}>
                {tool.label}
              </span>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
