'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/SectionHoverToolbar.tsx
//
// Floating glassmorphic toolbar that appears above a hovered
// section in the canvas preview. Receives postMessage events
// from the iframe with section rect data, then positions itself
// absolutely over the canvas.
//
// Message format from iframe:
//   { type: 'SECTION_HOVER', chapterId: string, rect: { top, left, width, height } }
//   { type: 'SECTION_HOVER_OUT' }  — to hide
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Palette, Sparkles, MoreHorizontal, Copy, Trash2 } from 'lucide-react';
import { useEditor } from '@/lib/editor-state';

interface HoverRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface HoverState {
  chapterId: string;
  rect: HoverRect;
}

const TOOLBAR_H = 38;
const TOOLBAR_OFFSET = 10; // px above the section top

export function SectionHoverToolbar() {
  const { state, dispatch, actions } = useEditor();
  const { isMobile, rewritingId } = state;
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for postMessage from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'SECTION_HOVER' && e.data.chapterId && e.data.rect) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setHovered({ chapterId: e.data.chapterId, rect: e.data.rect });
        setMoreOpen(false);
      }
      if (e.data?.type === 'SECTION_HOVER_OUT') {
        // Small delay to allow moving mouse to toolbar
        hideTimer.current = setTimeout(() => {
          setHovered(null);
          setMoreOpen(false);
        }, 180);
      }
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (isMobile || !hovered) return null;

  const chapter = state.chapters.find(c => c.id === hovered.chapterId);
  const isRewriting = rewritingId === hovered.chapterId;

  // Position the toolbar centered above the hovered section
  const toolbarY = Math.max(0, hovered.rect.top - TOOLBAR_H - TOOLBAR_OFFSET);
  const toolbarCenterX = hovered.rect.left + hovered.rect.width / 2;

  const handleEdit = () => {
    dispatch({ type: 'SET_ACTIVE_ID', id: hovered.chapterId });
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
  };
  const handleStyle = () => {
    dispatch({ type: 'SET_ACTIVE_ID', id: hovered.chapterId });
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' });
  };
  const handleAI = () => {
    if (hovered.chapterId) actions.handleAIRewrite(hovered.chapterId);
  };
  const handleDelete = () => {
    if (chapter && window.confirm(`Delete "${chapter.title}"?`)) {
      actions.deleteChapter(hovered.chapterId);
      setHovered(null);
    }
  };

  return (
    <AnimatePresence>
      {hovered && (
        <motion.div
          key={hovered.chapterId}
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }}
          onMouseLeave={() => {
            hideTimer.current = setTimeout(() => {
              setHovered(null);
              setMoreOpen(false);
            }, 180);
          }}
          style={{
            position: 'absolute',
            top: toolbarY,
            left: toolbarCenterX,
            transform: 'translateX(-50%)',
            zIndex: 50,
            display: 'flex', alignItems: 'center',
            height: TOOLBAR_H,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: '100px',
            boxShadow: '0 4px 24px rgba(43,30,20,0.1), 0 0 0 1px rgba(0,0,0,0.06)',
            overflow: 'visible',
            whiteSpace: 'nowrap',
          } as React.CSSProperties}
        >
          {/* Edit */}
          <ToolbarBtn
            icon={<Pencil size={12} />}
            label="Edit"
            onClick={handleEdit}
          />
          <ToolbarDivider />

          {/* Style */}
          <ToolbarBtn
            icon={<Palette size={12} />}
            label="Style"
            onClick={handleStyle}
          />
          <ToolbarDivider />

          {/* AI Rewrite — with dropdown for modes */}
          <div style={{ position: 'relative' }}>
            <ToolbarBtn
              icon={<Sparkles size={12} />}
              label={isRewriting ? 'Rewriting…' : 'AI Rewrite'}
              onClick={handleAI}
              disabled={isRewriting}
              accent
            />
          </div>
          <ToolbarDivider />

          {/* More (relative container for dropdown) */}
          <div style={{ position: 'relative' }}>
            <ToolbarBtn
              icon={<MoreHorizontal size={12} />}
              label="More"
              onClick={() => setMoreOpen(v => !v)}
            />

            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                    background: 'rgba(22,18,28,0.96)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                    padding: '4px',
                    minWidth: '130px',
                    zIndex: 60,
                  } as React.CSSProperties}
                >
                  <DropdownItem
                    icon={<Copy size={11} />}
                    label="Duplicate"
                    onClick={() => {
                      if (chapter) {
                        const newChapter = { ...chapter, id: `ch-${Date.now()}`, title: `${chapter.title} (copy)` };
                        dispatch({ type: 'SET_ACTIVE_ID', id: newChapter.id });
                      }
                      setMoreOpen(false);
                    }}
                  />
                  <DropdownItem
                    icon={<Trash2 size={11} />}
                    label="Delete"
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
  );
}

// ── Sub-components ─────────────────────────────────────────────
function ToolbarBtn({
  icon, label, onClick, disabled, accent,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; accent?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      title={label}
      whileHover={!disabled ? {
        backgroundColor: accent ? 'rgba(163,177,138,0.18)' : 'rgba(0,0,0,0.06)',
        color: accent ? '#A3B18A' : 'var(--pl-ink)',
      } : {}}
      whileTap={!disabled ? { scale: 0.9 } : {}}
      transition={{ duration: 0.1 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '0 10px', height: TOOLBAR_H,
        border: 'none', background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
        color: accent ? 'rgba(163,177,138,0.8)' : 'var(--pl-ink-soft)',
        fontSize: '0.7rem', fontWeight: 700,
        opacity: disabled ? 0.5 : 1,
        borderRadius: '100px',
        letterSpacing: '0.01em',
      }}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
}

function ToolbarDivider() {
  return <div style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.06)', flexShrink: 0 }} />;
}

function DropdownItem({
  icon, label, onClick, danger,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ backgroundColor: danger ? 'rgba(248,113,113,0.12)' : 'rgba(0,0,0,0.06)' }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        width: '100%', padding: '7px 10px', borderRadius: '8px',
        border: 'none', background: 'transparent', cursor: 'pointer',
        color: danger ? 'rgba(248,113,113,0.9)' : 'var(--pl-ink)',
        fontSize: '0.75rem', fontWeight: 600, textAlign: 'left',
      }}
    >
      {icon}
      {label}
    </motion.button>
  );
}
