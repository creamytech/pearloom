'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorToolbar.tsx — Ultra-minimal top bar
// Just: Exit ← | Page name | Save status | Publish
// Everything else lives in the rail or inline on the canvas
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, Command, Monitor, Tablet, Smartphone, Link } from 'lucide-react';
import {
  UndoIcon, RedoIcon, PublishIcon, SavedIcon, UnsavedIcon,
} from '@/components/icons/EditorIcons';
import { RichTooltip } from '@/components/ui/tooltip';
import { useEditor } from '@/lib/editor-state';
import { KeyboardShortcuts } from './KeyboardShortcuts';

interface EditorToolbarProps {
  onExit: () => void;
}

export function EditorToolbar({ onExit }: EditorToolbarProps) {
  const { state, dispatch, actions, manifest, coupleNames } = useEditor();
  const { isMobile, canUndo, canRedo, saveState, subdomain, publishedUrl } = state;
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const siteName = coupleNames[1]?.trim()
    ? `${coupleNames[0]} & ${coupleNames[1]}`
    : coupleNames[0] || 'Untitled Site';

  // Global Shift+/ (?) listener to open shortcuts modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const closeShortcuts = useCallback(() => setShortcutsOpen(false), []);

  const deviceTooltips = {
    desktop: { label: 'Desktop view', shortcut: '⌘1' },
    tablet: { label: 'Tablet view', shortcut: '⌘2' },
    mobile: { label: 'Mobile view', shortcut: '⌘3' },
  } as const;

  return (
    <>
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
        <RichTooltip label="Exit editor" side="bottom">
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
        </RichTooltip>

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
            const tip = deviceTooltips[mode];
            return (
              <RichTooltip key={mode} label={tip.label} shortcut={tip.shortcut} side="bottom">
                <ToolBtn onClick={() => dispatch({ type: 'SET_DEVICE', device: mode })}>
                  <Icon size={13} style={{ opacity: state.device === mode ? 1 : 0.4 }} />
                </ToolBtn>
              </RichTooltip>
            );
          })}
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
          <RichTooltip label="Undo" shortcut="⌘Z" side="bottom">
            <ToolBtn onClick={actions.undo} disabled={!canUndo}>
              <UndoIcon size={13} />
            </ToolBtn>
          </RichTooltip>
          <RichTooltip label="Redo" shortcut="⌘⇧Z" side="bottom">
            <ToolBtn onClick={actions.redo} disabled={!canRedo}>
              <RedoIcon size={13} />
            </ToolBtn>
          </RichTooltip>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
          <RichTooltip label="Quick actions" shortcut="⌘K" side="bottom">
            <ToolBtn onClick={() => dispatch({ type: 'SET_CMD_PALETTE', open: true })}>
              <Command size={12} />
            </ToolBtn>
          </RichTooltip>
        </div>
      )}

      {/* Right: Save + Preview + Help + Publish */}
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
          <RichTooltip label="Preview your site" shortcut="⌘P" side="bottom">
            <ToolBtn onClick={actions.storePreviewForOpen}>
              <Eye size={13} />
            </ToolBtn>
          </RichTooltip>
        )}

        {/* Share */}
        {!isMobile && subdomain && (
          <RichTooltip label="Copy site link" side="bottom">
            <motion.button
              onClick={async () => {
                const url = `https://${subdomain}.pearloom.com`;
                try { await navigator.clipboard.writeText(url); } catch {}
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 14px',
                borderRadius: '100px', border: 'none',
                background: shareCopied ? 'var(--pl-olive)' : 'var(--pl-olive-deep)',
                color: '#fff', cursor: 'pointer',
                fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                transition: 'background 0.2s',
              }}
            >
              <Link size={12} />
              {shareCopied ? 'Link copied!' : 'Share'}
            </motion.button>
          </RichTooltip>
        )}

        {/* Draft / Live badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '3px 10px', borderRadius: '100px',
          fontSize: '0.58rem', fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          background: publishedUrl
            ? 'rgba(74,155,138,0.12)'
            : 'rgba(251,146,60,0.12)',
          color: publishedUrl
            ? '#4a9b8a'
            : '#fb923c',
          border: `1px solid ${publishedUrl ? 'rgba(74,155,138,0.25)' : 'rgba(251,146,60,0.25)'}`,
        }}>
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: publishedUrl ? '#4a9b8a' : '#fb923c',
          }} />
          {publishedUrl ? 'Live' : 'Draft'}
        </span>

        {/* Help — Keyboard shortcuts */}
        {!isMobile && (
          <RichTooltip label="Keyboard shortcuts" shortcut="?" side="bottom">
            <motion.button
              onClick={() => setShortcutsOpen(true)}
              whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.3)' }}
              whileTap={{ scale: 0.88 }}
              style={{
                width: '26px', height: '26px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', border: '1px solid rgba(0,0,0,0.08)',
                background: 'rgba(255,255,255,0.2)',
                color: 'var(--pl-muted)',
                cursor: 'pointer',
                fontSize: '0.68rem',
                fontWeight: 700,
                transition: 'border-color 0.15s',
              }}
            >
              <span style={{ lineHeight: 1, marginTop: '-1px' }}>?</span>
            </motion.button>
          </RichTooltip>
        )}

        {/* Publish */}
        <RichTooltip label="Publish & share your site" side="bottom">
          <motion.button
            onClick={() => dispatch({ type: 'OPEN_PUBLISH' })}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="pl-cta-pulse"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: isMobile ? '6px 14px' : '6px 18px',
              borderRadius: '100px', border: 'none',
              background: 'var(--pl-olive-deep)',
              color: '#fff', cursor: 'pointer',
              fontSize: '0.68rem', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              boxShadow: '0 2px 8px rgba(110,140,92,0.25)',
              transition: 'box-shadow 0.25s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(163,177,138,0.3), 0 2px 8px rgba(110,140,92,0.25)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(110,140,92,0.25)';
            }}
          >
            Publish
          </motion.button>
        </RichTooltip>
      </div>
    </div>

    {/* Keyboard shortcuts modal */}
    <KeyboardShortcuts open={shortcutsOpen} onClose={closeShortcuts} />
    </>
  );
}

// ── Tiny tool button ────────────────────────────────────────
function ToolBtn({ onClick, disabled, children }: {
  onClick: () => void; disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
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
