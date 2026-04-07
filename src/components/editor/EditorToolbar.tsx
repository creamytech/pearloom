'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorToolbar.tsx — Ultra-minimal top bar
// Just: Exit ← | Page name | Save status | Publish
// Everything else lives in the rail or inline on the canvas
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, Command, Monitor, Tablet, Smartphone } from 'lucide-react';
import {
  UndoIcon, RedoIcon, PublishIcon, SavedIcon, UnsavedIcon,
} from '@/components/icons/EditorIcons';
import { useEditor } from '@/lib/editor-state';

interface EditorToolbarProps {
  onExit: () => void;
}

export function EditorToolbar({ onExit }: EditorToolbarProps) {
  const { state, dispatch, actions, manifest, coupleNames } = useEditor();
  const { isMobile, canUndo, canRedo, saveState } = state;

  const siteName = coupleNames[1]?.trim()
    ? `${coupleNames[0]} & ${coupleNames[1]}`
    : coupleNames[0] || 'Untitled Site';

  return (
    <div style={{
      height: '40px', flexShrink: 0,
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      background: 'rgba(250,247,242,0.7)',
      backdropFilter: 'blur(32px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
      borderBottom: '1px solid rgba(255,255,255,0.3)',
      zIndex: 10,
    } as React.CSSProperties}>

      {/* Left: Exit + Site name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <motion.button
          onClick={onExit}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.92 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 8px', borderRadius: '8px', border: 'none',
            background: 'transparent', color: 'var(--pl-muted)',
            cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500,
          }}
        >
          <ArrowLeft size={14} />
        </motion.button>

        <span style={{
          fontSize: '0.82rem', fontWeight: 600,
          color: 'var(--pl-ink-soft)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: '200px',
        }}>
          {siteName}
        </span>
      </div>

      {/* Center: Device switcher + Undo/Redo + Cmd+K */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {/* Device switcher */}
          {(['desktop', 'tablet', 'mobile'] as const).map(mode => {
            const Icon = mode === 'desktop' ? Monitor : mode === 'tablet' ? Tablet : Smartphone;
            return (
              <ToolBtn key={mode} onClick={() => dispatch({ type: 'SET_DEVICE', device: mode })} title={`${mode} view`}>
                <Icon size={13} style={{ opacity: state.device === mode ? 1 : 0.4 }} />
              </ToolBtn>
            );
          })}
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
          <ToolBtn onClick={actions.undo} disabled={!canUndo} title="Undo (⌘Z)">
            <UndoIcon size={13} />
          </ToolBtn>
          <ToolBtn onClick={actions.redo} disabled={!canRedo} title="Redo (⌘⇧Z)">
            <RedoIcon size={13} />
          </ToolBtn>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
          <ToolBtn onClick={() => dispatch({ type: 'SET_CMD_PALETTE', open: true })} title="Command palette (⌘K)">
            <Command size={12} />
          </ToolBtn>
        </div>
      )}

      {/* Right: Save + Preview + Publish */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* Save indicator */}
        <span style={{
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em',
          color: saveState === 'saved' ? 'var(--pl-olive)' : '#fb923c',
          display: 'flex', alignItems: 'center', gap: '3px',
        }}>
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: saveState === 'saved' ? 'var(--pl-olive)' : '#fb923c',
            animation: saveState === 'unsaved' ? 'pl-heartbeat 1.2s ease-in-out infinite' : 'none',
          }} />
          {!isMobile && (saveState === 'saved' ? 'Saved' : 'Unsaved')}
        </span>

        {/* Preview */}
        {!isMobile && (
          <ToolBtn onClick={actions.storePreviewForOpen} title="Preview (⌘P)">
            <Eye size={13} />
          </ToolBtn>
        )}

        {/* Publish */}
        <motion.button
          onClick={() => dispatch({ type: 'OPEN_PUBLISH' })}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: isMobile ? '6px 14px' : '6px 18px',
            borderRadius: '100px', border: 'none',
            background: 'var(--pl-olive-deep)',
            color: '#fff', cursor: 'pointer',
            fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: '0 2px 8px rgba(110,140,92,0.25)',
          }}
        >
          Publish
        </motion.button>
      </div>
    </div>
  );
}

// ── Tiny tool button ────────────────────────────────────────
function ToolBtn({ onClick, disabled, title, children }: {
  onClick: () => void; disabled?: boolean; title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      title={title}
      whileHover={!disabled ? { scale: 1.1, background: 'rgba(255,255,255,0.3)' } : {}}
      whileTap={!disabled ? { scale: 0.88 } : {}}
      style={{
        width: '30px', height: '30px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '8px', border: 'none',
        background: 'transparent',
        color: disabled ? 'var(--pl-muted)' : 'var(--pl-ink-soft)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {children}
    </motion.button>
  );
}
