'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / MobileChapterActionSheet.tsx
// Bottom sheet for editing a chapter on mobile — quick actions + inline fields
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Copy, Trash2, ArrowUp, ArrowDown, Sparkles, Loader2,
} from 'lucide-react';
import { LAYOUT_OPTS } from '@/components/editor/ChapterActions';
import type { Chapter } from '@/types';

interface MobileChapterActionSheetProps {
  chapter: Chapter | null;
  chapterIndex: number;
  chapterCount: number;
  isRewriting?: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Chapter>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onAIRewrite: (id: string) => void;
}

function proxyUrl(rawUrl: string, w: number, h: number): string {
  if (!rawUrl) return '';
  if (rawUrl.includes('googleusercontent.com'))
    return `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=${w}&h=${h}`;
  return rawUrl;
}

// ── Quick Action Button ─────────────────────────────────────────
function ActionBtn({
  icon, label, onClick, danger, disabled,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean;
}) {
  return (
    <motion.button
      aria-label={label}
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '10px 12px', borderRadius: 10, border: 'none', minWidth: 56,
        background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.04)',
        color: danger ? '#fca5a5' : 'var(--pl-ink)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        minHeight: 44,
        flexShrink: 0,
      }}
    >
      {icon}
      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </motion.button>
  );
}

// ── Field Label ─────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'var(--pl-muted, #9A9488)',
      marginBottom: 4, display: 'block',
    }}>
      {children}
    </label>
  );
}

// ── Input field (dark theme) ────────────────────────────────────
const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1.5px solid rgba(0,0,0,0.06)',
  background: 'var(--pl-olive-5)',
  color: 'var(--pl-ink)',
  fontSize: '15px', fontFamily: 'var(--pl-font-body)',
  outline: 'none', transition: 'border-color 0.15s',
};

const fieldFocusStyle: React.CSSProperties = {
  borderColor: 'var(--pl-olive, #A3B18A)',
  boxShadow: '0 0 0 3px var(--pl-olive-15)',
};

