'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/SectionHoverToolbar.tsx
//
// Editorial hover toolbar — floats above the hovered section on
// the canvas. Cream paper surface, gold hairline, Fraunces italic
// labels on the More menu, mono-tracked button captions. Broadcast
// stays the same: postMessage { type: 'SECTION_HOVER', rect, ... }.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from 'react';
import {
  announceInlineToolbar,
  onInlineToolbarActivated,
} from './inline-toolbar-bus';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Sparkles, MoreHorizontal, Copy, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { useEditor } from '@/lib/editor-state';
import { InlineStylePicker } from './InlineStylePicker';
import { ConfirmDialog } from './ConfirmDialog';
import { makeId } from '@/lib/editor-ids';
import { panelFont, panelTracking } from './panel';

interface HoverRect { top: number; left: number; width: number; height: number; }
interface HoverState { chapterId: string; rect: HoverRect; }

const TOOLBAR_H = 40;
const TOOLBAR_OFFSET = 12;

export function SectionHoverToolbar() {
  const { state, dispatch, actions } = useEditor();
  const { isMobile, rewritingId } = state;
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [styleAnchor, setStyleAnchor] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styleBtnRef = useRef<HTMLButtonElement>(null);
  const styleOpenRef = useRef(false);
  useEffect(() => { styleOpenRef.current = styleOpen; }, [styleOpen]);

  useEffect(() => {
    // Only announce to the mutex bus on a fresh reveal (null → chapter)
    // or chapter switch — announcing every SECTION_HOVER tick was thrashing
    // the rewrite chip off the screen.
    let lastAnnouncedChapter: string | null = null;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'SECTION_HOVER' && e.data.chapterId && e.data.rect) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setHovered({ chapterId: e.data.chapterId, rect: e.data.rect });
        setMoreOpen(false);
        if (lastAnnouncedChapter !== e.data.chapterId) {
          announceInlineToolbar('section');
          lastAnnouncedChapter = e.data.chapterId;
        }
      }
      if (e.data?.type === 'SECTION_HOVER_OUT') {
        if (styleOpenRef.current) return;
        hideTimer.current = setTimeout(() => {
          setHovered(null);
          setMoreOpen(false);
          lastAnnouncedChapter = null;
        }, 180);
      }
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (styleOpenRef.current) return;
      setHovered(null);
      setMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Hide when any other inline toolbar activates.
  useEffect(() => {
    return onInlineToolbarActivated((id) => {
      if (id === 'section') return;
      if (styleOpenRef.current) return;
      setHovered(null);
      setMoreOpen(false);
    });
  }, []);

  if (isMobile || !hovered) return null;

  const chapter = state.chapters.find(c => c.id === hovered.chapterId);
  const isRewriting = rewritingId === hovered.chapterId;

  const toolbarY = Math.max(0, hovered.rect.top - TOOLBAR_H - TOOLBAR_OFFSET);
  const toolbarCenterX = hovered.rect.left + hovered.rect.width / 2;

  const handleStyle = () => {
    dispatch({ type: 'SET_ACTIVE_ID', id: hovered.chapterId });
    const rect = styleBtnRef.current?.getBoundingClientRect();
    if (rect) setStyleAnchor({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    setStyleOpen(true);
  };
  const closeStyle = () => { setStyleOpen(false); setStyleAnchor(null); };
  const handleAI = () => { if (hovered.chapterId) actions.handleAIRewrite(hovered.chapterId); };
  const handleDelete = () => { if (chapter) setConfirmDelete(true); };
  const performDelete = () => {
    if (hovered?.chapterId) actions.deleteChapter(hovered.chapterId);
    setConfirmDelete(false);
    setHovered(null);
  };

  return (
    <>
    <AnimatePresence>
      {hovered && (
        <motion.div
          key={hovered.chapterId}
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
          onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }}
          onMouseLeave={() => {
            if (styleOpenRef.current) return;
            hideTimer.current = setTimeout(() => { setHovered(null); setMoreOpen(false); }, 180);
          }}
          style={{
            position: 'absolute',
            top: toolbarY,
            left: toolbarCenterX,
            transform: 'translateX(-50%)',
            zIndex: 50,
            display: 'flex', alignItems: 'center',
            height: TOOLBAR_H,
            padding: '0 4px',
            background: 'var(--pl-chrome-surface)',
            border: '1px solid var(--pl-chrome-border)',
            borderRadius: 'var(--pl-radius-lg)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.10), 0 0 0 3px color-mix(in srgb, var(--pl-chrome-accent) 10%, transparent)',
            overflow: 'visible',
            whiteSpace: 'nowrap',
          } as React.CSSProperties}
        >
          {/* Gold hairline top edge — signature editorial rule */}
          <div style={{
            position: 'absolute', top: '-1px', left: '12px', right: '12px',
            height: '1px', background: 'var(--pl-chrome-accent)', opacity: 0.55,
            borderRadius: 'var(--pl-radius-xs)',
            pointerEvents: 'none',
          }} />

          <ToolbarBtn
            icon={<Palette size={12} />}
            label="Style"
            onClick={handleStyle}
            btnRef={styleBtnRef}
            isActive={styleOpen}
            trailing={<ChevronDown size={9} strokeWidth={2.5} />}
          />
          <ToolbarDivider />

          <ToolbarBtn
            icon={isRewriting
              ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              : <Sparkles size={12} />}
            label={isRewriting ? 'Rewriting' : 'Pear'}
            onClick={handleAI}
            disabled={isRewriting}
            accent
          />
          <ToolbarDivider />

          <div style={{ position: 'relative' }}>
            <ToolbarBtn
              icon={<MoreHorizontal size={12} />}
              label="More"
              onClick={() => setMoreOpen(v => !v)}
              isActive={moreOpen}
            />

            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'var(--pl-chrome-surface)',
                    border: '1px solid var(--pl-chrome-border)',
                    borderRadius: 'var(--pl-radius-lg)',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.14)',
                    padding: '5px',
                    minWidth: '150px',
                    zIndex: 60,
                  } as React.CSSProperties}
                >
                  {/* Gold rule at the top */}
                  <div style={{
                    fontFamily: panelFont.mono,
                    fontSize: '0.48rem',
                    letterSpacing: panelTracking.widest,
                    textTransform: 'uppercase',
                    color: 'var(--pl-chrome-accent-ink)',
                    padding: '6px 10px 5px',
                    borderBottom: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 30%, transparent)',
                    marginBottom: '3px',
                  }}>
                    Section Actions
                  </div>
                  <DropdownItem
                    icon={<Copy size={11} />}
                    label="Duplicate"
                    kicker="copy + append"
                    onClick={() => {
                      if (chapter) {
                        const newChapter = { ...chapter, id: makeId('ch'), title: `${chapter.title} (copy)` };
                        dispatch({ type: 'SET_ACTIVE_ID', id: newChapter.id });
                      }
                      setMoreOpen(false);
                    }}
                  />
                  <DropdownItem
                    icon={<Trash2 size={11} />}
                    label="Delete"
                    kicker="cannot undo"
                    onClick={handleDelete}
                    danger
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {styleOpen && styleAnchor && (
        <InlineStylePicker
          key="inline-style-picker"
          anchor={styleAnchor}
          onClose={closeStyle}
          onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }}
          onMouseLeave={() => {
            hideTimer.current = setTimeout(() => {
              if (!styleOpenRef.current) setHovered(null);
            }, 180);
          }}
        />
      )}
    </AnimatePresence>

    <ConfirmDialog
      open={confirmDelete}
      title={chapter ? `Delete "${chapter.title}"?` : 'Delete chapter?'}
      message="This cannot be undone."
      confirmLabel="Delete"
      onConfirm={performDelete}
      onCancel={() => setConfirmDelete(false)}
    />
    </>
  );
}

