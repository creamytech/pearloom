'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / FloatingToolbar.tsx — Glassmorphic floating action bar
// Hovering over the canvas bottom with: Move, Style, Add (+), Undo
// Matches the Stitch "Photo Atelier" and "Parchment Overlay Editor"
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { GripVertical, Paintbrush, Plus, Undo2, Redo2 } from 'lucide-react';
import { RichTooltip } from '@/components/ui/tooltip';
import { useEditor } from '@/lib/editor-state';

const TOOLS = [
  { id: 'move',  Icon: GripVertical, label: 'Reorder',  description: 'Drag to reorder blocks', tab: 'canvas' as const },
  { id: 'style', Icon: Paintbrush, label: 'Design', description: 'Colors, fonts & visual style', tab: 'design' as const },
  { id: 'add',   Icon: Plus,       label: 'Section', description: 'Add a new section', tab: 'canvas' as const, primary: true },
  { id: 'undo',  Icon: Undo2,      label: 'Undo',  description: 'Undo last action', shortcut: '⌘Z', tab: null },
  { id: 'redo',  Icon: Redo2,      label: 'Redo',  description: 'Redo last action', shortcut: '⌘⇧Z', tab: null },
] as const;

export function FloatingToolbar() {
  const { state, dispatch, actions } = useEditor();

  const handleClick = (tool: typeof TOOLS[number]) => {
    if (tool.id === 'undo') {
      actions.undo();
      return;
    }
    if (tool.id === 'redo') {
      actions.redo();
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
        left: '0',
        right: '0',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      } as React.CSSProperties}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 8px',
        borderRadius: '8px',
        pointerEvents: 'auto',
        background: 'rgba(250,247,242,0.78)',
        backdropFilter: 'blur(32px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
      } as React.CSSProperties}
    >
      {TOOLS.map((tool) => {
        const Icon = tool.Icon;
        const isPrimary = 'primary' in tool && tool.primary;
        const isActive = tool.tab && state.activeTab === tool.tab;

        return (
          <RichTooltip
            key={tool.id}
            label={tool.label}
            description={tool.description}
            shortcut={'shortcut' in tool ? tool.shortcut : undefined}
            side="top"
          >
            <motion.button
              onClick={() => handleClick(tool)}
              disabled={(tool.id === 'undo' && !state.canUndo) || (tool.id === 'redo' && !state.canRedo)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '3px',
                border: 'none',
                cursor: ((tool.id === 'undo' && !state.canUndo) || (tool.id === 'redo' && !state.canRedo)) ? 'not-allowed' : 'pointer',
                borderRadius: isPrimary ? '50%' : '12px',
                padding: isPrimary ? '0' : '8px 14px',
                width: isPrimary ? '44px' : 'auto',
                height: isPrimary ? '44px' : 'auto',
                background: isPrimary
                  ? '#18181B'
                  : isActive
                    ? '#F4F4F5'
                    : 'transparent',
                color: isPrimary
                  ? '#fff'
                  : isActive
                    ? '#18181B'
                    : '#71717A',
                opacity: ((tool.id === 'undo' && !state.canUndo) || (tool.id === 'redo' && !state.canRedo)) ? 0.35 : 1,
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
          </RichTooltip>
        );
      })}
      </div>
    </motion.div>
  );
}
