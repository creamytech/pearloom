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
  panelLineHeight,
  panelTracking,
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
  { id: 'parallax', label: 'Parallax Scroll', desc: 'Full-bleed cinematic chapters that scroll past the camera', color: '#E4E4E7' },
  { id: 'filmstrip', label: 'Film Strip', desc: 'Horizontal photo strips with text below', color: 'rgba(60,50,70,0.4)' },
  { id: 'magazine', label: 'Magazine Spread', desc: 'Large hero photos with elegant text overlay', color: 'rgba(180,160,140,0.3)' },
  { id: 'timeline', label: 'Timeline Vine', desc: 'Vertical vine connecting alternating chapters', color: 'rgba(140,160,180,0.3)' },
  { id: 'kenburns', label: 'Ken Burns', desc: 'Animated pan-and-zoom over each chapter photo', color: 'rgba(200,180,160,0.3)' },
  { id: 'bento', label: 'Bento Grid', desc: 'Multi-photo scrapbook grid with notes', color: 'rgba(30,30,60,0.6)' },
] as const;

// ── Mood presets (mirrors ChapterPanel.tsx, kept local to avoid coupling) ─────
const MOOD_PRESETS = [
  { id: 'romantic',    label: 'Romantic',    color: '#E8927A' },
  { id: 'nostalgic',   label: 'Nostalgic',   color: '#C4A96A' },
  { id: 'joyful',      label: 'Joyful',      color: '#52525B' },
  { id: 'intimate',    label: 'Intimate',    color: '#6D597A' },
  { id: 'playful',     label: 'Playful',     color: '#7BA7BC' },
  { id: 'bittersweet', label: 'Bittersweet', color: '#8B7355' },
  { id: 'adventurous', label: 'Adventurous', color: '#4A9B8A' },
  { id: 'dramatic',    label: 'Dramatic',    color: '#4A3060' },
] as const;

