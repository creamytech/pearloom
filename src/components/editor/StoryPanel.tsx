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
        color: 'var(--pl-muted)', touchAction: 'none', userSelect: 'none', flexShrink: 0,
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
        color: isDragging ? 'rgba(163,177,138,0.9)' : 'rgba(0,0,0,0.1)',
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
      whileDrag={{ scale: 1.03, zIndex: 50, boxShadow: '0 16px 40px rgba(43,30,20,0.1)' }}
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: '6px', cursor: 'pointer' }}
    >
      <motion.div
        whileHover={!isActive ? { backgroundColor: 'rgba(163,177,138,0.04)', borderColor: 'var(--pl-olive, #A3B18A)' } : {}}
        transition={{ duration: 0.15 }}
        style={{
          borderRadius: '10px',
          background: isActive ? 'rgba(163,177,138,0.08)' : '#fff',
          border: isActive ? '1.5px solid var(--pl-olive, #A3B18A)' : '1px solid var(--pl-divider, #E0D8CA)',
          borderLeft: isActive ? '3px solid var(--pl-olive, #A3B18A)' : '3px solid rgba(163,177,138,0.2)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: isActive ? '0 2px 8px rgba(163,177,138,0.1)' : '0 1px 3px rgba(0,0,0,0.03)',
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
            background: isActive ? 'rgba(163,177,138,0.15)' : 'var(--pl-cream-deep, #F0EBE0)',
            border: isActive ? '1.5px solid var(--pl-olive, #A3B18A)' : '1px solid var(--pl-divider, #E0D8CA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 800, color: isActive ? 'var(--pl-olive-deep, #6E8C5C)' : 'var(--pl-muted, #7A756E)',
            letterSpacing: '-0.01em',
          }}>
            {index + 1}
          </div>

          <div style={{
            width: '44px', height: '44px', borderRadius: '7px', flexShrink: 0,
            background: thumb ? 'transparent' : 'rgba(0,0,0,0.06)',
            overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)',
          }}>
            {thumb
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={thumb} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Image size={14} color="var(--pl-muted)" />
                </div>}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.88rem', fontWeight: 700,
              fontFamily: 'var(--font-heading, Playfair Display, Georgia, serif)',
              color: isActive ? 'var(--pl-ink, #1A1A1A)' : 'var(--pl-ink-soft, #3D3530)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}>
              {chapter.title || 'Untitled'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--pl-muted, #7A756E)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {chapter.location?.label && (
                <><LocationPinIcon size={9} style={{ flexShrink: 0, opacity: 0.7 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>{chapter.location.label}</span><span>·</span></>
              )}
              <Clock size={9} style={{ flexShrink: 0, opacity: 0.7 }} />
              <span>{slugDate(chapter.date)}</span>
            </div>
            {/* Font label */}
            <div style={{
              fontSize: '0.58rem', fontWeight: 500,
              color: 'var(--pl-olive)',
              fontStyle: 'italic',
              marginTop: '1px',
            }}>
              {chapter.layout === 'editorial' ? 'Newsreader Light' :
               chapter.layout === 'cinematic' ? 'Playfair Display' :
               chapter.layout === 'fullbleed' ? 'Newsreader Italic' :
               'Lora Regular'}
            </div>
          </div>

          <motion.button
            onClick={e => {
              e.stopPropagation();
              // TODO: Replace with useDialog().confirm()
              if (window.confirm(`Delete "${chapter.title}"? This cannot be undone.`)) {
                onDelete(chapter.id);
              }
            }}
            whileHover={{ scale: 1.15, color: '#f87171', backgroundColor: 'rgba(248,113,113,0.12)' }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{
              padding: '5px', borderRadius: '5px', border: 'none',
              background: 'none', color: 'var(--pl-muted, #7A756E)', cursor: 'pointer',
              display: 'flex', flexShrink: 0,
              opacity: 0.5,
            }}
          >
            <Trash2 size={12} />
          </motion.button>
        </div>

        <div style={{
          padding: '0 10px 8px 14px',
          borderTop: '1px solid var(--pl-divider, #E0D8CA)',
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
      whileHover={!isDragging ? { x: 3, backgroundColor: 'rgba(0,0,0,0.06)', borderColor: 'rgba(163,177,138,0.4)' } : {}}
      whileTap={!isDragging ? { scale: 0.97 } : {}}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 10px', borderRadius: '8px', minHeight: '52px',
        border: '1px solid var(--pl-divider, #E0D8CA)',
        background: isDragging ? 'rgba(163,177,138,0.1)' : '#fff',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none', touchAction: 'none',
        marginBottom: '5px',
        opacity: isDragging ? 0.5 : 1,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{
        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
        background: 'rgba(163,177,138,0.1)', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={15} color="var(--pl-olive, #A3B18A)" />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--pl-ink-soft, #3D3530)', lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: '0.68rem', color: 'var(--pl-muted, #7A756E)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{desc}</div>
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
        background: 'var(--pl-cream, #FAF7F2)',
        padding: '8px 16px 6px',
        borderBottom: '1px solid var(--pl-divider, #E0D8CA)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '4px',
      }}>
        <span style={{
          fontSize: '0.58rem', fontWeight: 800,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--pl-muted, #7A756E)',
        }}>
          Chapters · {chapters.length}
        </span>
      </div>

      {/* Timeline format switcher — visual previews */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '6px' }}>
          Timeline Format
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
          {[
            { id: 'cascade',   label: 'Cascade',   desc: 'Classic scroll',
              preview: <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px' }}>{[0.3, 0.2, 0.25].map((o, i) => <div key={i} style={{ display: 'flex', flexDirection: i%2===0?'row':'row-reverse', gap: '2px' }}><div style={{ width: '40%', height: '8px', background: `rgba(163,177,138,${o})`, borderRadius: '1px' }} /><div style={{ flex: 1, height: '8px', background: `rgba(255,255,255,${o*0.5})`, borderRadius: '1px' }} /></div>)}</div> },
            { id: 'filmstrip', label: 'Filmstrip', desc: 'Cinematic reel',
              preview: <div style={{ display: 'flex', gap: '2px', padding: '4px', background: '#0a0a0a' }}>{[0,1,2,3].map(i => <div key={i} style={{ flex: 1, height: '20px', background: 'rgba(0,0,0,0.06)', borderRadius: '1px', border: '1px solid rgba(0,0,0,0.07)' }} />)}</div> },
            { id: 'magazine',  label: 'Magazine',  desc: 'Editorial spreads',
              preview: <div style={{ display: 'flex', padding: '3px', gap: '2px' }}><div style={{ width: '50%', background: 'rgba(163,177,138,0.25)', borderRadius: '1px' }} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}><div style={{ height: '4px', background: 'var(--pl-muted)', borderRadius: '1px' }} /><div style={{ height: '4px', width: '70%', background: 'rgba(0,0,0,0.06)', borderRadius: '1px' }} /></div></div> },
            { id: 'scrapbook', label: 'Scrapbook', desc: 'Polaroid feel',
              preview: <div style={{ position: 'relative', padding: '3px' }}>{[{r:-5,x:3,y:2},{r:4,x:16,y:3},{r:-2,x:10,y:10}].map((p,i) => <div key={i} style={{ position: 'absolute', width: '10px', height: '12px', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transform: `rotate(${p.r}deg)`, left: `${p.x}px`, top: `${p.y}px`, borderRadius: '1px' }}><div style={{ width: '100%', height: '6px', background: 'rgba(163,177,138,0.3)' }} /></div>)}</div> },
            { id: 'chapters',  label: 'Chapters',  desc: 'Book pages',
              preview: <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px' }}>{[100,60,80].map((w,i) => <div key={i} style={{ height: '5px', background: i===0?'rgba(163,177,138,0.4)':'rgba(0,0,0,0.06)', borderRadius: '2px', width: `${w}%` }} />)}</div> },
            { id: 'starmap',   label: 'Starmap',   desc: 'Constellation',
              preview: <div style={{ background: '#050810', padding: '3px', position: 'relative' }}>{[[20,35],[50,15],[75,30],[35,55],[60,50]].map(([x,y],i) => <div key={i} style={{ position: 'absolute', width: '2px', height: '2px', borderRadius: '50%', background: 'rgba(200,220,255,0.7)', left: `${x}%`, top: `${y}%` }} />)}</div> },
          ].map(fmt => {
            const isActive = (manifest.layoutFormat || 'cascade') === fmt.id;
            return (
              <motion.button
                key={fmt.id}
                onClick={() => actions.handleDesignChange({ ...manifest, layoutFormat: fmt.id as StoryManifest['layoutFormat'] })}
                whileHover={!isActive ? { scale: 1.04, borderColor: 'rgba(163,177,138,0.35)' } : {}}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(163,177,138,0.08)' : '#fff',
                  outline: isActive ? '2px solid var(--pl-olive, #A3B18A)' : '1px solid var(--pl-divider, #E0D8CA)',
                  overflow: 'hidden', padding: 0,
                  boxShadow: isActive ? '0 2px 6px rgba(163,177,138,0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ height: '28px', overflow: 'hidden', background: 'var(--pl-cream-deep, #F0EBE0)' }}>{fmt.preview}</div>
                <div style={{ padding: '3px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: isActive ? 'var(--pl-olive-deep, #6E8C5C)' : 'var(--pl-muted, #7A756E)', letterSpacing: '0.02em' }}>
                    {fmt.label}
                  </div>
                </div>
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
          border: '1.5px dashed var(--pl-olive, #A3B18A)', borderRadius: '10px',
          background: 'transparent', cursor: 'pointer',
          color: 'var(--pl-olive, #A3B18A)', fontSize: '0.8rem', fontWeight: 700,
          letterSpacing: '0.04em', opacity: 0.6,
        }}
      >
        <Plus size={14} />
        Add Chapter
      </motion.button>

      {/* Blocks palette */}
      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--pl-divider, #E0D8CA)' }}>
        {/* Sticky palette header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 4,
          background: 'var(--pl-cream, #FAF7F2)',
          padding: '4px 0 8px',
          fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--pl-olive, #A3B18A)', marginBottom: '4px',
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
            style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--pl-divider, #E0D8CA)' }}
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