// ── Main Component ──────────────────────────────────────────────
export function MobileChapterActionSheet({
  chapter, chapterIndex, chapterCount, isRewriting,
  onClose, onUpdate, onDelete, onDuplicate, onMove, onAIRewrite,
}: MobileChapterActionSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const swipeStartY = useRef<number | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync local state when chapter changes
  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title || '');
      setSubtitle(chapter.subtitle || '');
      setDescription(chapter.description || '');
      setConfirmDelete(false);
    }
  }, [chapter?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard avoidance
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !sheetRef.current || !chapter) return;
    const handler = () => {
      if (!sheetRef.current) return;
      const kbHeight = window.innerHeight - vv.height;
      sheetRef.current.style.transform = kbHeight > 100 ? `translateY(-${kbHeight}px)` : '';
    };
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, [chapter]);

  const commitField = useCallback((field: string, value: string) => {
    if (!chapter) return;
    if (field === 'title' && value !== chapter.title) onUpdate(chapter.id, { title: value });
    if (field === 'subtitle' && value !== chapter.subtitle) onUpdate(chapter.id, { subtitle: value });
    if (field === 'description' && value !== chapter.description) onUpdate(chapter.id, { description: value });
  }, [chapter, onUpdate]);

  if (!chapter) return null;

  const thumb = chapter.images?.[0]?.url ? proxyUrl(chapter.images[0].url, 200, 200) : null;

  return (
    <AnimatePresence>
      <motion.div
        key="mobile-action-sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(43,30,20,0.08)', zIndex: 1200 }}
      />
      <motion.div
        key="mobile-action-sheet"
        ref={sheetRef}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onTouchStart={e => { swipeStartY.current = e.touches[0].clientY; }}
        onTouchEnd={e => {
          if (swipeStartY.current !== null) {
            const delta = e.changedTouches[0].clientY - swipeStartY.current;
            if (delta > 80) onClose();
            swipeStartY.current = null;
          }
        }}
        style={{
          position: 'fixed',
          bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          left: 0, right: 0,
          height: '65vh',
          zIndex: 1250,
          background: 'var(--pl-ink-soft, #3D3530)',
          borderRadius: '20px 20px 0 0',
          borderTop: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -12px 48px rgba(43,30,20,0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle + header */}
        <div style={{ flexShrink: 0, padding: '10px 16px 8px' }}>
          {/* Drag pill */}
          <div style={{
            width: 48, height: 4, borderRadius: 100,
            background: 'rgba(214,198,168,0.35)',
            margin: '0 auto 12px',
          }} />

          {/* Chapter header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" style={{
                width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0,
              }} />
            ) : (
              <div style={{
                width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                background: 'rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--pl-muted)', fontSize: '0.7rem', fontWeight: 700,
              }}>
                {chapterIndex + 1}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.95rem', fontWeight: 700,
                color: 'var(--pl-ink)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'var(--pl-font-heading)',
              }}>
                {chapter.title || 'Untitled'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--pl-ink-soft)' }}>
                Chapter {chapterIndex + 1} of {chapterCount}
              </div>
            </div>
            <button
              aria-label="Close"
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: 8, border: 'none',
                background: 'rgba(0,0,0,0.06)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--pl-ink-soft)', flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '8px 16px 24px',
          WebkitOverflowScrolling: 'touch',
          display: 'flex', flexDirection: 'column', gap: 16,
        } as React.CSSProperties}>

          {/* Quick Actions Row */}
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 4,
          } as React.CSSProperties}>
            <ActionBtn
              icon={<Copy size={16} />}
              label="Duplicate"
              onClick={() => { onDuplicate(chapter.id); onClose(); }}
            />
            <ActionBtn
              icon={isRewriting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              label="Rewrite"
              onClick={() => onAIRewrite(chapter.id)}
              disabled={isRewriting}
            />
            {chapterIndex > 0 && (
              <ActionBtn
                icon={<ArrowUp size={16} />}
                label="Move up"
                onClick={() => { onMove(chapter.id, 'up'); onClose(); }}
              />
            )}
            {chapterIndex < chapterCount - 1 && (
              <ActionBtn
                icon={<ArrowDown size={16} />}
                label="Move down"
                onClick={() => { onMove(chapter.id, 'down'); onClose(); }}
              />
            )}
            <ActionBtn
              icon={<Trash2 size={16} />}
              label={confirmDelete ? 'Confirm?' : 'Delete'}
              onClick={() => {
                if (confirmDelete) { onDelete(chapter.id); onClose(); }
                else setConfirmDelete(true);
              }}
              danger
            />
          </div>

          {/* Layout Picker */}
          <div>
            <FieldLabel>Layout</FieldLabel>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
            }}>
              {LAYOUT_OPTS.map((opt) => (
                <motion.button
                  key={opt.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onUpdate(chapter.id, { layout: opt.id })}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '10px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: chapter.layout === opt.id ? 'var(--pl-olive-20)' : 'var(--pl-olive-5)',
                    color: chapter.layout === opt.id ? 'var(--pl-olive)' : 'var(--pl-ink-soft)',
                    fontSize: '0.65rem', fontWeight: 600,
                    minHeight: 44,
                    outline: chapter.layout === opt.id ? '1.5px solid var(--pl-olive-40)' : '1.5px solid transparent',
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Editable Fields */}
          <div>
            <FieldLabel>Title</FieldLabel>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { commitField('title', title); setFocusedField(null); }}
              onFocus={() => setFocusedField('title')}
              placeholder="Chapter title"
              style={{
                ...fieldStyle,
                ...(focusedField === 'title' ? fieldFocusStyle : {}),
                fontFamily: 'var(--pl-font-heading)',
                fontWeight: 700,
                fontSize: '17px',
              }}
            />
          </div>

          <div>
            <FieldLabel>Subtitle</FieldLabel>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              onBlur={() => { commitField('subtitle', subtitle); setFocusedField(null); }}
              onFocus={() => setFocusedField('subtitle')}
              placeholder="A short subtitle..."
              style={{
                ...fieldStyle,
                ...(focusedField === 'subtitle' ? fieldFocusStyle : {}),
                fontStyle: 'italic',
              }}
            />
          </div>

          <div>
            <FieldLabel>Story</FieldLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => { commitField('description', description); setFocusedField(null); }}
              onFocus={() => setFocusedField('description')}
              placeholder="Tell this chapter's story..."
              rows={5}
              style={{
                ...fieldStyle,
                ...(focusedField === 'description' ? fieldFocusStyle : {}),
                resize: 'none',
                lineHeight: 1.7,
              }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