// ── Inline mood chip + popover ─────────────────────────────────
function MoodChip({ mood, onSelect }: { mood?: string; onSelect: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activePreset = MOOD_PRESETS.find(m => m.id === mood?.toLowerCase());

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '3px 8px 3px 6px',
          borderRadius: '8px', border: '1px solid #E4E4E7',
          background: open ? '#F4F4F5' : '#FFFFFF',
          cursor: 'pointer', transition: 'background var(--pl-dur-instant)',
        }}
      >
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
          background: activePreset?.color ?? '#E4E4E7',
        }} />
        <span style={{
          fontSize: panelText.hint,
          fontWeight: panelWeight.semibold,
          color: '#3F3F46',
          whiteSpace: 'nowrap',
        }}>
          {activePreset?.label ?? 'Mood'}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
              zIndex: 200,
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              padding: '8px',
              display: 'flex', flexWrap: 'wrap', gap: '5px',
              width: '180px',
            } as React.CSSProperties}
          >
            {MOOD_PRESETS.map(m => (
              <button
                key={m.id}
                onClick={e => { e.stopPropagation(); onSelect(m.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '3px 7px', borderRadius: '6px', cursor: 'pointer',
                  border: mood?.toLowerCase() === m.id ? `1.5px solid ${m.color}` : '1px solid #E4E4E7',
                  background: mood?.toLowerCase() === m.id ? `${m.color}18` : 'transparent',
                  transition: 'background 0.1s, border 0.1s',
                }}
              >
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                <span style={{ fontSize: panelText.hint, fontWeight: panelWeight.semibold, color: '#3F3F46', whiteSpace: 'nowrap' }}>
                  {m.label}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chapter Card ──────────────────────────────────────────────
function ChapterCard({
  chapter, index, isActive, isExpanded, onSelect, onDelete, onUpdate,
  confirmDeleteId, onRequestDelete, onCancelDelete, registerRef,
}: {
  chapter: Chapter; index: number; isActive: boolean; isExpanded: boolean;
  onSelect: () => void; onDelete: () => void;
  onUpdate: (data: Partial<Chapter>) => void;
  confirmDeleteId: string | null;
  onRequestDelete: (id: string) => void;
  onCancelDelete: () => void;
  registerRef?: (id: string, el: HTMLDivElement | null) => void;
}) {
  const controls = useDragControls();
  const thumb = getThumb(chapter);
  const isConfirming = confirmDeleteId === chapter.id;
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (registerRef) registerRef(chapter.id, rowRef.current);
    return () => { if (registerRef) registerRef(chapter.id, null); };
  }, [chapter.id, registerRef]);

  return (
    <Reorder.Item
      value={chapter}
      id={chapter.id}
      dragListener={false}
      dragControls={controls}
      as="div"
      whileDrag={{ scale: 1.03, zIndex: 50, boxShadow: '0 16px 40px rgba(0,0,0,0.08)' }}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: '8px' }}
    >
      <motion.div
        ref={rowRef}
        onClick={isConfirming ? undefined : onSelect}
        whileHover={!isActive && !isConfirming ? { y: -1 } : {}}
        style={{
          borderRadius: '12px',
          background: isConfirming ? 'rgba(248,113,113,0.04)' : isActive ? 'rgba(24,24,27,0.04)' : '#FFFFFF',
          border: isConfirming ? '1.5px solid rgba(248,113,113,0.4)' : isActive ? '1.5px solid #18181B' : '1px solid #E4E4E7',
          overflow: 'hidden',
          cursor: isConfirming ? 'default' : 'pointer',
          transition: 'all var(--pl-dur-fast)',
          boxShadow: isConfirming ? '0 2px 8px rgba(248,113,113,0.08)' : isActive ? '0 2px 8px rgba(24,24,27,0.08)' : 'none',
        }}
      >
        {/* Main row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 12px 12px 8px' }}>
          {/* Drag handle */}
          <motion.div
            onPointerDown={e => { e.preventDefault(); e.stopPropagation(); controls.start(e); }}
            whileHover={{ color: '#18181B' }}
            style={{
              cursor: 'grab', padding: '6px 4px', display: 'flex', alignItems: 'center',
              color: 'rgba(0,0,0,0.15)', touchAction: 'none', userSelect: 'none', flexShrink: 0,
            }}
          >
            <GripVertical size={14} />
          </motion.div>

          {/* Chapter number */}
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
            background: isActive ? '#18181B' : '#F4F4F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: panelText.meta, fontWeight: panelWeight.bold,
            color: isActive ? '#FFFFFF' : '#71717A',
          }}>
            {index + 1}
          </div>

          {/* Thumbnail */}
          {thumb && (
            <div style={{
              width: '36px', height: '36px', borderRadius: '6px', flexShrink: 0,
              overflow: 'hidden', border: '1px solid #E4E4E7',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          {/* Title + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: panelText.itemTitle,
              fontWeight: panelWeight.semibold,
              fontFamily: 'inherit',
              color: '#18181B',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: panelLineHeight.tight,
            }}>
              {chapter.title || 'Untitled'}
            </div>
            <div style={{
              fontSize: panelText.hint,
              color: '#71717A',
              marginTop: '3px',
              display: 'flex', alignItems: 'center', gap: '5px',
              lineHeight: panelLineHeight.tight,
            }}>
              <Clock size={9} style={{ opacity: 0.6 }} />
              {slugDate(chapter.date)}
              {chapter.layout && (
                <span style={{
                  background: '#F4F4F5', color: '#71717A',
                  padding: '1px 6px', borderRadius: '4px',
                  fontSize: panelText.meta,
                  fontWeight: panelWeight.semibold,
                  letterSpacing: panelTracking.wide,
                  textTransform: 'uppercase',
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
            style={{ color: '#71717A', display: 'flex', padding: '4px' }}
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
              padding: '4px', borderRadius: '6px', border: 'none',
              background: 'transparent', color: '#71717A', cursor: 'pointer',
              display: 'flex', flexShrink: 0, opacity: 0.6,
            }}
          >
            <Trash2 size={12} />
          </motion.button>
        </div>

        {/* Quick style footer — mood picker when card is active */}
        <AnimatePresence>
          {isActive && !isConfirming && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'visible' }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px 8px',
                  borderTop: '1px solid #F4F4F5',
                }}
              >
                <span style={{
                  fontSize: panelText.meta,
                  fontWeight: panelWeight.bold,
                  color: '#A1A1AA',
                  textTransform: 'uppercase',
                  letterSpacing: panelTracking.wider,
                  flexShrink: 0,
                }}>
                  Mood
                </span>
                <MoodChip
                  mood={chapter.mood}
                  onSelect={m => onUpdate({ mood: m })}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  fontSize: panelText.body,
                  color: '#b91c1c',
                  fontWeight: panelWeight.semibold,
                  lineHeight: panelLineHeight.snug,
                }}>
                  Delete &ldquo;{chapter.title || 'Untitled'}&rdquo;? This can&apos;t be undone.
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={e => { e.stopPropagation(); onCancelDelete(); }}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: '8px',
                      border: '1px solid #E4E4E7', background: '#FFFFFF',
                      color: '#3F3F46',
                      fontSize: panelText.body,
                      fontWeight: panelWeight.semibold,
                      fontFamily: 'inherit',
                      cursor: 'pointer', transition: 'background var(--pl-dur-instant)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(); }}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: '8px',
                      border: 'none', background: '#ef4444',
                      color: '#fff',
                      fontSize: panelText.body,
                      fontWeight: panelWeight.bold,
                      fontFamily: 'inherit',
                      cursor: 'pointer', transition: 'background var(--pl-dur-instant)',
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
        padding: '10px 16px', borderRadius: '10px',
        background: '#18181B',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        color: '#fff',
        fontSize: panelText.body,
        fontWeight: panelWeight.medium,
        fontFamily: 'inherit',
        lineHeight: panelLineHeight.tight,
      } as React.CSSProperties}
    >
      <span>{message}</span>
      <button
        onClick={onUndo}
        style={{
          padding: '5px 12px', borderRadius: '6px', border: 'none',
          background: 'rgba(255,255,255,0.18)', color: '#fff',
          fontSize: panelText.hint,
          fontWeight: panelWeight.bold,
          fontFamily: 'inherit',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '4px',
          transition: 'background var(--pl-dur-instant)',
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

  // ── Auto-scroll active chapter row into view (Item #48) ──
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const registerRowRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const el = rowRefs.current.get(activeId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeId]);

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {STYLES.map(s => {
            const isActive = currentStoryLayout === s.id;
            return (
              <PanelChip
                key={s.id}
                active={isActive}
                onClick={() => actions.handleDesignChange({
                  ...manifest,
                  storyLayout: s.id as StoryManifest['storyLayout'],
                  layoutFormat: undefined,
                })}
                hint={s.desc}
                variant="tile"
                size="sm"
                fullWidth
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
                  onUpdate={(data) => actions.updateChapter(ch.id, data)}
                  confirmDeleteId={confirmDeleteId}
                  onRequestDelete={(id) => setConfirmDeleteId(id)}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                  registerRef={registerRowRef}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        ) : (
          /* FIX #1: Empty state for chapters */
          <div style={{
            padding: '20px 16px', textAlign: 'center',
            borderRadius: '12px',
            background: '#FAFAFA',
            border: '1.5px dashed #E4E4E7',
          }}>
            <div style={{
              fontSize: panelText.body,
              fontWeight: panelWeight.semibold,
              color: '#3F3F46',
              marginBottom: '4px',
              lineHeight: panelLineHeight.tight,
            }}>
              No chapters yet
            </div>
            <div style={{
              fontSize: panelText.hint,
              color: '#71717A',
              lineHeight: panelLineHeight.normal,
              marginBottom: '12px',
            }}>
              Add your first chapter to start telling your story.
            </div>
            {/* Item 89: prominent CTA so empty state is actionable */}
            <motion.button
              onClick={actions.addChapter}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '8px',
                background: '#18181B', color: '#FAFAFA',
                border: 'none', cursor: 'pointer',
                fontSize: panelText.body,
                fontWeight: panelWeight.semibold,
                fontFamily: 'inherit',
              }}
            >
              <Plus size={13} /> Add your first chapter
            </motion.button>
          </div>
        )}

        {/* Add chapter */}
        <motion.button
          onClick={actions.addChapter}
          whileHover={{ borderColor: '#A1A1AA', y: -1 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%', padding: '10px', marginTop: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            border: '1.5px dashed #E4E4E7', borderRadius: '10px',
            background: '#FAFAFA', cursor: 'pointer',
            color: '#18181B',
            fontSize: panelText.body,
            fontWeight: panelWeight.semibold,
            fontFamily: 'inherit',
            transition: 'all var(--pl-dur-instant)',
          }}
        >
          <Plus size={13} /> Add Chapter
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
              borderRadius: '12px',
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
            }}>
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
