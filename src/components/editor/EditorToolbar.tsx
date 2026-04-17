'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorToolbar.tsx — Editorial top bar
// Wave D: canvas-first chrome. 44px tall, design-token driven,
// light/dark via [data-theme]. Integrates ThemeToggle.
//
// Layout: Exit · Site name · | · device switcher · undo/redo · ⌘K
//         · save · preview · panel · share · status · theme · ?
//         · Publish
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Eye, Command, Monitor, Tablet, Smartphone, Link as LinkIcon,
  PanelRightClose, PanelRightOpen, Loader2,
} from 'lucide-react';
import {
  UndoIcon, RedoIcon,
} from '@/components/icons/EditorIcons';
import { RichTooltip } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/shell';
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

  // Debounce save-state flicker (200ms floor on toggles).
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

  const lastUndoLabel = state.undoHistory?.[state.undoIndex]?.label;
  const nextRedoLabel = state.undoHistory?.[state.undoIndex + 1]?.label;

  // Pre-flight: disable publish when nothing exists to publish.
  const publishDisabled =
    (manifest.chapters?.length ?? 0) === 0 &&
    (manifest.events?.length ?? 0) === 0 &&
    (manifest.blocks?.length ?? 0) === 0;

  const siteName = coupleNames[1]?.trim()
    ? `${coupleNames[0]} & ${coupleNames[1]}`
    : coupleNames[0] || 'Untitled site';

  // Shift+/ opens shortcuts; some keyboards report differently — accept code.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
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
      <div
        style={{
          height: 44,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          background: 'color-mix(in oklab, var(--pl-cream) 92%, transparent)',
          backdropFilter: 'saturate(140%) blur(14px)',
          WebkitBackdropFilter: 'saturate(140%) blur(14px)',
          borderBottom: '1px solid var(--pl-divider)',
          zIndex: 10,
          position: 'relative',
        }}
      >
        {/* Left: exit + wordmark + site name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <RichTooltip label="Back to dashboard" shortcut="Esc" side="bottom">
            <motion.button
              onClick={onExit}
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.94 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 10px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'var(--pl-muted)',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
            </motion.button>
          </RichTooltip>

          <span
            style={{
              fontFamily: 'var(--pl-font-display)',
              fontSize: '0.92rem',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: 'var(--pl-ink)',
              fontVariationSettings: '"opsz" 14, "SOFT" 60',
            }}
          >
            Pearloom
          </span>

          <span
            style={{
              width: 1,
              height: 16,
              background: 'var(--pl-divider)',
              margin: '0 4px',
            }}
          />

          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 500,
              color: 'var(--pl-ink-soft)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 220,
              fontFamily: 'var(--pl-font-display)',
              fontStyle: 'italic',
              fontVariationSettings: '"opsz" 12, "WONK" 1',
            }}
          >
            {siteName}
          </span>
        </div>

        {/* Center: device + undo/redo + ⌘K */}
        {!isMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {(['desktop', 'tablet', 'mobile'] as const).map((mode) => {
              const Icon = mode === 'desktop' ? Monitor : mode === 'tablet' ? Tablet : Smartphone;
              const tip = deviceTooltips[mode];
              const active = state.device === mode;
              return (
                <RichTooltip key={mode} label={tip.label} shortcut={tip.shortcut} side="bottom">
                  <ToolBtn onClick={() => dispatch({ type: 'SET_DEVICE', device: mode })} active={active}>
                    <Icon size={13} />
                  </ToolBtn>
                </RichTooltip>
              );
            })}

            <Divider />

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

            <Divider />

            <RichTooltip label="Quick actions" shortcut="⌘K" side="bottom">
              <ToolBtn onClick={() => dispatch({ type: 'SET_CMD_PALETTE', open: true })}>
                <Command size={12} />
              </ToolBtn>
            </RichTooltip>
          </div>
        )}

        {/* Right: save · preview · panel · share · status · theme · ? · Publish */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <SaveDot state={displayedSaveState} hideLabel={isMobile} />

          {!isMobile && <PreviewButton onClick={actions.storePreviewForOpen} />}

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

          {!isMobile && subdomain && (
            <RichTooltip label={publishedUrl ? 'Copy live site link' : 'Copy draft preview link (only you)'} side="bottom">
              <motion.button
                onClick={async () => {
                  const url = buildSiteUrl(subdomain, '', undefined, manifest?.occasion);
                  try {
                    await navigator.clipboard.writeText(url);
                  } catch {}
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--pl-divider)',
                  background: shareCopied
                    ? 'color-mix(in oklab, var(--pl-olive) 18%, transparent)'
                    : 'var(--pl-cream-card)',
                  color: shareCopied ? 'var(--pl-olive)' : 'var(--pl-ink-soft)',
                  cursor: 'pointer',
                  fontSize: '0.66rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
                }}
              >
                <LinkIcon size={11} />
                {shareCopied ? 'Copied' : 'Share'}
              </motion.button>
            </RichTooltip>
          )}

          <RichTooltip
            label={publishedUrl
              ? 'Live — guests can see this site.'
              : 'Draft — only you can see this site.'}
            side="bottom"
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 9px',
                borderRadius: 999,
                fontSize: '0.58rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                background: publishedUrl
                  ? 'color-mix(in oklab, var(--pl-olive) 12%, transparent)'
                  : 'color-mix(in oklab, var(--pl-gold) 14%, transparent)',
                color: publishedUrl ? 'var(--pl-olive)' : 'var(--pl-gold)',
                border: `1px solid ${
                  publishedUrl
                    ? 'color-mix(in oklab, var(--pl-olive) 28%, transparent)'
                    : 'color-mix(in oklab, var(--pl-gold) 32%, transparent)'
                }`,
                cursor: 'default',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: publishedUrl ? 'var(--pl-olive)' : 'var(--pl-gold)',
                }}
              />
              {publishedUrl ? 'Live' : 'Draft'}
            </span>
          </RichTooltip>

          {!isMobile && <ThemeToggle size="sm" />}

          {!isMobile && (
            <RichTooltip label="Keyboard shortcuts" shortcut="?" side="bottom">
              <motion.button
                onClick={() => setShortcutsOpen(true)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                style={{
                  width: 28,
                  height: 28,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  border: '1px solid var(--pl-divider)',
                  background: 'var(--pl-cream-card)',
                  color: 'var(--pl-muted)',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontFamily: 'var(--pl-font-display)',
                  fontStyle: 'italic',
                  fontVariationSettings: '"opsz" 12',
                }}
              >
                ?
              </motion.button>
            </RichTooltip>
          )}

          <RichTooltip
            label={publishDisabled
              ? 'Add a chapter, event, or block before publishing'
              : 'Publish & share your site'}
            side="bottom"
          >
            <motion.button
              onClick={() => {
                if (!publishDisabled) dispatch({ type: 'OPEN_PUBLISH' });
              }}
              disabled={publishDisabled}
              whileHover={!publishDisabled ? { y: -1 } : {}}
              whileTap={!publishDisabled ? { scale: 0.97 } : {}}
              className={publishDisabled ? undefined : 'pl-cta-pulse'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: isMobile ? '6px 14px' : '7px 18px',
                borderRadius: 999,
                border: 'none',
                background: publishDisabled ? 'var(--pl-muted-soft, var(--pl-divider))' : 'var(--pl-ink)',
                color: publishDisabled ? 'var(--pl-muted)' : 'var(--pl-cream)',
                cursor: publishDisabled ? 'not-allowed' : 'pointer',
                opacity: publishDisabled ? 0.6 : 1,
                fontSize: '0.66rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                boxShadow: publishDisabled
                  ? 'none'
                  : '0 2px 12px color-mix(in oklab, var(--pl-olive) 30%, transparent)',
                transition: 'box-shadow 0.25s ease, transform 0.2s ease',
              }}
            >
              Publish
            </motion.button>
          </RichTooltip>
        </div>
      </div>

      <KeyboardShortcuts open={shortcutsOpen} onClose={closeShortcuts} />
    </>
  );
}

