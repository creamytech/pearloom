'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / FloatingToolbar.tsx — editorial dock at canvas base
//
// Redesign: segmented editorial dock with a Fraunces italic "+"
// Section launcher at the spine, framed between two mono-labeled
// groups — Compose (reorder / design) on the left, History (undo /
// redo) on the right. Cream paper, gold hairline, pitch-black
// center button with a cream ring.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { GripVertical, Paintbrush, Plus, Undo2, Redo2 } from 'lucide-react';
import { RichTooltip } from '@/components/ui/tooltip';
import { useEditor } from '@/lib/editor-state';
import { panelFont, panelTracking } from './panel';

type Tool = {
  id: 'move' | 'style' | 'add' | 'undo' | 'redo';
  Icon: typeof GripVertical;
  label: string;
  description: string;
  tab: 'canvas' | 'design' | null;
  shortcut?: string;
  primary?: boolean;
  group: 'compose' | 'spine' | 'history';
};

const TOOLS: Tool[] = [
  { id: 'move',  Icon: GripVertical, label: 'Reorder',  description: 'Drag to reorder blocks', tab: 'canvas', group: 'compose' },
  { id: 'style', Icon: Paintbrush,   label: 'Design',   description: 'Colors, fonts & visual style', tab: 'design', group: 'compose' },
  { id: 'add',   Icon: Plus,         label: 'Section',  description: 'Add a new section', tab: 'canvas', primary: true, group: 'spine' },
  { id: 'undo',  Icon: Undo2,        label: 'Undo',     description: 'Undo last action', shortcut: '⌘Z', tab: null, group: 'history' },
  { id: 'redo',  Icon: Redo2,        label: 'Redo',     description: 'Redo last action', shortcut: '⌘⇧Z', tab: null, group: 'history' },
];

export function FloatingToolbar() {
  const { state, dispatch, actions } = useEditor();

  const handleClick = (tool: Tool) => {
    if (tool.id === 'undo') { actions.undo(); return; }
    if (tool.id === 'redo') { actions.redo(); return; }
    if (tool.tab) dispatch({ type: 'SET_ACTIVE_TAB', tab: tool.tab });
  };

  const compose = TOOLS.filter(t => t.group === 'compose');
  const spine = TOOLS.find(t => t.group === 'spine')!;
  const history = TOOLS.filter(t => t.group === 'history');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'absolute',
        bottom: '28px',
        left: 0, right: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'stretch',
        pointerEvents: 'auto',
        background: 'var(--pl-chrome-surface)',
        border: '1px solid var(--pl-chrome-border)',
        borderRadius: '14px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05), 0 18px 44px rgba(0,0,0,0.10)',
        position: 'relative',
        overflow: 'visible',
      }}>
        {/* Gold hairline top — editorial rule */}
        <div style={{
          position: 'absolute', top: '-1px', left: '18px', right: '18px',
          height: '1px', background: 'var(--pl-chrome-accent)', opacity: 0.55,
          pointerEvents: 'none',
        }} />

        {/* Left eyebrow label */}
        <GroupLabel text="Compose" />

        {/* Compose group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '6px 4px' }}>
          {compose.map(tool => (
            <EditorDockBtn key={tool.id} tool={tool}
              isActive={tool.tab ? state.activeTab === tool.tab : false}
              onClick={() => handleClick(tool)}
            />
          ))}
        </div>

        <Divider />

        {/* Spine — primary add button */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 14px',
        }}>
          <RichTooltip
            label={spine.label}
            description={spine.description}
            side="top"
          >
            <motion.button
              onClick={() => handleClick(spine)}
              whileHover={{ scale: 1.06, rotate: 90 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              aria-label={spine.description}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '48px', height: '48px',
                borderRadius: '50%',
                border: '2px solid var(--pl-chrome-surface)',
                background: 'var(--pl-chrome-text)',
                color: 'var(--pl-chrome-surface)',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.15), 0 0 0 1px var(--pl-chrome-accent)',
                position: 'relative',
                top: '-6px',
              }}
            >
              <Plus size={20} strokeWidth={2.5} />
            </motion.button>
          </RichTooltip>
        </div>

        <Divider />

        {/* History group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '6px 4px' }}>
          {history.map(tool => (
            <EditorDockBtn key={tool.id} tool={tool}
              disabled={(tool.id === 'undo' && !state.canUndo) || (tool.id === 'redo' && !state.canRedo)}
              onClick={() => handleClick(tool)}
            />
          ))}
        </div>

        {/* Right eyebrow label */}
        <GroupLabel text="History" align="right" />
      </div>
    </motion.div>
  );
}

function GroupLabel({ text, align }: { text: string; align?: 'right' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '0 14px',
      borderRight: align === 'right' ? 'none' : '1px solid var(--pl-chrome-border)',
      borderLeft: align === 'right' ? '1px solid var(--pl-chrome-border)' : 'none',
    }}>
      <span style={{
        fontFamily: panelFont.mono,
        fontSize: '0.44rem',
        letterSpacing: panelTracking.widest,
        fontWeight: 700,
        textTransform: 'uppercase',
        color: 'var(--pl-chrome-text-faint)',
        writingMode: 'vertical-rl',
        transform: align === 'right' ? 'rotate(180deg)' : 'rotate(180deg)',
        lineHeight: 1,
      }}>
        {text}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{
    width: 1, background: 'var(--pl-chrome-border)',
    margin: '8px 0',
  }} />;
}

function EditorDockBtn({
  tool, isActive, disabled, onClick,
}: {
  tool: Tool;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const Icon = tool.Icon;
  return (
    <RichTooltip
      label={tool.label}
      description={tool.description}
      shortcut={tool.shortcut}
      side="top"
    >
      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={!disabled ? { y: -1 } : {}}
        whileTap={!disabled ? { scale: 0.94 } : {}}
        style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '4px',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderRadius: '10px',
          padding: '7px 12px',
          background: isActive ? 'var(--pl-chrome-accent-soft)' : 'transparent',
          color: isActive
            ? 'var(--pl-chrome-accent-ink)'
            : 'var(--pl-chrome-text-muted)',
          opacity: disabled ? 0.3 : 1,
          transition: 'background 0.18s, color 0.18s',
        }}
      >
        <Icon size={16} strokeWidth={isActive ? 2.3 : 1.9} />
        <span style={{
          fontFamily: panelFont.mono,
          fontSize: '0.48rem',
          fontWeight: 700,
          letterSpacing: panelTracking.widest,
          textTransform: 'uppercase',
          lineHeight: 1,
        }}>
          {tool.label}
        </span>
      </motion.button>
    </RichTooltip>
  );
}
