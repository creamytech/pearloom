'use client';

// -----------------------------------------------------------------
// Pearloom / editor/CanvasContextMenu.tsx
// Glassmorphic right-click context menu for the canvas area.
// Appears on contextmenu event, positioned at the cursor.
// Framer-motion scale+opacity entrance, dismiss on Escape or
// click-outside. Delegates actions to editor state.
// -----------------------------------------------------------------

import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  ClipboardPaste,
  CopyPlus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Settings,
  CheckSquare,
  Palette,
} from 'lucide-react';
import { useEditor } from '@/lib/editor-state';
import { ConfirmDialog } from './ConfirmDialog';
import { logEditorError } from '@/lib/editor-log';

// ---- Menu item type -------------------------------------------

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  action: () => void;
}

interface Separator {
  id: string;
  separator: true;
}

type MenuEntry = MenuItem | Separator;

function isSeparator(entry: MenuEntry): entry is Separator {
  return 'separator' in entry && entry.separator === true;
}

// ---- Component ------------------------------------------------

interface CanvasContextMenuProps {
  /** The parent container element where contextmenu events are listened */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function CanvasContextMenu({ containerRef }: CanvasContextMenuProps) {
  const { state, dispatch, actions } = useEditor();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredChapterId, setHoveredChapterId] = useState<string | null>(null);
  // Accessible confirm dialog state — replaces native confirm() (item 83)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Track which chapter the mouse is near (via postMessage from iframe)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'SECTION_HOVER' && e.data.chapterId) {
        setHoveredChapterId(e.data.chapterId);
      }
      if (e.data?.type === 'SECTION_HOVER_OUT') {
        // Don't clear immediately -- keep for right-click
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const close = useCallback(() => setPosition(null), []);

  // ---- Right-click handler ------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = (e: MouseEvent) => {
      e.preventDefault();

      // Position relative to the container
      const rect = container.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      // Ensure menu stays within viewport
      const menuW = 220;
      const menuH = 380;
      if (x + menuW > rect.width) x = rect.width - menuW - 8;
      if (y + menuH > rect.height) y = rect.height - menuH - 8;
      if (x < 8) x = 8;
      if (y < 8) y = 8;

      setPosition({ x, y });
    };

    container.addEventListener('contextmenu', handler);
    return () => container.removeEventListener('contextmenu', handler);
  }, [containerRef]);

  // ---- Escape / click-outside ---------------------------------

  useEffect(() => {
    if (!position) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [position, close]);

  // ---- Build menu entries based on current state ---------------

  const activeChapterId = state.activeId || hoveredChapterId;
  const activeChapter = activeChapterId
    ? state.chapters.find((c) => c.id === activeChapterId)
    : null;

  const chapterIndex = activeChapter
    ? state.chapters.findIndex((c) => c.id === activeChapter.id)
    : -1;

  const entries: MenuEntry[] = [
    {
      id: 'copy',
      label: 'Copy Block',
      icon: Copy,
      shortcut: '\u2318C',
      disabled: !activeChapter,
      action: () => {
        if (activeChapter) {
          try {
            const data = JSON.stringify(activeChapter);
            navigator.clipboard.writeText(data);
          } catch (err) {
            logEditorError('CanvasContextMenu: copy chapter to clipboard', err);
          }
        }
        close();
      },
    },
    {
      id: 'paste',
      label: 'Paste Block',
      icon: ClipboardPaste,
      shortcut: '\u2318V',
      action: async () => {
        try {
          const text = await navigator.clipboard.readText();
          const parsed = JSON.parse(text);
          if (parsed && parsed.id && parsed.title) {
            const newId = `ch-${Date.now()}`;
            const copy = {
              ...parsed,
              id: newId,
              title: `${parsed.title} (pasted)`,
              order: state.chapters.length,
            };
            const next = [...state.chapters, copy];
            dispatch({ type: 'SET_CHAPTERS', chapters: next });
            dispatch({ type: 'SET_ACTIVE_ID', id: newId });
            actions.syncManifest(next);
          }
        } catch (err) {
          logEditorError('CanvasContextMenu: paste chapter from clipboard', err);
        }
        close();
      },
    },
    {
      id: 'duplicate',
      label: 'Duplicate Block',
      icon: CopyPlus,
      shortcut: '\u2318D',
      disabled: !activeChapter,
      action: () => {
        if (activeChapter) {
          const newId = `ch-${Date.now()}`;
          const copy = {
            ...activeChapter,
            id: newId,
            title: `${activeChapter.title} (copy)`,
            order: (activeChapter.order ?? 0) + 0.5,
          };
          const next = [...state.chapters, copy].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0),
          );
          dispatch({ type: 'SET_CHAPTERS', chapters: next });
          dispatch({ type: 'SET_ACTIVE_ID', id: newId });
          actions.syncManifest(next);
        }
        close();
      },
    },
    {
      id: 'delete',
      label: 'Delete Block',
      icon: Trash2,
      shortcut: 'Del',
      danger: true,
      disabled: !activeChapter,
      action: () => {
        if (activeChapter) {
          // Defer delete until the ConfirmDialog confirms — item 83.
          setPendingDeleteId(activeChapter.id);
        }
        close();
      },
    },
    { id: 'sep1', separator: true },
    {
      id: 'move-up',
      label: 'Move Up',
      icon: ArrowUp,
      disabled: !activeChapter || chapterIndex <= 0,
      action: () => {
        if (activeChapter && chapterIndex > 0) {
          const sorted = [...state.chapters].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0),
          );
          const idx = sorted.findIndex((c) => c.id === activeChapter.id);
          if (idx > 0) {
            [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
            const reordered = sorted.map((c, i) => ({ ...c, order: i }));
            dispatch({ type: 'SET_CHAPTERS', chapters: reordered });
            actions.syncManifest(reordered);
          }
        }
        close();
      },
    },
    {
      id: 'move-down',
      label: 'Move Down',
      icon: ArrowDown,
      disabled:
        !activeChapter || chapterIndex >= state.chapters.length - 1,
      action: () => {
        if (activeChapter && chapterIndex < state.chapters.length - 1) {
          const sorted = [...state.chapters].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0),
          );
          const idx = sorted.findIndex((c) => c.id === activeChapter.id);
          if (idx >= 0 && idx < sorted.length - 1) {
            [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
            const reordered = sorted.map((c, i) => ({ ...c, order: i }));
            dispatch({ type: 'SET_CHAPTERS', chapters: reordered });
            actions.syncManifest(reordered);
          }
        }
        close();
      },
    },
    { id: 'sep2', separator: true },
    {
      id: 'toggle-visibility',
      label: 'Hide/Show Chapter',
      icon: EyeOff,
      disabled: !activeChapter,
      action: () => {
        // Chapters don't have a `visible` property — this is a no-op placeholder
        close();
      },
    },
    {
      id: 'edit-settings',
      label: 'Edit Block Settings',
      icon: Settings,
      disabled: !activeChapter,
      action: () => {
        if (activeChapter) {
          // Chapters are *creative* sections — per the no-auto-tab-switch
          // pivot (commit 5f5521a) we inline-edit on canvas instead of
          // force-switching to the Story panel. Select the block and fire
          // the inline-popover events; the editor canvas listens for
          // `pearloom-select-block` and `pearloom-block-config-open`.
          dispatch({ type: 'SET_ACTIVE_ID', id: activeChapter.id });
          const detail: { blockType: string; blockId: string } = {
            blockType: 'chapter',
            blockId: activeChapter.id,
          };
          window.dispatchEvent(new CustomEvent('pearloom-select-block', { detail }));
          // Best-effort: anchor the popover to the chapter's DOM node if
          // we can find it. If not, the select event alone still opens
          // the inline toolbar / layout switcher.
          const el = document.querySelector(`[data-block-id="${activeChapter.id}"]`);
          const rect = el?.getBoundingClientRect();
          if (rect) {
            window.dispatchEvent(new CustomEvent('pearloom-block-config-open', {
              detail: { ...detail, rect },
            }));
          }
        }
        close();
      },
    },
    {
      id: 'open-in-panel',
      label: 'Open in panel \u2192',
      icon: Settings,
      disabled: !activeChapter,
      action: () => {
        // Opt-in escape hatch for users who prefer the full-width Story
        // panel over inline editing. Explicit label so it's no longer the
        // default behavior for right-click.
        if (activeChapter) {
          dispatch({ type: 'SET_ACTIVE_ID', id: activeChapter.id });
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
        }
        close();
      },
    },
    { id: 'sep3', separator: true },
    {
      id: 'select-all',
      label: 'Select All Blocks',
      icon: CheckSquare,
      shortcut: '\u2318A',
      action: () => {
        const ids = state.chapters.map((c) => c.id);
        dispatch({ type: 'SET_SELECTED_BLOCKS', ids });
        close();
      },
    },
    { id: 'sep4', separator: true },
    {
      id: 'accent-color',
      label: 'Change Accent Color',
      icon: Palette,
      action: () => {
        dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' });
        dispatch({ type: 'SET_CONTEXT_SECTION', section: 'palette' });
        close();
      },
    },
  ];

  const pendingChapter = pendingDeleteId
    ? state.chapters.find(c => c.id === pendingDeleteId)
    : null;

  return (
    <>
    <ConfirmDialog
      open={!!pendingDeleteId}
      title={pendingChapter ? `Delete "${pendingChapter.title}"?` : 'Delete chapter?'}
      message="This cannot be undone."
      confirmLabel="Delete"
      onConfirm={() => {
        if (pendingDeleteId) actions.deleteChapter(pendingDeleteId);
        setPendingDeleteId(null);
      }}
      onCancel={() => setPendingDeleteId(null)}
    />
    <AnimatePresence>
      {position && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            position: 'absolute',
            top: position.y,
            left: position.x,
            zIndex: 200,
            minWidth: '210px',
            padding: '4px',
            borderRadius: '12px',
            background: 'var(--pl-glass-heavy)',
            backdropFilter: 'var(--pl-glass-blur)',
            WebkitBackdropFilter: 'var(--pl-glass-blur)',
            border: '1px solid var(--pl-glass-light-border)',
            boxShadow:
              'var(--pl-glass-shadow-lg)',
          } as React.CSSProperties}
        >
          {entries.map((entry) => {
            if (isSeparator(entry)) {
              return (
                <div
                  key={entry.id}
                  style={{
                    height: '1px',
                    background: 'var(--pl-black-6)',
                    margin: '4px 8px',
                  }}
                />
              );
            }

            const Icon = entry.icon;
            return (
              <motion.button
                key={entry.id}
                onClick={entry.disabled ? undefined : entry.action}
                whileHover={
                  !entry.disabled
                    ? {
                        backgroundColor: entry.danger
                          ? 'rgba(248,113,113,0.08)'
                          : 'rgba(24,24,27,0.06)',
                      }
                    : {}
                }
                whileTap={!entry.disabled ? { scale: 0.98 } : {}}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: entry.disabled ? 'default' : 'pointer',
                  color: entry.disabled
                    ? 'rgba(0,0,0,0.2)'
                    : entry.danger
                      ? 'rgba(220,80,80,0.85)'
                      : '#3F3F46',
                  fontSize: 'var(--pl-text-sm)',
                  fontWeight: 600,
                  textAlign: 'left',
                  opacity: entry.disabled ? 0.45 : 1,
                }}
              >
                <Icon size={13} />
                <span style={{ flex: 1 }}>{entry.label}</span>
                {entry.shortcut && (
                  <span
                    style={{
                      fontSize: 'var(--pl-text-2xs)',
                      fontWeight: 500,
                      color: '#71717A',
                      letterSpacing: '0.04em',
                      opacity: 0.6,
                    }}
                  >
                    {entry.shortcut}
                  </span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
