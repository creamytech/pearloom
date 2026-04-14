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
import { Palette, Sparkles, MoreHorizontal, Copy, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { useEditor } from '@/lib/editor-state';
import { InlineStylePicker } from './InlineStylePicker';

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
  const [styleOpen, setStyleOpen] = useState(false);
  const [styleAnchor, setStyleAnchor] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styleBtnRef = useRef<HTMLButtonElement>(null);
  // Live ref so the message handler can read the current value without
  // being recreated (mirrors the hideTimer pattern already in use).
  const styleOpenRef = useRef(false);
  useEffect(() => { styleOpenRef.current = styleOpen; }, [styleOpen]);

  // Listen for postMessage from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'SECTION_HOVER' && e.data.chapterId && e.data.rect) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setHovered({ chapterId: e.data.chapterId, rect: e.data.rect });
        setMoreOpen(false);
      }
      if (e.data?.type === 'SECTION_HOVER_OUT') {
        // Don't collapse while the inline style picker is open — the user
        // has moved their mouse off the section to interact with it.
        if (styleOpenRef.current) return;
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

  // Escape dismisses the hover toolbar. Deferred to the child popover
  // when it's open (InlineStylePicker already handles its own Escape).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (styleOpenRef.current) return; // let the picker close first
      setHovered(null);
      setMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (isMobile || !hovered) return null;

  const chapter = state.chapters.find(c => c.id === hovered.chapterId);
  const isRewriting = rewritingId === hovered.chapterId;

  // Position the toolbar centered above the hovered section
  const toolbarY = Math.max(0, hovered.rect.top - TOOLBAR_H - TOOLBAR_OFFSET);
  const toolbarCenterX = hovered.rect.left + hovered.rect.width / 2;

  const handleStyle = () => {
    dispatch({ type: 'SET_ACTIVE_ID', id: hovered.chapterId });
    // Anchor the picker to the Style button's current viewport rect, so it
    // stays in a predictable spot even if the toolbar re-positions.
    const rect = styleBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setStyleAnchor({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }
    setStyleOpen(true);
  };
  const closeStyle = () => {
    setStyleOpen(false);
    setStyleAnchor(null);
  };
  const handleAI = () => {
    if (hovered.chapterId) actions.handleAIRewrite(hovered.chapterId);
  };
  const handleDelete = () => {
    if (chapter && confirm(`Delete "${chapter.title}"?`)) {
      actions.deleteChapter(hovered.chapterId);
      setHovered(null);
    }
  };

  return (
    <>
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
            if (styleOpenRef.current) return;
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
            background: '#FFFFFF',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: '8px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.06)',
            overflow: 'visible',
            whiteSpace: 'nowrap',
          } as React.CSSProperties}
        >
          {/* Style */}
          <ToolbarBtn
            icon={<Palette size={12} />}
            label="Style"
            onClick={handleStyle}
            btnRef={styleBtnRef}
            isActive={styleOpen}
            trailing={<ChevronDown size={9} />}
          />
          <ToolbarDivider />

          {/* AI Rewrite — with dropdown for modes */}
          <div style={{ position: 'relative' }}>
            <ToolbarBtn
              icon={isRewriting
                ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                : <Sparkles size={12} />}
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

    {/* Inline style picker — replaces right-panel switch.
        Stays open independently of the toolbar hover lifecycle. */}
    <AnimatePresence>
      {styleOpen && styleAnchor && (
        <InlineStylePicker
          key="inline-style-picker"
          anchor={styleAnchor}
          onClose={closeStyle}
          onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }}
          onMouseLeave={() => {
            // Let Escape/outside-click drive dismissal; mirror toolbar pattern
            // by re-arming the hide timer for the toolbar itself.
            hideTimer.current = setTimeout(() => {
              if (!styleOpenRef.current) setHovered(null);
            }, 180);
          }}
        />
      )}
    </AnimatePresence>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────
function ToolbarBtn({
  icon, label, onClick, disabled, accent, btnRef, isActive, trailing,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  btnRef?: React.Ref<HTMLButtonElement>;
  /** When true, render the button in a pressed/active state (e.g. its
   *  associated popover is open). */
  isActive?: boolean;
  /** Optional trailing element after the label (e.g. a chevron caret). */
  trailing?: React.ReactNode;
}) {
  const baseColor = accent ? '#71717A' : '#3F3F46';
  const activeColor = accent ? '#52525B' : '#09090B';
  return (
    <motion.button
      ref={btnRef}
      onClick={onClick}
      disabled={disabled}
      title={label}
      whileHover={!disabled && !isActive ? {
        backgroundColor: accent ? 'rgba(24,24,27,0.08)' : 'rgba(0,0,0,0.06)',
        color: accent ? '#71717A' : '#18181B',
      } : {}}
      whileTap={!disabled ? { scale: 0.9 } : {}}
      transition={{ duration: 0.1 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '0 10px', height: TOOLBAR_H,
        border: 'none',
        background: isActive ? 'rgba(0,0,0,0.08)' : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: isActive ? activeColor : baseColor,
        fontSize: '0.7rem', fontWeight: 700,
        opacity: disabled ? 0.5 : 1,
        borderRadius: '8px',
        letterSpacing: '0.01em',
      }}
    >
      {icon}
      <span>{label}</span>
      {trailing}
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
        width: '100%', padding: '6px 10px', borderRadius: '8px',
        border: 'none', background: 'transparent', cursor: 'pointer',
        color: danger ? 'rgba(248,113,113,0.9)' : '#18181B',
        fontSize: '0.75rem', fontWeight: 600, textAlign: 'left',
      }}
    >
      {icon}
      {label}
    </motion.button>
  );
}
