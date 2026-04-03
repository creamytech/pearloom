'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / MobileChapterEditor.tsx
// Full-screen chapter editor for mobile — push-navigation style.
// Slides in from right, auto-saves while typing (600 ms debounce),
// no competing gesture handlers, keyboard-aware.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Sparkles,
} from 'lucide-react';
import { useEditor } from '@/lib/editor-state';
import type { Chapter } from '@/types';

// Layout options matching Chapter['layout']
const LAYOUTS: Array<{
  id: NonNullable<Chapter['layout']>;
  label: string;
  glyph: string;
}> = [
  { id: 'editorial',  label: 'Editorial',  glyph: '▤' },
  { id: 'fullbleed',  label: 'Full Bleed', glyph: '▣' },
  { id: 'split',      label: 'Split',      glyph: '▥' },
  { id: 'cinematic',  label: 'Cinematic',  glyph: '▬' },
  { id: 'gallery',    label: 'Gallery',    glyph: '▦' },
  { id: 'mosaic',     label: 'Mosaic',     glyph: '▩' },
];

interface MobileChapterEditorProps {
  chapter: Chapter;
  onBack: () => void;
  onNavigate: (id: string) => void;
}

export function MobileChapterEditor({
  chapter,
  onBack,
  onNavigate,
}: MobileChapterEditorProps) {
  const { state, actions } = useEditor();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardPad, setKeyboardPad] = useState(0);

  // Keyboard avoidance via visualViewport API
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const kbH = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop ?? 0));
      setKeyboardPad(kbH > 80 ? kbH : 0);
    };
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => {
      vv.removeEventListener('resize', handler);
      vv.removeEventListener('scroll', handler);
    };
  }, []);

  // Debounced auto-save
  const scheduleUpdate = useCallback(
    (field: Partial<Chapter>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        actions.updateChapter(chapter.id, field);
      }, 600);
    },
    [actions, chapter.id],
  );

  // Clean up pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Adjacent chapter nav
  const chapters = state.chapters;
  const idx = chapters.findIndex(c => c.id === chapter.id);
  const prevChapter = idx > 0 ? chapters[idx - 1] : null;
  const nextChapter = idx < chapters.length - 1 ? chapters[idx + 1] : null;

  const isRewriting = state.rewritingId === chapter.id;
  const isStreaming = state.streamingChapterId === chapter.id && !!state.streamingText;
  const storyText = isStreaming
    ? (state.streamingText ?? '') + '▋'
    : chapter.description || '';

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.85 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#0F0C09',
        zIndex: 10,
        paddingBottom: keyboardPad,
      }}
    >
      {/* ── Chapter editor header ── */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 12px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(15,12,9,0.98)',
          paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        }}
      >
        {/* Back button */}
        <motion.button
          onClick={onBack}
          whileTap={{ scale: 0.88 }}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            borderRadius: 20,
            border: 'none',
            background: 'rgba(255,255,255,0.07)',
            color: 'rgba(214,198,168,0.75)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={14} />
          Chapters
        </motion.button>

        {/* Chapter title (truncated center) */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--eg-font-heading, "Playfair Display", serif)',
            fontStyle: 'italic',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'rgba(214,198,168,0.9)',
          }}
        >
          {chapter.title || 'Untitled'}
        </div>

        {/* Prev / Next navigation */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <motion.button
            onClick={() => prevChapter && onNavigate(prevChapter.id)}
            disabled={!prevChapter}
            whileTap={{ scale: 0.88 }}
            aria-label="Previous chapter"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.06)',
              color: prevChapter ? 'rgba(214,198,168,0.7)' : 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: prevChapter ? 'pointer' : 'default',
            }}
          >
            <ChevronLeft size={14} />
          </motion.button>
          <motion.button
            onClick={() => nextChapter && onNavigate(nextChapter.id)}
            disabled={!nextChapter}
            whileTap={{ scale: 0.88 }}
            aria-label="Next chapter"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.06)',
              color: nextChapter ? 'rgba(214,198,168,0.7)' : 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: nextChapter ? 'pointer' : 'default',
            }}
          >
            <ChevronRight size={14} />
          </motion.button>
        </div>
      </div>

      {/* ── Scrollable editing fields ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        <div
          style={{
            padding: '22px 18px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          {/* ── Title ── */}
          <div>
            <label style={labelStyle}>Title</label>
            <input
              key={`title-${chapter.id}`}
              defaultValue={chapter.title}
              onChange={e => scheduleUpdate({ title: e.target.value })}
              placeholder="Chapter title…"
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                outline: 'none',
                fontFamily: 'var(--eg-font-heading, "Playfair Display", serif)',
                fontSize: '1.5rem',
                fontWeight: 700,
                fontStyle: 'italic',
                color: 'rgba(245,241,232,0.95)',
                padding: '4px 0 10px',
                WebkitAppearance: 'none',
                boxSizing: 'border-box',
              } as React.CSSProperties}
            />
          </div>

          {/* ── Subtitle ── */}
          <div>
            <label style={labelStyle}>Subtitle</label>
            <input
              key={`subtitle-${chapter.id}`}
              defaultValue={chapter.subtitle || ''}
              onChange={e => scheduleUpdate({ subtitle: e.target.value })}
              placeholder="A quiet note…"
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                outline: 'none',
                fontFamily: 'var(--eg-font-heading, "Playfair Display", serif)',
                fontSize: '1.05rem',
                fontStyle: 'italic',
                color: 'rgba(214,198,168,0.72)',
                padding: '4px 0 10px',
                WebkitAppearance: 'none',
                boxSizing: 'border-box',
              } as React.CSSProperties}
            />
          </div>

          {/* ── Story text ── */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <label style={labelStyle}>Story</label>
              <motion.button
                onClick={() =>
                  actions.handleAIRewrite(chapter.id)
                }
                disabled={isRewriting || isStreaming}
                whileTap={{ scale: 0.9 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: '1px solid rgba(163,177,138,0.35)',
                  background: 'rgba(163,177,138,0.09)',
                  color:
                    isRewriting || isStreaming
                      ? 'rgba(163,177,138,0.4)'
                      : '#A3B18A',
                  cursor: isRewriting || isStreaming ? 'wait' : 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                }}
              >
                <Sparkles size={12} />
                {isRewriting || isStreaming ? 'Rewriting…' : '✦ Rewrite'}
              </motion.button>
            </div>
            <textarea
              key={`story-${chapter.id}`}
              defaultValue={chapter.description || ''}
              value={isStreaming ? storyText : undefined}
              onChange={e => {
                if (!isStreaming) scheduleUpdate({ description: e.target.value });
              }}
              readOnly={isRewriting || isStreaming}
              placeholder="Tell this chapter's story…"
              rows={9}
              style={{
                width: '100%',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.025)',
                outline: 'none',
                resize: 'none',
                fontFamily: 'var(--eg-font-body, Lora, Georgia, serif)',
                fontSize: '0.97rem',
                lineHeight: 1.75,
                color: 'rgba(245,241,232,0.82)',
                padding: '14px 16px',
                boxSizing: 'border-box',
                WebkitAppearance: 'none',
                transition: 'border-color 0.18s',
              } as React.CSSProperties}
            />
          </div>

          {/* ── Layout picker ── */}
          <div>
            <label style={labelStyle}>Layout</label>
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 4,
                scrollbarWidth: 'none',
              } as React.CSSProperties}
            >
              {LAYOUTS.map(({ id, label, glyph }) => {
                const active = (chapter.layout || 'editorial') === id;
                return (
                  <motion.button
                    key={id}
                    onClick={() => actions.updateChapter(chapter.id, { layout: id })}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '12px 14px',
                      borderRadius: 13,
                      border: active
                        ? '1px solid rgba(163,177,138,0.55)'
                        : '1px solid rgba(255,255,255,0.07)',
                      background: active
                        ? 'rgba(163,177,138,0.13)'
                        : 'rgba(255,255,255,0.03)',
                      color: active
                        ? '#A3B18A'
                        : 'rgba(255,255,255,0.38)',
                      cursor: 'pointer',
                      minWidth: 68,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{glyph}</span>
                    <span
                      style={{
                        fontSize: '0.63rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── Date ── */}
          <div>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              key={`date-${chapter.id}`}
              defaultValue={chapter.date?.slice(0, 10) || ''}
              onChange={e => scheduleUpdate({ date: e.target.value })}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.09)',
                background: 'rgba(255,255,255,0.03)',
                color: 'rgba(214,198,168,0.75)',
                fontSize: '0.88rem',
                outline: 'none',
                WebkitAppearance: 'none',
                boxSizing: 'border-box',
              } as React.CSSProperties}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Shared label style ──
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.62rem',
  fontWeight: 800,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.28)',
  marginBottom: 8,
};
