'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/preview/CanvasChapterToolbar.tsx
//
// A floating dark pill toolbar that appears when hovering a
// chapter section on the main canvas (SiteRenderer). Replaces
// the old ChapterHoverBar (which only lived in PreviewPane).
//
// Layout: primary pill (Edit / Layout / AI) + secondary overflow
// pill (Duplicate / Move / Delete) revealed on hover of "···".
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Sparkles, Copy, ArrowUp, ArrowDown, Trash2, MoreHorizontal } from 'lucide-react';

export type ChapterToolbarAction =
  | 'edit'
  | 'duplicate'
  | 'moveUp'
  | 'moveDown'
  | 'delete'
  | 'aiRewrite'
  | { layout: string };

const LAYOUT_OPTS = [
  { id: 'parallax',  label: 'Parallax' },
  { id: 'filmstrip', label: 'Film Strip' },
  { id: 'magazine',  label: 'Magazine' },
  { id: 'timeline',  label: 'Timeline' },
  { id: 'kenburns',  label: 'Ken Burns' },
  { id: 'bento',     label: 'Bento' },
] as const;

interface CanvasChapterToolbarProps {
  /** bounding rect of the hovered chapter element */
  rect: DOMRect;
  chapterIndex: number;
  chapterCount: number;
  onAction: (action: ChapterToolbarAction) => void;
}

function ToolBtn({
  icon: Icon, label, danger, onClick,
}: {
  icon: React.ElementType; label: string; danger?: boolean; onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: '28px', height: '28px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: '8px',
        background: 'transparent',
        color: danger ? '#f87171' : 'rgba(255,255,255,0.85)',
        cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = danger
          ? 'rgba(248,113,113,0.18)'
          : 'rgba(255,255,255,0.12)';
      }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <Icon size={13} strokeWidth={2} />
    </button>
  );
}

export function CanvasChapterToolbar({ rect, chapterIndex, chapterCount, onAction }: CanvasChapterToolbarProps) {
  const [showMore, setShowMore] = useState(false);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false);
      if (layoutRef.current && !layoutRef.current.contains(e.target as Node)) setShowLayoutPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  // Position: top-right corner of the chapter rect
  const top = rect.top + 10;
  const right = window.innerWidth - rect.right + 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      onMouseDown={stop}
      onClick={stop}
      onMouseEnter={() => window.dispatchEvent(new CustomEvent('pearloom-chapter-hover-keep'))}
      style={{
        position: 'fixed',
        top,
        right,
        zIndex: 200,
        display: 'flex', alignItems: 'center', gap: '2px',
        padding: '3px 4px',
        borderRadius: '12px',
        background: '#18181B',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
    >
      {/* Primary actions: Edit removed — chapters are now edited inline on the canvas. */}

      {/* Layout picker */}
      <div ref={layoutRef} style={{ position: 'relative' }}>
        <ToolBtn
          icon={LayoutGrid}
          label="Change layout"
          onClick={() => { setShowLayoutPicker(v => !v); setShowMore(false); }}
        />
        <AnimatePresence>
          {showLayoutPicker && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: '#FFFFFF', borderRadius: '12px',
                border: '1px solid #E4E4E7',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                padding: '4px', minWidth: '128px',
                display: 'flex', flexDirection: 'column', gap: '1px',
                zIndex: 300,
              }}
            >
              {LAYOUT_OPTS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { onAction({ layout: opt.id }); setShowLayoutPicker(false); }}
                  style={{
                    padding: '6px 10px', borderRadius: '8px', border: 'none',
                    background: 'transparent', cursor: 'pointer',
                    fontSize: '0.72rem', fontWeight: 500,
                    color: '#18181B', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F4F4F5'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ToolBtn icon={Sparkles} label="AI rewrite" onClick={() => onAction('aiRewrite')} />

      {/* Divider */}
      <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />

      {/* Secondary overflow */}
      <div ref={moreRef} style={{ position: 'relative' }}>
        <ToolBtn
          icon={MoreHorizontal}
          label="More actions"
          onClick={() => { setShowMore(v => !v); setShowLayoutPicker(false); }}
        />
        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: '#FFFFFF', borderRadius: '12px',
                border: '1px solid #E4E4E7',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                padding: '4px', minWidth: '128px',
                display: 'flex', flexDirection: 'column', gap: '1px',
                zIndex: 300,
              }}
            >
              <MoreMenuItem icon={Copy} label="Duplicate" onClick={() => { onAction('duplicate'); setShowMore(false); }} />
              {chapterIndex > 0 && <MoreMenuItem icon={ArrowUp} label="Move up" onClick={() => { onAction('moveUp'); setShowMore(false); }} />}
              {chapterIndex < chapterCount - 1 && <MoreMenuItem icon={ArrowDown} label="Move down" onClick={() => { onAction('moveDown'); setShowMore(false); }} />}
              <div style={{ height: '1px', background: '#F4F4F5', margin: '3px 0' }} />
              <MoreMenuItem icon={Trash2} label="Delete" danger onClick={() => { onAction('delete'); setShowMore(false); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function MoreMenuItem({ icon: Icon, label, danger, onClick }: {
  icon: React.ElementType; label: string; danger?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 10px', borderRadius: '8px', border: 'none',
        background: 'transparent', cursor: 'pointer',
        fontSize: '0.72rem', fontWeight: 500,
        color: danger ? '#c0392b' : '#18181B',
        textAlign: 'left', fontFamily: 'inherit',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F4F4F5'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <Icon size={12} style={{ color: danger ? '#c0392b' : '#71717A', flexShrink: 0 }} />
      {label}
    </button>
  );
}
