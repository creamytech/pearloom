'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / StoryPanel.tsx — Organic glass chapter management
// Clean chapter cards, story style picker, inline editing
// ─────────────────────────────────────────────────────────────

import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { Plus, Trash2, Image, Clock, GripVertical, ChevronDown } from 'lucide-react';
import { ChapterPanel } from './ChapterPanel';
import { slugDate } from './editor-utils';
import { useEditor } from '@/lib/editor-state';
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
const STYLES = [
  { id: 'cascade', label: 'Flowing Timeline', desc: 'Photos and text alternate down the page', color: 'rgba(163,177,138,0.3)' },
  { id: 'filmstrip', label: 'Film Strip', desc: 'Horizontal photo strips with text below', color: 'rgba(60,50,70,0.4)' },
  { id: 'magazine', label: 'Magazine Spread', desc: 'Large hero photos with elegant text overlay', color: 'rgba(180,160,140,0.3)' },
  { id: 'scrapbook', label: 'Scrapbook', desc: 'Scattered photos with handwritten-style notes', color: 'rgba(200,180,160,0.3)' },
  { id: 'chapters', label: 'Chapter Book', desc: 'Each story section as a distinct chapter page', color: 'rgba(140,160,180,0.3)' },
  { id: 'starmap', label: 'Star Map', desc: 'Celestial-themed timeline with constellation connections', color: 'rgba(30,30,60,0.6)' },
] as const;

// ── Chapter Card ──────────────────────────────────────────────
function ChapterCard({
  chapter, index, isActive, isExpanded, onSelect, onDelete,
}: {
  chapter: Chapter; index: number; isActive: boolean; isExpanded: boolean;
  onSelect: () => void; onDelete: () => void;
}) {
  const controls = useDragControls();
  const thumb = getThumb(chapter);

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
        onClick={onSelect}
        whileHover={!isActive ? { y: -1 } : {}}
        style={{
          borderRadius: '16px',
          background: isActive ? 'rgba(163,177,138,0.1)' : 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: isActive ? '1.5px solid rgba(163,177,138,0.35)' : '1px solid rgba(255,255,255,0.3)',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: isActive
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
              if (window.confirm(`Delete "${chapter.title}"?`)) onDelete();
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
      </motion.div>
    </Reorder.Item>
  );
}

// ── Main StoryPanel ───────────────────────────────────────────
export function StoryPanel() {
  const { state, dispatch, actions, manifest } = useEditor();
  const { chapters, activeId, rewritingId, sectionOverridesMap, streamingText, streamingChapterId, alternatesLoadingId, chapterAlternates } = state;
  const activeChapter = chapters.find(c => c.id === activeId) || null;

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', paddingBottom: '24px' }}>

      {/* ── Story Style ── */}
      <div style={{ padding: '4px 14px 12px' }}>
        {/* FIX #13: Stronger section heading for visual hierarchy */}
        <div style={{
          fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--pl-olive)',
          marginBottom: '8px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span>Story Style</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(163,177,138,0.2)' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {STYLES.map(s => {
            const isActive = (manifest.layoutFormat || 'cascade') === s.id;
            return (
              <motion.button
                key={s.id}
                onClick={() => actions.handleDesignChange({ ...manifest, layoutFormat: s.id as StoryManifest['layoutFormat'] })}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '8px 14px', borderRadius: '14px', border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'var(--pl-olive)' : 'rgba(255,255,255,0.3)',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  color: isActive ? 'white' : 'var(--pl-ink-soft)',
                  boxShadow: isActive ? '0 2px 8px rgba(163,177,138,0.3)' : 'none',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: '2px',
                } as React.CSSProperties}
              >
                <span style={{ fontSize: '0.68rem', fontWeight: isActive ? 700 : 600, lineHeight: 1.3 }}>
                  {s.label}
                </span>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 400, lineHeight: 1.3,
                  opacity: isActive ? 0.85 : 0.65,
                }}>
                  {s.desc}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Chapter count ── */}
      <div style={{
        padding: '10px 14px 6px',
        fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--pl-olive)',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span>Chapters</span>
        <span style={{
          fontSize: '0.6rem', fontWeight: 700,
          background: 'rgba(163,177,138,0.15)', color: 'var(--pl-olive)',
          padding: '1px 7px', borderRadius: '100px',
          border: '1px solid rgba(163,177,138,0.2)',
        }}>{chapters.length}</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(163,177,138,0.2)' }} />
      </div>

      {/* ── Chapter list ── */}
      <div style={{ padding: '0 10px' }}>
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
                  onDelete={() => actions.deleteChapter(ch.id)}
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
    </div>
  );
}
