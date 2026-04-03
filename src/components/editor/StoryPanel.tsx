'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / StoryPanel.tsx — Desktop sidebar story tab content
// Chapter list, timeline format, blocks palette, chapter editor
// Extracted from FullscreenEditor lines ~1487-1607
// ─────────────────────────────────────────────────────────────

import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import { Plus, Trash2, Image, Clock, Columns2 } from 'lucide-react';
import {
  GripIcon, BlockStoryIcon, BlockHeroIcon, BlockPhotosIcon, BlockQuoteIcon,
} from '@/components/icons/EditorIcons';
import { LocationPinIcon } from '@/components/icons/PearloomIcons';
import { ChapterActions } from './ChapterActions';
import { ChapterPanel } from './ChapterPanel';
import { slugDate } from './editor-utils';
import { useEditor } from '@/lib/editor-state';
import type { StoryManifest, Chapter } from '@/types';

// ── Helpers ────────────────────────────────────────────────────

function getThumb(ch: Chapter) {
  const raw = ch.images?.[0]?.url || null;
  if (!raw) return null;
  // Google Photos baseUrls require OAuth — route through server-side proxy
  if (raw.includes('googleusercontent.com')) {
    return `/api/photos/proxy?url=${encodeURIComponent(raw)}&w=200&h=200`;
  }
  return raw;
}

