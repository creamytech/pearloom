'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / StoryPanel.tsx — Organic glass chapter management
// Clean chapter cards, story style picker, inline editing
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { Plus, Trash2, Image, Clock, GripVertical, ChevronDown, Undo2, X } from 'lucide-react';
import { ChapterPanel } from './ChapterPanel';
import { slugDate } from './editor-utils';
import { useEditor } from '@/lib/editor-state';
import { layoutFormatToStoryLayout } from '@/components/blocks/StoryLayouts';
import {
  PanelRoot,
  PanelSection,
  PanelChip,
  panelText,
  panelWeight,
} from './panel';
import { Layout, BookOpen, Plus as PlusIcon } from 'lucide-react';
import type { StoryManifest, Chapter } from '@/types';

function getThumb(ch: Chapter) {
  const raw = ch.images?.[0]?.url || null;
  if (!raw) return null;
  if (raw.includes('googleusercontent.com')) {
    return `/api/photos/proxy?url=${encodeURIComponent(raw)}&w=200&h=200`;
  }
  return raw;
}

// ── Story Style Cards ─────────────────────────────────────────
// These values map 1:1 to the canonical `StoryLayoutType` in
// `src/components/blocks/StoryLayouts.tsx`. The StoryPanel and
// DesignPanel pickers both write to `manifest.storyLayout` so they
// never fight each other; legacy `manifest.layoutFormat` values are
// honored read-only via `resolveStoryLayout` for back-compat.
const STYLES = [
  { id: 'parallax', label: 'Parallax Scroll', desc: 'Full-bleed cinematic chapters that scroll past the camera', color: 'rgba(163,177,138,0.3)' },
  { id: 'filmstrip', label: 'Film Strip', desc: 'Horizontal photo strips with text below', color: 'rgba(60,50,70,0.4)' },
  { id: 'magazine', label: 'Magazine Spread', desc: 'Large hero photos with elegant text overlay', color: 'rgba(180,160,140,0.3)' },
  { id: 'timeline', label: 'Timeline Vine', desc: 'Vertical vine connecting alternating chapters', color: 'rgba(140,160,180,0.3)' },
  { id: 'kenburns', label: 'Ken Burns', desc: 'Animated pan-and-zoom over each chapter photo', color: 'rgba(200,180,160,0.3)' },
  { id: 'bento', label: 'Bento Grid', desc: 'Multi-photo scrapbook grid with notes', color: 'rgba(30,30,60,0.6)' },
] as const;