function ToolbarBtn({
  icon, label, onClick, disabled, accent, btnRef, isActive, trailing,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  btnRef?: React.Ref<HTMLButtonElement>;
  isActive?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <motion.button
      ref={btnRef}
      onClick={onClick}
      disabled={disabled}
      title={label}
      whileHover={!disabled && !isActive ? {
        backgroundColor: 'var(--pl-chrome-bg)',
      } : {}}
      whileTap={!disabled ? { scale: 0.94 } : {}}
      transition={{ duration: 0.14 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '0 12px', height: TOOLBAR_H - 8,
        margin: '4px 0',
        border: 'none',
        background: isActive ? 'var(--pl-chrome-accent-soft)' : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: isActive
          ? 'var(--pl-chrome-accent-ink)'
          : accent
            ? 'var(--pl-chrome-accent-ink)'
            : 'var(--pl-chrome-text)',
        fontFamily: panelFont.mono,
        fontSize: '0.56rem',
        fontWeight: 700,
        letterSpacing: panelTracking.widest,
        textTransform: 'uppercase',
        opacity: disabled ? 0.5 : 1,
        borderRadius: '7px',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      <span>{label}</span>
      {trailing}
    </motion.button>
  );
}

function ToolbarDivider() {
  return <div style={{ width: 1, height: 18, background: 'var(--pl-chrome-border)', flexShrink: 0 }} />;
}

function DropdownItem({
  icon, label, kicker, onClick, danger,
}: {
  icon: React.ReactNode; label: string; kicker?: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{
        backgroundColor: danger
          ? 'color-mix(in srgb, var(--pl-chrome-danger) 10%, transparent)'
          : 'var(--pl-chrome-bg)',
      }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        width: '100%', padding: '8px 10px',
        borderRadius: '7px',
        border: 'none', background: 'transparent', cursor: 'pointer',
        color: danger ? 'var(--pl-chrome-danger)' : 'var(--pl-chrome-text)',
        textAlign: 'left',
      }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20,
        color: danger ? 'var(--pl-chrome-danger)' : 'var(--pl-chrome-text-muted)',
      }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>
        <span style={{
          display: 'block',
          fontFamily: panelFont.display,
          fontStyle: 'italic',
          fontSize: '0.78rem',
          color: danger ? 'var(--pl-chrome-danger)' : 'var(--pl-chrome-text)',
          lineHeight: 1.1,
        }}>
          {label}
        </span>
        {kicker && (
          <span style={{
            display: 'block',
            fontFamily: panelFont.mono,
            fontSize: '0.44rem',
            letterSpacing: panelTracking.wider,
            textTransform: 'uppercase',
            color: 'var(--pl-chrome-text-faint)',
            marginTop: '2px',
          }}>
            {kicker}
          </span>
        )}
      </span>
    </motion.button>
  );
}
