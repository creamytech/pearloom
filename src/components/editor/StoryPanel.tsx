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
  return ch.images?.[0]?.url || null;
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
  const { chapters, activeId, rewritingId, sectionOverridesMap } = state;
  const activeChapter = chapters.find(c => c.id === activeId) || null;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)' }}>
          Story Chapters ({chapters.length})
        </span>
        <motion.button
          onClick={actions.addChapter}
          whileHover={{ scale: 1.08, backgroundColor: 'rgba(163,177,138,0.26)' }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '5px 10px', borderRadius: '5px', border: 'none',
            background: 'rgba(163,177,138,0.18)', color: 'var(--eg-accent, #A3B18A)',
            cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
          }}
        >
          <Plus size={11} /> Add
        </motion.button>
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
                <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.04em' }}>{fmt.label}</span>
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

      {/* Blocks palette */}
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--eg-olive, #A3B18A)', marginBottom: '10px' }}>
          Add Sections — Drag to Canvas
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
              onOverridesChange={(id, overrides) => {
                dispatch({ type: 'SET_SECTION_OVERRIDES', id, overrides });
                actions.updateChapter(id, { styleOverrides: { backgroundColor: overrides.backgroundColor, textColor: overrides.textColor, padding: overrides.padding } });
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