// ── Save dot ────────────────────────────────────────────────
function SaveDot({ state, hideLabel }: { state: 'saved' | 'unsaved'; hideLabel?: boolean }) {
  const saved = state === 'saved';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: '0.6rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: saved ? 'var(--pl-ink-soft)' : 'var(--pl-gold)',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: saved ? 'var(--pl-olive)' : 'var(--pl-gold)',
          animation: saved ? 'none' : 'pl-heartbeat 1.2s ease-in-out infinite',
        }}
      />
      {!hideLabel && (saved ? 'Saved' : 'Unsaved')}
    </span>
  );
}

// ── Preview button with brief loading state ──────────────────
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
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              Opening preview…
            </span>
          </span>
        ) : (
          <Eye size={13} />
        )}
      </ToolBtn>
    </RichTooltip>
  );
}

// ── Tool button ──────────────────────────────────────────────
function ToolBtn({
  onClick, disabled, active, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.06 } : {}}
      whileTap={!disabled ? { scale: 0.9 } : {}}
      style={{
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        border: 'none',
        background: active ? 'color-mix(in oklab, var(--pl-olive) 14%, transparent)' : 'transparent',
        color: disabled
          ? 'var(--pl-muted)'
          : active
            ? 'var(--pl-olive)'
            : 'var(--pl-ink-soft)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
      }}
    >
      {children}
    </motion.button>
  );
}

// ── Vertical divider ─────────────────────────────────────────
function Divider() {
  return (
    <span
      style={{
        width: 1,
        height: 16,
        background: 'var(--pl-divider)',
        margin: '0 4px',
      }}
    />
  );
}
