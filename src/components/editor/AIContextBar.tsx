'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/AIContextBar.tsx
//
// Contextual AI action strip that slides in below the toolbar
// when a chapter is actively selected. Provides one-click access
// to AI rewrite, chapter navigation, and quick actions.
// Desktop-only (hidden when isMobile).
// ─────────────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';
import { useEditor } from '@/lib/editor-state';

export function AIContextBar() {
  const { state, dispatch, actions } = useEditor();
  const { activeId, chapters, isMobile, rewritingId } = state;

  // Only show on desktop when a chapter is active
  if (isMobile) return null;

  const activeIndex = chapters.findIndex(c => c.id === activeId);
  const activeChapter = activeIndex >= 0 ? chapters[activeIndex] : null;
  const isRewriting = activeChapter ? rewritingId === activeChapter.id : false;

  const prevChapter = activeIndex > 0 ? chapters[activeIndex - 1] : null;
  const nextChapter = activeIndex < chapters.length - 1 ? chapters[activeIndex + 1] : null;

  const navigatePrev = () => prevChapter && dispatch({ type: 'SET_ACTIVE_ID', id: prevChapter.id });
  const navigateNext = () => nextChapter && dispatch({ type: 'SET_ACTIVE_ID', id: nextChapter.id });

  return (
    <AnimatePresence>
      {activeChapter && (
        <motion.div
          key="ai-context-bar"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 36, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            flexShrink: 0,
            overflow: 'hidden',
            background: 'rgba(26,23,32,0.95)',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          <div style={{
            height: 36,
            display: 'flex', alignItems: 'center',
            padding: '0 12px', gap: '6px',
          }}>
            {/* Chapter nav arrows */}
            <motion.button
              onClick={navigatePrev}
              disabled={!prevChapter}
              title={prevChapter ? `← ${prevChapter.title}` : 'No previous chapter'}
              whileHover={prevChapter ? { backgroundColor: 'rgba(0,0,0,0.06)' } : {}}
              whileTap={prevChapter ? { scale: 0.88 } : {}}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 6, border: 'none',
                background: 'transparent',
                color: prevChapter ? 'rgba(214,198,168,0.55)' : 'rgba(214,198,168,0.18)',
                cursor: prevChapter ? 'pointer' : 'not-allowed',
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={13} />
            </motion.button>

            {/* Chapter breadcrumb */}
            <div style={{
              fontSize: '0.75rem', fontWeight: 600,
              color: 'var(--pl-ink-soft)',
              fontFamily: 'var(--pl-font-heading)',
              fontStyle: 'italic',
              letterSpacing: '-0.01em',
              maxWidth: '160px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {activeChapter.title || 'Untitled'}
            </div>

            <motion.button
              onClick={navigateNext}
              disabled={!nextChapter}
              title={nextChapter ? `${nextChapter.title} →` : 'No next chapter'}
              whileHover={nextChapter ? { backgroundColor: 'rgba(0,0,0,0.06)' } : {}}
              whileTap={nextChapter ? { scale: 0.88 } : {}}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 6, border: 'none',
                background: 'transparent',
                color: nextChapter ? 'rgba(214,198,168,0.55)' : 'rgba(214,198,168,0.18)',
                cursor: nextChapter ? 'pointer' : 'not-allowed',
                flexShrink: 0,
              }}
            >
              <ChevronRight size={13} />
            </motion.button>

            {/* Divider */}
            <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.06)', flexShrink: 0 }} />

            {/* AI action pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, overflow: 'hidden' }}>
              <AIActionPill
                label={isRewriting ? 'Rewriting…' : '✦ Rewrite'}
                onClick={() => activeChapter && actions.handleAIRewrite(activeChapter.id)}
                disabled={isRewriting}
                accent
              />
              <AIActionPill
                label="Edit in panel"
                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' })}
              />
              <AIActionPill
                label="Style"
                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' })}
              />
            </div>

            {/* Chapter position indicator */}
            <span style={{
              fontSize: '0.65rem', fontWeight: 600,
              color: 'var(--pl-muted)',
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}>
              {activeIndex + 1}/{chapters.length}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AIActionPill({
  label, onClick, disabled, accent,
}: {
  label: string; onClick: () => void; disabled?: boolean; accent?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? {
        backgroundColor: accent ? 'rgba(163,177,138,0.2)' : 'rgba(0,0,0,0.06)',
        color: accent ? '#A3B18A' : 'rgba(214,198,168,0.9)',
      } : {}}
      whileTap={!disabled ? { scale: 0.94 } : {}}
      transition={{ duration: 0.12 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '3px 9px', borderRadius: '100px',
        border: `1px solid ${accent ? 'rgba(163,177,138,0.2)' : 'rgba(0,0,0,0.06)'}`,
        background: accent ? 'rgba(163,177,138,0.1)' : 'rgba(163,177,138,0.05)',
        color: accent ? 'rgba(163,177,138,0.85)' : 'rgba(214,198,168,0.45)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '0.72rem', fontWeight: 700,
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        letterSpacing: '0.01em',
      }}
    >
      {label}
    </motion.button>
  );
}