// ── DragHandle ─────────────────────────────────────────────────
function DragHandle({ controls }: { controls: ReturnType<typeof useDragControls> }) {
  return (
    <motion.div
      role="button"
      aria-label="Drag to reorder"
      tabIndex={0}
      onPointerDown={e => { e.preventDefault(); controls.start(e); }}
      whileHover={{ color: 'rgba(163,177,138,0.85)', scale: 1.15 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      style={{
        cursor: 'grab', padding: '0 10px', display: 'flex', alignItems: 'center',
        color: 'rgba(255,255,255,0.2)', touchAction: 'none', userSelect: 'none', flexShrink: 0,
        minHeight: '44px',
      }}
    >
      <GripIcon size={14} />
    </motion.div>
  );
}

// ── Canvas drag handle ─────────────────────────────────────────
function CanvasDragHandle({ chapterId, chapterTitle }: { chapterId: string; chapterTitle: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chapter:${chapterId}`,
    data: { type: 'chapter', id: chapterId, label: chapterTitle },
  });
  return (
    <motion.div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      title="Drag to reorder in canvas"
      whileHover={!isDragging ? { color: 'rgba(163,177,138,0.85)', backgroundColor: 'rgba(163,177,138,0.1)', scale: 1.1 } : {}}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        padding: '2px 6px 2px 2px',
        display: 'flex', alignItems: 'center',
        color: isDragging ? 'rgba(163,177,138,0.9)' : 'rgba(255,255,255,0.18)',
        touchAction: 'none', userSelect: 'none', flexShrink: 0,
        borderRadius: '4px',
      }}
    >
      ⌖
    </motion.div>
  );
}

// ── SectionItem ─────────────────────────────────────────────────
function SectionItem({
  chapter, index, isActive, onSelect, onDelete, onUpdate, voiceSamples,
}: {
  chapter: Chapter; index: number; isActive: boolean;
  onSelect: (id: string) => void; onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Chapter>) => void;
  voiceSamples?: string[];
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
      whileDrag={{ scale: 1.03, zIndex: 50, boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: '6px', cursor: 'pointer' }}
    >
      <motion.div
        whileHover={!isActive ? { backgroundColor: 'rgba(255,255,255,0.07)' } : {}}
        transition={{ duration: 0.15 }}
        style={{
          borderRadius: '10px',
          background: isActive ? 'rgba(163,177,138,0.12)' : 'rgba(255,255,255,0.04)',
          border: '1px solid transparent',
          borderLeft: isActive ? '3px solid rgba(163,177,138,0.8)' : '3px solid rgba(163,177,138,0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          onClick={() => onSelect(chapter.id)}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 10px 10px 8px' }}
        >
          <DragHandle controls={controls} />
          <CanvasDragHandle chapterId={chapter.id} chapterTitle={chapter.title || 'Chapter'} />

          <div style={{
            flexShrink: 0,
            width: '22px', height: '22px', borderRadius: '50%',
            background: isActive ? 'rgba(163,177,138,0.3)' : 'rgba(255,255,255,0.08)',
            border: isActive ? '1px solid rgba(163,177,138,0.5)' : '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 800, color: isActive ? 'var(--eg-accent, #A3B18A)' : 'rgba(255,255,255,0.45)',
            letterSpacing: '-0.01em',
          }}>
            {index + 1}
          </div>

          <div style={{
            width: '44px', height: '44px', borderRadius: '7px', flexShrink: 0,
            background: thumb ? 'transparent' : 'rgba(255,255,255,0.08)',
            overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {thumb
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={thumb} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Image size={14} color="rgba(255,255,255,0.25)" />
                </div>}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.88rem', fontWeight: 700,
              fontFamily: 'var(--eg-font-heading, Playfair Display, Georgia, serif)',
              color: isActive ? 'var(--eg-gold, #D6C6A8)' : 'rgba(255,255,255,0.92)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}>
              {chapter.title || 'Untitled'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {chapter.location?.label && (
                <><LocationPinIcon size={9} style={{ flexShrink: 0, opacity: 0.7 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>{chapter.location.label}</span><span>·</span></>
              )}
              <Clock size={9} style={{ flexShrink: 0, opacity: 0.7 }} />
              <span>{slugDate(chapter.date)}</span>
            </div>
          </div>

          <motion.button
            onClick={e => {
              e.stopPropagation();
              if (window.confirm(`Delete "${chapter.title}"? This cannot be undone.`)) {
                onDelete(chapter.id);
              }
            }}
            whileHover={{ scale: 1.15, color: '#f87171', backgroundColor: 'rgba(248,113,113,0.12)' }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{
              padding: '5px', borderRadius: '5px', border: 'none',
              background: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
              display: 'flex', flexShrink: 0,
            }}
          >
            <Trash2 size={12} />
          </motion.button>
        </div>

        <div style={{
          padding: '0 10px 8px 14px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <ChapterActions
            chapter={chapter}
            voiceSamples={voiceSamples}
            onUpdate={(data) => onUpdate(chapter.id, data)}
          />
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

// ── Blocks palette ─────────────────────────────────────────────
const CANVAS_BLOCK_TYPES = [
  { id: 'block:editorial',  label: 'Text Chapter',   Icon: BlockStoryIcon,  desc: 'Story text with optional photo' },
  { id: 'block:split',      label: 'Photo + Story',   Icon: Columns2,        desc: 'Side-by-side photo & text' },
  { id: 'block:fullbleed',  label: 'Full Bleed',      Icon: BlockHeroIcon,   desc: 'Cinematic full-height photo' },
  { id: 'block:gallery',    label: 'Photo Gallery',   Icon: BlockPhotosIcon, desc: 'Multi-photo grid layout' },
  { id: 'block:cinematic',  label: 'Cinematic Quote', Icon: BlockQuoteIcon,  desc: 'Ambient blurred quote' },
  { id: 'block:mosaic',     label: 'Polaroid Mosaic', Icon: GripIcon,        desc: 'Scattered polaroid collage' },
] as const;

function BlockTypeCard({ blockId, label, Icon, desc }: { blockId: string; label: string; Icon: React.ComponentType<{ size?: number; color?: string }>; desc: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: blockId,
    data: { type: 'block', id: blockId, label },
  });
  return (
    <motion.div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      title="Drag to insert →"
      whileHover={!isDragging ? { x: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(163,177,138,0.4)' } : {}}
      whileTap={!isDragging ? { scale: 0.97 } : {}}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', borderRadius: '8px', minHeight: '60px',
        border: '1px solid rgba(255,255,255,0.1)',
        background: isDragging ? 'rgba(163,177,138,0.18)' : 'rgba(255,255,255,0.06)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none', touchAction: 'none',
        marginBottom: '6px',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '1rem', flexShrink: 0, lineHeight: 1 }}>✦</div>
      <div style={{
        width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
        background: 'rgba(163,177,138,0.15)', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={16} color="rgba(163,177,138,0.9)" />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.42)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{desc}</div>
      </div>
    </motion.div>
  );
}

// ── Main StoryPanel ────────────────────────────────────────────
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
          title: activeChapter.title,
          description: activeChapter.description,
          mood: activeChapter.mood,
          vibeString: manifest.vibeString,
          occasion: manifest.occasion,
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
    <>
      {/* Sticky section header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'var(--pl-dark-bg)',
        padding: '8px 16px 6px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '4px',
      }}>
        <span style={{
          fontSize: '0.58rem', fontWeight: 800,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
        }}>
          Chapters · {chapters.length}
        </span>
      </div>

      {/* Timeline format switcher */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: '6px' }}>
          Timeline Format
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
          {[
            { id: 'cascade',   label: 'Cascade',   emoji: '⇅' },
            { id: 'filmstrip', label: 'Filmstrip', emoji: '▤' },
            { id: 'magazine',  label: 'Magazine',  emoji: '⊞' },
            { id: 'scrapbook', label: 'Scrapbook', emoji: '✦' },
            { id: 'chapters',  label: 'Chapters',  emoji: '≡' },
            { id: 'starmap',   label: 'Starmap',   emoji: '✴' },
          ].map(fmt => {
            const isActive = (manifest.layoutFormat || 'cascade') === fmt.id;
            return (
              <motion.button
                key={fmt.id}
                onClick={() => actions.handleDesignChange({ ...manifest, layoutFormat: fmt.id as StoryManifest['layoutFormat'] })}
                whileHover={!isActive ? { scale: 1.06, backgroundColor: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.7)' } : { scale: 1.04 }}
                whileTap={{ scale: 0.91 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                  padding: '6px 4px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(163,177,138,0.18)' : 'rgba(255,255,255,0.04)',
                  color: isActive ? 'var(--eg-accent, #A3B18A)' : 'rgba(255,255,255,0.35)',
                  outline: isActive ? '1.5px solid rgba(163,177,138,0.35)' : '1px solid transparent',
                }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>{fmt.emoji}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.04em' }}>{fmt.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Chapter list with reorder */}
      <Reorder.Group axis="y" values={chapters} onReorder={actions.handleReorder} as="div" style={{ margin: 0, padding: 0 }}>
        <AnimatePresence>
          {chapters.map((ch, i) => (
            <SectionItem
              key={ch.id}
              chapter={ch}
              index={i}
              isActive={activeId === ch.id}
              onSelect={(id) => dispatch({ type: 'SET_ACTIVE_ID', id })}
              onDelete={actions.deleteChapter}
              onUpdate={actions.updateChapter}
              voiceSamples={manifest.voiceSamples}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Dashed "Add Chapter" card */}
      <motion.button
        onClick={actions.addChapter}
        whileHover={{ borderColor: 'rgba(163,177,138,0.5)', backgroundColor: 'rgba(163,177,138,0.06)', y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        style={{
          width: '100%', padding: '14px 16px', marginTop: '8px', marginBottom: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          border: '1.5px dashed rgba(163,177,138,0.25)', borderRadius: '10px',
          background: 'transparent', cursor: 'pointer',
          color: 'rgba(163,177,138,0.65)', fontSize: '0.8rem', fontWeight: 700,
          letterSpacing: '0.04em',
        }}
      >
        <Plus size={14} />
        Add Chapter
      </motion.button>

      {/* Blocks palette */}
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Sticky palette header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 4,
          background: 'var(--pl-dark-bg)',
          padding: '4px 0 8px',
          fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'rgba(163,177,138,0.7)', marginBottom: '4px',
        }}>
          Drag Sections to Canvas
        </div>
        {CANVAS_BLOCK_TYPES.map(b => (
          <BlockTypeCard
            key={b.id}
            blockId={b.id}
            label={b.label}
            Icon={b.Icon}
            desc={b.desc}
          />
        ))}
      </div>


      {/* Inline chapter editor */}
      <AnimatePresence mode="wait">
        {activeChapter && (
          <motion.div
            key={activeChapter.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