// ── Chapter Card ──────────────────────────────────────────────
function ChapterCard({
  chapter, index, isActive, isExpanded, onSelect, onDelete,
  confirmDeleteId, onRequestDelete, onCancelDelete,
}: {
  chapter: Chapter; index: number; isActive: boolean; isExpanded: boolean;
  onSelect: () => void; onDelete: () => void;
  confirmDeleteId: string | null;
  onRequestDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  const controls = useDragControls();
  const thumb = getThumb(chapter);
  const isConfirming = confirmDeleteId === chapter.id;

  return (
    <Reorder.Item
      value={chapter}
      id={chapter.id}
      dragListener={false}
      dragControls={controls}
      as="div"
      whileDrag={{ scale: 1.03, zIndex: 50, boxShadow: '0 16px 40px rgba(43,30,20,0.12)' }}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: '8px' }}
    >
      <motion.div
        onClick={isConfirming ? undefined : onSelect}
        whileHover={!isActive && !isConfirming ? { y: -1 } : {}}
        style={{
          borderRadius: '16px',
          background: isConfirming ? 'rgba(248,113,113,0.04)' : isActive ? 'rgba(163,177,138,0.1)' : 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: isConfirming ? '1.5px solid rgba(248,113,113,0.4)' : isActive ? '1.5px solid rgba(163,177,138,0.35)' : '1px solid rgba(255,255,255,0.3)',
          overflow: 'hidden',
          cursor: isConfirming ? 'default' : 'pointer',
          transition: 'all 0.2s',
          boxShadow: isConfirming
            ? '0 4px 16px rgba(248,113,113,0.08)'
            : isActive
              ? '0 4px 16px rgba(163,177,138,0.1), inset 0 1px 0 rgba(255,255,255,0.3)'
              : '0 1px 4px rgba(43,30,20,0.03), inset 0 1px 0 rgba(255,255,255,0.2)',
        } as React.CSSProperties}
      >
        {/* Main row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 12px 12px 8px' }}>
          {/* Drag handle */}
          <motion.div
            onPointerDown={e => { e.preventDefault(); e.stopPropagation(); controls.start(e); }}
            whileHover={{ color: 'var(--pl-olive)' }}
            style={{
              cursor: 'grab', padding: '6px 4px', display: 'flex', alignItems: 'center',
              color: 'rgba(0,0,0,0.15)', touchAction: 'none', userSelect: 'none', flexShrink: 0,
            }}
          >
            <GripVertical size={14} />
          </motion.div>

          {/* Chapter number */}
          <div style={{
            width: '24px', height: '24px', borderRadius: '12px', flexShrink: 0,
            background: isActive ? 'var(--pl-olive)' : 'rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.62rem', fontWeight: 800,
            color: isActive ? 'white' : 'var(--pl-muted)',
            border: isActive ? 'none' : '1px solid rgba(255,255,255,0.3)',
          }}>
            {index + 1}
          </div>

          {/* Thumbnail */}
          {thumb && (
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
              overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          {/* Title + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.85rem', fontWeight: 600,
              fontFamily: 'var(--pl-font-heading)',
              color: 'var(--pl-ink)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}>
              {chapter.title || 'Untitled'}
            </div>
            <div style={{
              fontSize: '0.65rem', color: 'var(--pl-muted)', marginTop: '2px',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <Clock size={9} style={{ opacity: 0.6 }} />
              {slugDate(chapter.date)}
              {chapter.layout && (
                <span style={{
                  background: 'rgba(163,177,138,0.1)', color: 'var(--pl-olive)',
                  padding: '0 5px', borderRadius: '8px', fontSize: '0.55rem', fontWeight: 600,
                }}>
                  {chapter.layout}
                </span>
              )}
            </div>
          </div>

          {/* Expand chevron */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: 'var(--pl-muted)', display: 'flex', padding: '4px' }}
          >
            <ChevronDown size={14} />
          </motion.div>

          {/* Delete */}
          <motion.button
            onClick={e => {
              e.stopPropagation();
              onRequestDelete(chapter.id);
            }}
            whileHover={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}
            whileTap={{ scale: 0.88 }}
            style={{
              padding: '6px', borderRadius: '12px', border: 'none',
              background: 'transparent', color: 'var(--pl-muted)', cursor: 'pointer',
              display: 'flex', flexShrink: 0, opacity: 0.6,
            }}
          >
            <Trash2 size={12} />
          </motion.button>
        </div>

        {/* Inline delete confirmation */}
        <AnimatePresence>
          {isConfirming && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                padding: '10px 12px 12px',
                borderTop: '1px solid rgba(248,113,113,0.2)',
                display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                <div style={{
                  fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600, lineHeight: 1.4,
                }}>
                  Delete &ldquo;{chapter.title || 'Untitled'}&rdquo;? This can&apos;t be undone.
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={e => { e.stopPropagation(); onCancelDelete(); }}
                    style={{
                      flex: 1, padding: '7px 12px', borderRadius: '10px',
                      border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.5)',
                      color: 'var(--pl-ink-soft)', fontSize: '0.75rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(); }}
                    style={{
                      flex: 1, padding: '7px 12px', borderRadius: '10px',
                      border: 'none', background: '#ef4444',
                      color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Reorder.Item>
  );
}

// ── Undo Toast ───────────────────────────────────────────────
function UndoToast({ message, onUndo, onDismiss }: { message: string; onUndo: () => void; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 16px', borderRadius: '14px',
        background: 'rgba(30,25,20,0.92)', backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        color: '#fff', fontSize: '0.82rem', fontWeight: 500,
      } as React.CSSProperties}
    >
      <span>{message}</span>
      <button
        onClick={onUndo}
        style={{
          padding: '4px 12px', borderRadius: '8px', border: 'none',
          background: 'rgba(255,255,255,0.18)', color: '#fff',
          fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '4px',
          transition: 'background 0.15s',
        }}
        onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.28)'; }}
        onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; }}
      >
        <Undo2 size={12} /> Undo
      </button>
      <button
        onClick={onDismiss}
        style={{
          padding: '4px', borderRadius: '6px', border: 'none',
          background: 'transparent', color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer', display: 'flex',
        }}
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

// ── Main StoryPanel ───────────────────────────────────────────
export function StoryPanel() {
  const { state, dispatch, actions, manifest } = useEditor();
  const { chapters, activeId, rewritingId, sectionOverridesMap, streamingText, streamingChapterId, alternatesLoadingId, chapterAlternates } = state;
  const activeChapter = chapters.find(c => c.id === activeId) || null;

  // Inline confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Undo toast state
  const [deletedChapter, setDeletedChapter] = useState<{ chapter: Chapter; index: number } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeleteChapter = useCallback((id: string) => {
    const idx = chapters.findIndex(ch => ch.id === id);
    const chapter = chapters[idx];
    if (!chapter) return;

    // Store for undo
    setDeletedChapter({ chapter, index: idx });
    setConfirmDeleteId(null);

    // Perform deletion
    actions.deleteChapter(id);

    // Clear any existing undo timer
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setDeletedChapter(null), 5000);
  }, [chapters, actions]);

  const handleUndo = useCallback(() => {
    if (!deletedChapter) return;
    const { chapter, index } = deletedChapter;
    // Re-insert chapter at original position
    const next = [...chapters];
    next.splice(Math.min(index, next.length), 0, chapter);
    dispatch({ type: 'SET_CHAPTERS', chapters: next });
    dispatch({ type: 'SET_ACTIVE_ID', id: chapter.id });
    actions.syncManifest(next);
    setDeletedChapter(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, [deletedChapter, chapters, dispatch, actions]);

  const dismissUndo = useCallback(() => {
    setDeletedChapter(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, []);

  const handleShowAlternates = async () => {
    if (!activeChapter) return;
    dispatch({ type: 'SET_ALTERNATES_LOADING', id: activeChapter.id });
    try {
      const res = await fetch('/api/rewrite/alternates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeChapter.title, description: activeChapter.description,
          mood: activeChapter.mood, vibeString: manifest.vibeString, occasion: manifest.occasion,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        dispatch({ type: 'SET_CHAPTER_ALTERNATES', id: activeChapter.id, alternates: data.alternates });
      }
    } finally {
      dispatch({ type: 'SET_ALTERNATES_LOADING', id: null });
    }
  };

  const currentStoryLayout = (manifest.storyLayout
    || layoutFormatToStoryLayout(manifest.layoutFormat)) as string;

  return (
    <PanelRoot>
      <PanelSection title="Story Style" icon={Layout}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {STYLES.map(s => {
            const isActive = currentStoryLayout === s.id;
            return (
              <PanelChip
                key={s.id}
                active={isActive}
                onClick={() => actions.handleDesignChange({
                  ...manifest,
                  // Write to the unified field and clear the legacy one so
                  // saved drafts can't drift back to a stale value.
                  storyLayout: s.id as StoryManifest['storyLayout'],
                  layoutFormat: undefined,
                })}
                hint={s.desc}
                variant="tile"
                size="md"
                fullWidth={false}
              >
                {s.label}
              </PanelChip>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection
        title="Chapters"
        icon={BookOpen}
        badge={chapters.length}
        card={false}
      >
        <div>{/* Chapter list */}
        {chapters.length > 0 ? (
          <Reorder.Group axis="y" values={chapters} onReorder={actions.handleReorder} as="div" style={{ margin: 0, padding: 0 }}>
            <AnimatePresence>
              {chapters.map((ch, i) => (
                <ChapterCard
                  key={ch.id}
                  chapter={ch}
                  index={i}
                  isActive={activeId === ch.id}
                  isExpanded={activeId === ch.id}
                  onSelect={() => dispatch({ type: 'SET_ACTIVE_ID', id: activeId === ch.id ? null : ch.id })}
                  onDelete={() => handleDeleteChapter(ch.id)}
                  confirmDeleteId={confirmDeleteId}
                  onRequestDelete={(id) => setConfirmDeleteId(id)}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        ) : (
          /* FIX #1: Empty state for chapters */
          <div style={{
            padding: '24px 16px', textAlign: 'center',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px dashed rgba(163,177,138,0.25)',
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--pl-ink-soft)', marginBottom: '4px' }}>
              No chapters yet
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', lineHeight: 1.5 }}>
              Add your first chapter to start telling your story.
            </div>
          </div>
        )}

        {/* Add chapter */}
        <motion.button
          onClick={actions.addChapter}
          whileHover={{ borderColor: 'rgba(163,177,138,0.5)', y: -1 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%', padding: '12px', marginTop: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            border: '1.5px dashed rgba(163,177,138,0.3)', borderRadius: '16px',
            background: 'transparent', cursor: 'pointer',
            color: 'var(--pl-olive)', fontSize: '0.75rem', fontWeight: 600,
            transition: 'all 0.15s',
          }}
        >
          <Plus size={14} /> Add Chapter
        </motion.button>
      </div>

      {/* ── Inline chapter editor ── */}
      <AnimatePresence mode="popLayout">
        {activeChapter && (
          <motion.div
            key={activeChapter.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden', padding: '0 10px' }}
          >
            <div style={{
              marginTop: '12px', padding: '16px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.25)',
            } as React.CSSProperties}>
              <ChapterPanel
                chapter={activeChapter}
                onUpdate={actions.updateChapter}
                onAIRewrite={actions.handleAIRewrite}
                isRewriting={rewritingId === activeChapter.id}
                vibeSkin={manifest.vibeSkin}
                vibeString={manifest.vibeString}
                sectionOverrides={sectionOverridesMap[activeChapter.id]}
                streamingText={streamingChapterId === activeChapter.id ? streamingText : null}
                onOverridesChange={(id, overrides) => {
                  dispatch({ type: 'SET_SECTION_OVERRIDES', id, overrides });
                  actions.updateChapter(id, { styleOverrides: { backgroundColor: overrides.backgroundColor, textColor: overrides.textColor, padding: overrides.padding } });
                }}
                onShowAlternates={handleShowAlternates}
                isLoadingAlternates={alternatesLoadingId === activeChapter.id}
                alternates={chapterAlternates[activeChapter.id]}
                onSelectAlternate={(desc) => {
                  actions.updateChapter(activeChapter.id, { description: desc });
                  dispatch({ type: 'SET_CHAPTER_ALTERNATES', id: activeChapter.id, alternates: [] });
                }}
                onCloseAlternates={() => dispatch({ type: 'SET_CHAPTER_ALTERNATES', id: activeChapter.id, alternates: [] })}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </PanelSection>

      {/* ── Undo toast ── */}
      <AnimatePresence>
        {deletedChapter && (
          <UndoToast
            key="undo-toast"
            message="Chapter deleted"
            onUndo={handleUndo}
            onDismiss={dismissUndo}
          />
        )}
      </AnimatePresence>
    </PanelRoot>
  );
}
