'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorToolbar.tsx — Ultra-minimal top bar
// Just: Exit ← | Page name | Save status | Publish
// Everything else lives in the rail or inline on the canvas
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, Command, Monitor, Tablet, Smartphone, Link, PanelRightClose, PanelRightOpen, Loader2 } from 'lucide-react';
import {
  UndoIcon, RedoIcon, PublishIcon, SavedIcon, UnsavedIcon,
} from '@/components/icons/EditorIcons';
import { RichTooltip } from '@/components/ui/tooltip';
import { buildSiteUrl } from '@/lib/site-urls';
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

  // Item 12: Debounce save-state flicker. The underlying saveState can toggle
  // rapidly between 'saved'/'unsaved' during typing + autosave cycles, causing
  // the indicator dot to visually flicker. We memoize a "displayed" state with
  // a 200ms floor so rapid toggles don't re-render.
  const [displayedSaveState, setDisplayedSaveState] = useState(saveState);
  const lastSaveFlipRef = useRef<number>(0);
  const pendingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const now = Date.now();
    const sinceLastFlip = now - lastSaveFlipRef.current;
    if (sinceLastFlip >= 200) {
      lastSaveFlipRef.current = now;
      setDisplayedSaveState(saveState);
    } else {
      if (pendingSaveTimerRef.current) clearTimeout(pendingSaveTimerRef.current);
      pendingSaveTimerRef.current = setTimeout(() => {
        lastSaveFlipRef.current = Date.now();
        setDisplayedSaveState(saveState);
      }, 200 - sinceLastFlip);
    }
    return () => {
      if (pendingSaveTimerRef.current) {
        clearTimeout(pendingSaveTimerRef.current);
        pendingSaveTimerRef.current = null;
      }
    };
  }, [saveState]);

  // Last undo label for descriptive tooltips (item 15)
  const lastUndoLabel = state.undoHistory?.[state.undoIndex]?.label;
  const nextRedoLabel = state.undoHistory?.[state.undoIndex + 1]?.label;

  // Item 18: Publish pre-flight — disable when site has no content at all
  // (no chapters, no events, no custom blocks). Uses manifest from useEditor().
  const publishDisabled =
    (manifest.chapters?.length ?? 0) === 0 &&
    (manifest.events?.length ?? 0) === 0 &&
    (manifest.blocks?.length ?? 0) === 0;

  const siteName = coupleNames[1]?.trim()
    ? `${coupleNames[0]} & ${coupleNames[1]}`
    : coupleNames[0] || 'Untitled Site';

  // Global Shift+/ (?) listener to open shortcuts modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      // Item 71: Robust Shift+? detection. Some non-US keyboard layouts
      // report e.key differently for '?' — accept e.code === 'Slash' + shift
      // as a fallback so the shortcut works everywhere.
      if (
        e.key === '?' ||
        (e.shiftKey && e.key === '/') ||
        (e.shiftKey && e.code === 'Slash')
      ) {
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
      background: '#FFFFFF',
      borderBottom: '1px solid #E4E4E7',
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
              background: 'transparent', color: '#71717A',
              cursor: 'pointer', fontSize: '0.65rem', fontWeight: 500,
            }}
          >
            <ArrowLeft size={14} />
          </motion.button>
        </RichTooltip>

        <span style={{
          fontSize: '0.8rem', fontWeight: 600,
          color: '#3F3F46',
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
          <div style={{ width: '1px', height: '16px', background: '#FAFAFA', margin: '0 4px' }} />
          <RichTooltip
            label={canUndo && lastUndoLabel ? `Undo: ${lastUndoLabel}` : 'Undo'}
            shortcut="⌘Z"
            side="bottom"
          >
            <ToolBtn onClick={actions.undo} disabled={!canUndo}>
              <UndoIcon size={13} />
            </ToolBtn>
          </RichTooltip>
          <RichTooltip
            label={canRedo && nextRedoLabel ? `Redo: ${nextRedoLabel}` : 'Redo'}
            shortcut="⌘⇧Z"
            side="bottom"
          >
            <ToolBtn onClick={actions.redo} disabled={!canRedo}>
              <RedoIcon size={13} />
            </ToolBtn>
          </RichTooltip>
          <div style={{ width: '1px', height: '16px', background: '#FAFAFA', margin: '0 4px' }} />
          <RichTooltip label="Quick actions" shortcut="⌘K" side="bottom">
            <ToolBtn onClick={() => dispatch({ type: 'SET_CMD_PALETTE', open: true })}>
              <Command size={12} />
            </ToolBtn>
          </RichTooltip>
        </div>
      )}

      {/* Right: Save + Preview + Help + Publish */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* Save indicator (uses debounced displayedSaveState to prevent flicker — item 12) */}
        <span style={{
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
          color: displayedSaveState === 'saved' ? '#18181B' : '#fb923c',
          display: 'flex', alignItems: 'center', gap: '3px',
        }}>
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: displayedSaveState === 'saved' ? '#18181B' : '#fb923c',
            animation: displayedSaveState === 'unsaved' ? 'pl-heartbeat 1.2s ease-in-out infinite' : 'none',
          }} />
          {!isMobile && (displayedSaveState === 'saved' ? 'Saved' : 'Unsaved')}
        </span>

        {/* Preview — item 104: brief 400ms loading state on click so users
            see feedback before the new tab opens. */}
        {!isMobile && <PreviewButton onClick={actions.storePreviewForOpen} />}

        {/* Toggle side panel (focus mode) */}
        {!isMobile && (
          <RichTooltip
            label={state.sidebarCollapsed ? 'Show panel' : 'Hide panel'}
            shortcut="⌘\\"
            side="bottom"
          >
            <ToolBtn onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR_COLLAPSED' })}>
              {state.sidebarCollapsed ? <PanelRightOpen size={13} /> : <PanelRightClose size={13} />}
            </ToolBtn>
          </RichTooltip>
        )}

        {/* Share */}
        {!isMobile && subdomain && (
          <RichTooltip label="Copy site link" side="bottom">
            <motion.button
              onClick={async () => {
                const url = buildSiteUrl(subdomain);
                try { await navigator.clipboard.writeText(url); } catch {}
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 14px',
                borderRadius: '8px', border: 'none',
                background: shareCopied ? '#4a9b8a' : '#18181B',
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

        {/* Draft / Live badge (item 17: explain what each state means) */}
        <RichTooltip
          label={publishedUrl
            ? 'This site is live and visible to guests.'
            : 'Draft — only you can see this site.'}
          side="bottom"
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '8px',
            fontSize: '0.58rem', fontWeight: 800,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            background: publishedUrl
              ? 'rgba(74,155,138,0.12)'
              : 'rgba(251,146,60,0.12)',
            color: publishedUrl
              ? '#4a9b8a'
              : '#fb923c',
            border: `1px solid ${publishedUrl ? 'rgba(74,155,138,0.25)' : 'rgba(251,146,60,0.25)'}`,
            cursor: 'default',
          }}>
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: publishedUrl ? '#4a9b8a' : '#fb923c',
            }} />
            {publishedUrl ? 'Live' : 'Draft'}
          </span>
        </RichTooltip>

        {/* Help — Keyboard shortcuts */}
        {!isMobile && (
          <RichTooltip label="Keyboard shortcuts" shortcut="?" side="bottom">
            <motion.button
              onClick={() => setShortcutsOpen(true)}
              whileHover={{ scale: 1.1, background: '#FFFFFF' }}
              whileTap={{ scale: 0.88 }}
              style={{
                width: '26px', height: '26px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', border: '1px solid rgba(0,0,0,0.08)',
                background: '#FAFAFA',
                color: '#71717A',
                cursor: 'pointer',
                fontSize: '0.65rem',
                fontWeight: 700,
                transition: 'border-color 0.15s',
              }}
            >
              <span style={{ lineHeight: 1, marginTop: '-1px' }}>?</span>
            </motion.button>
          </RichTooltip>
        )}

        {/* Publish (item 18: pre-flight — disable when there's nothing to publish) */}
        <RichTooltip
          label={publishDisabled
            ? 'Add a chapter, event, or block before publishing'
            : 'Publish & share your site'}
          side="bottom"
        >
          <motion.button
            onClick={() => { if (!publishDisabled) dispatch({ type: 'OPEN_PUBLISH' }); }}
            disabled={publishDisabled}
            whileHover={!publishDisabled ? { scale: 1.03 } : {}}
            whileTap={!publishDisabled ? { scale: 0.97 } : {}}
            className={publishDisabled ? undefined : 'pl-cta-pulse'}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: isMobile ? '6px 14px' : '6px 18px',
              borderRadius: '8px', border: 'none',
              background: publishDisabled ? '#A1A1AA' : '#18181B',
              color: '#fff',
              cursor: publishDisabled ? 'not-allowed' : 'pointer',
              opacity: publishDisabled ? 0.6 : 1,
              fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              boxShadow: publishDisabled ? 'none' : '0 2px 8px rgba(110,140,92,0.25)',
              transition: 'box-shadow 0.25s ease',
            }}
            onMouseEnter={(e) => {
              if (publishDisabled) return;
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px #E4E4E7, 0 2px 8px rgba(110,140,92,0.25)';
            }}
            onMouseLeave={(e) => {
              if (publishDisabled) return;
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

// ── Preview button with brief loading state (item 104) ─────
function PreviewButton({ onClick }: { onClick: () => void }) {
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  const handle = () => {
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLoading(false), 400);
    onClick();
  };
  return (
    <RichTooltip label="Preview your site" shortcut="⌘P" side="bottom">
      <ToolBtn onClick={handle} disabled={loading}>
        {loading ? (
          <span role="status" aria-label="Opening preview" style={{ display: 'inline-flex', position: 'relative' }}>
            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Opening preview…</span>
          </span>
        ) : (
          <Eye size={13} />
        )}
      </ToolBtn>
    </RichTooltip>
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
      whileHover={!disabled ? { scale: 1.1, background: '#FFFFFF' } : {}}
      whileTap={!disabled ? { scale: 0.88 } : {}}
      style={{
        width: '30px', height: '30px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '8px', border: 'none',
        background: 'transparent',
        color: disabled ? '#71717A' : '#3F3F46',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {children}
    </motion.button>
  );
}
