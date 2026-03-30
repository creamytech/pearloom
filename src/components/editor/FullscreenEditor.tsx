'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/FullscreenEditor.tsx
// Production-grade full-screen site editor — Webflow-style
// Left nav | Live preview canvas | Right property panel
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  useDraggable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  Plus, Trash2, Loader2,
  Globe, Monitor, Tablet, Smartphone,
  Image, Upload, X, Camera,
  Clock, ChevronDown, Columns2,
  Eye, EyeOff,
} from 'lucide-react';
import { PreviewPane } from './PreviewPane';
import { PhotoReposition } from './PhotoReposition';
import { EditorSidebar } from './EditorSidebar';
import { PearloomMark } from '@/components/brand/PearloomMark';
import {
  SectionsIcon, StoryIcon, EventsIcon, DesignIcon, DetailsIcon,
  AIBlocksIcon, VoiceIcon, ExitIcon, PreviewIcon, PublishIcon,
  UndoIcon, RedoIcon, CommandIcon, GripIcon, SavedIcon, UnsavedIcon,
  BlockStoryIcon, BlockHeroIcon, BlockPhotosIcon, BlockQuoteIcon,
} from '@/components/icons/EditorIcons';
import {
  ElegantHeartIcon, LocationPinIcon, CalendarHeartIcon, LoomThreadIcon,
} from '@/components/icons/PearloomIcons';
import type { StoryManifest, Chapter, ChapterImage, WeddingEvent, FaqItem, HotelBlock, TravelInfo } from '@/types';
import { ChapterActions } from './ChapterActions';
import { AIBlocksPanel } from './AIBlocksPanel';
import { VoiceTrainerPanel } from './VoiceTrainerPanel';
import { CanvasEditor } from './CanvasEditor';
import { ColorPalettePanel } from './ColorPalettePanel';
import { CommandPalette } from './CommandPalette';
import type { CommandAction } from './CommandPalette';
import { ThemeSwitcher } from './ThemeSwitcher';
import { SectionStyleEditor } from './SectionStyleEditor';
import FontPicker from '@/components/dashboard/FontPicker';
import { AssetPicker } from '@/components/asset-library/AssetPicker';
import type { SectionStyleOverrides } from './SectionStyleEditor';
import type { VibeSkin } from '@/lib/vibe-engine';
import { AIEditorChat } from './AIEditorChat';
import { VenueSearch } from '@/components/venue/VenueSearch';
import type { VenuePartial } from '@/components/venue/VenueSearch';
import { SeatingCanvas } from '@/components/seating/SeatingCanvas';

// ── Extracted panel components ────────────────────────────────
import { ImageManager } from './ImageManager';
import { EventsPanel } from './EventsPanel';
import { DetailsPanel } from './DetailsPanel';
import { PagesPanel } from './PagesPanel';
import { DesignPanel } from './DesignPanel';
import { Field, lbl, inp, slugDate } from './editor-utils';

// ── Types ──────────────────────────────────────────────────────
type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type EditorTab = 'story' | 'events' | 'design' | 'details' | 'pages' | 'blocks' | 'voice' | 'canvas';

const DEVICE_DIMS: Record<DeviceMode, { width: string; label: string; icon: React.ElementType }> = {
  desktop: { width: '100%',    label: 'Desktop (1280px)', icon: Monitor },
  tablet:  { width: '768px',   label: 'Tablet (768px)',   icon: Tablet  },
  mobile:  { width: '390px',   label: 'Mobile (390px)',   icon: Smartphone },
};

const LAYOUT_OPTS = ['editorial', 'fullbleed', 'split', 'cinematic', 'gallery', 'mosaic'] as const;

interface FullscreenEditorProps {
  manifest: StoryManifest;
  coupleNames: [string, string];
  subdomain: string;
  onChange: (m: StoryManifest) => void;
  onPublish?: () => void; // optional callback after successful publish
  onExit: () => void;
}

// ── Helpers ────────────────────────────────────────────────────
const PREVIEW_KEY = 'pearloom-editor-live';

function getThumb(ch: Chapter) {
  return ch.images?.[0]?.url || null;
}

// slugDate, lbl, inp, Field — now imported from ./editor-utils

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

// ── Canvas drag handle (separate from sidebar reorder handle) ──────
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

// ── Strip large art blobs before sessionStorage (avoids QuotaExceededError) ──
function stripArtForStorage(manifest: StoryManifest): StoryManifest {
  if (!manifest.vibeSkin) return manifest;
  return {
    ...manifest,
    vibeSkin: {
      ...manifest.vibeSkin,
      heroArtDataUrl: undefined,
      ambientArtDataUrl: undefined,
      artStripDataUrl: undefined,
    },
  };
}

function storePreview(key: string, manifest: StoryManifest, names: [string, string]) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ manifest: stripArtForStorage(manifest), names }));
  } catch {
    // Quota exceeded — store without chapters' images as a last resort
    try {
      const lean = { ...stripArtForStorage(manifest), chapters: manifest.chapters.map(c => ({ ...c, images: [] })) };
      sessionStorage.setItem(key, JSON.stringify({ manifest: lean, names }));
    } catch {}
  }
}

// ── Blocks palette shown at bottom of story tab ─────────────────
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
      {/* Drag handle */}
      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '1rem', flexShrink: 0, lineHeight: 1 }}>✦</div>
      {/* Block type icon */}
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

// ── SectionItem in left nav ─────────────────────────────────────
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
        {/* Main card row */}
        <div
          onClick={() => onSelect(chapter.id)}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 10px 10px 8px' }}
        >
          {/* Drag handles */}
          <DragHandle controls={controls} />
          <CanvasDragHandle chapterId={chapter.id} chapterTitle={chapter.title || 'Chapter'} />

          {/* Chapter number pill */}
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

          {/* Thumbnail — 44px */}
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

          {/* Labels */}
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

          {/* Delete */}
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

        {/* Chapter actions row — completion dots + rewrite + sort */}
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

// ── ImageManager ───────────────────────────────────────────────

// ── Chapter Property Panel ─────────────────────────────────────
const LAYOUT_LABELS: Record<string, string> = {
  editorial: 'Editorial', fullbleed: 'Full Bleed', split: 'Split',
  cinematic: 'Cinematic', gallery: 'Gallery', mosaic: 'Mosaic',
};

function ChapterPanel({
  chapter, onUpdate, onAIRewrite, isRewriting, vibeSkin,
  sectionOverrides, onOverridesChange, vibeString,
}: {
  chapter: Chapter;
  onUpdate: (id: string, data: Partial<Chapter>) => void;
  onAIRewrite: (id: string) => void;
  isRewriting: boolean;
  vibeSkin?: VibeSkin;
  sectionOverrides?: SectionStyleOverrides;
  onOverridesChange?: (id: string, overrides: SectionStyleOverrides) => void;
  vibeString?: string;
}) {
  const upd = useCallback((data: Partial<Chapter>) => onUpdate(chapter.id, data), [chapter.id, onUpdate]);
  const currentLayout = chapter.layout || 'editorial';

  return (
    <motion.div
      key={chapter.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
    >
      {/* Section heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
        <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-gold, #D6C6A8)', whiteSpace: 'nowrap' }}>
          Chapter Editor
        </span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
      </div>

      {/* Title — large inline style */}
      <div>
        <label style={lbl}>Title</label>
        <input
          value={chapter.title || ''}
          onChange={e => upd({ title: e.target.value })}
          placeholder="The Rooftop, Brooklyn"
          style={{ ...inp, fontSize: 'max(16px, 1rem)', fontWeight: 700, letterSpacing: '-0.01em' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Date + Subtitle row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
        <div>
          <label style={lbl}>Date</label>
          <input
            type="date"
            value={chapter.date ? chapter.date.slice(0, 10) : ''}
            onChange={e => upd({ date: e.target.value })}
            style={{ ...inp, colorScheme: 'dark' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
          />
        </div>
        <Field label="Subtitle" value={chapter.subtitle || ''} onChange={v => upd({ subtitle: v })} placeholder="in all the best ways" />
      </div>

      {/* Description — auto-grows */}
      <div>
        <label style={lbl}>Story</label>
        <textarea
          value={chapter.description || ''}
          onChange={e => upd({ description: e.target.value })}
          rows={5}
          placeholder="Write your memory here..."
          style={{ ...inp, resize: 'vertical', lineHeight: 1.65, minHeight: '120px' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Layout selector — pill buttons */}
      <div>
        <label style={lbl}>Layout</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {LAYOUT_OPTS.map(l => (
            <button
              key={l}
              onClick={() => upd({ layout: l })}
              style={{
                padding: '6px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.04em',
                background: currentLayout === l ? 'var(--eg-plum, #6D597A)' : 'rgba(255,255,255,0.09)',
                color: currentLayout === l ? '#fff' : 'rgba(255,255,255,0.55)',
                transition: 'all 0.15s',
              }}
            >
              {LAYOUT_LABELS[l] || l}
            </button>
          ))}
        </div>
      </div>

      {/* Mood field */}
      <Field label="Mood" value={chapter.mood || ''} onChange={v => upd({ mood: v })} placeholder="e.g. golden hour, cozy winter" />

      {/* AI Rewrite button — prominent */}
      <motion.button
        onClick={() => onAIRewrite(chapter.id)}
        disabled={isRewriting}
        animate={isRewriting ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
        transition={isRewriting ? { repeat: Infinity, duration: 1.2 } : undefined}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          padding: '10px 16px', borderRadius: '8px',
          border: '1px solid rgba(163,177,138,0.35)',
          background: isRewriting ? 'rgba(255,255,255,0.04)' : 'rgba(163,177,138,0.12)',
          color: isRewriting ? 'rgba(255,255,255,0.4)' : 'var(--eg-accent, #A3B18A)',
          fontSize: '0.85rem', fontWeight: 700, cursor: isRewriting ? 'not-allowed' : 'pointer',
          letterSpacing: '0.04em', transition: 'all 0.15s',
        }}
        onMouseOver={e => { if (!isRewriting) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.22)'; }}
        onMouseOut={e => { if (!isRewriting) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.12)'; }}
      >
        {isRewriting
          ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Rewriting…</>
          : <><AIBlocksIcon size={13} /> Rewrite this chapter</>}
      </motion.button>

      {/* Image Manager */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
        <ImageManager
          images={chapter.images || []}
          onUpdate={imgs => upd({ images: imgs })}
          imagePosition={chapter.imagePosition}
          onPositionChange={(x, y) => upd({ imagePosition: { x, y } })}
          chapterTitle={chapter.title}
          chapterMood={chapter.mood}
          chapterDescription={chapter.description}
          vibeString={vibeString || ''}
        />
      </div>

      {/* Section Style Overrides */}
      {vibeSkin && onOverridesChange && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)', marginBottom: '8px' }}>
            Section Style
          </div>
          <SectionStyleEditor
            sectionId={chapter.id}
            sectionType="chapter"
            currentOverrides={sectionOverrides}
            vibeSkin={vibeSkin}
            onChange={(overrides) => onOverridesChange(chapter.id, overrides)}
          />
        </div>
      )}
    </motion.div>
  );
}

// ── WelcomeOverlay ─────────────────────────────────────────────
function WelcomeOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#1C1916',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '1.5rem', cursor: 'pointer',
      }}
    >
      {/* Animated pear mark */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <PearloomMark size={80} color="#A3B18A" color2="#D6C6A8" animated />
      </motion.div>

      {/* "Your site is ready." */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: 'var(--eg-font-heading, Playfair Display, Georgia, serif)',
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontStyle: 'italic',
          fontWeight: 400,
          color: '#F5F1E8',
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}
      >
        Your site is ready.
      </motion.div>

      {/* "Let's bring it to life." */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: 'var(--eg-font-body, Lora, Georgia, serif)',
          fontSize: '1rem',
          color: 'rgba(245,241,232,0.55)',
          letterSpacing: '0.04em',
          textAlign: 'center',
        }}
      >
        Let&apos;s bring it to life.
      </motion.div>
    </motion.div>
  );
}

// ── Main FullscreenEditor ──────────────────────────────────────
export function FullscreenEditor({ manifest, coupleNames, subdomain: initialSubdomain, onChange, onPublish, onExit }: FullscreenEditorProps) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [chapters, setChapters] = useState<Chapter[]>(
    [...(manifest.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );
  const [activeId, setActiveId] = useState<string | null>(chapters[0]?.id || null);
  const [activeTab, setActiveTab] = useState<EditorTab>('story');
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sectionOverridesMap, setSectionOverridesMap] = useState<Record<string, SectionStyleOverrides>>({});
  // Mobile: which panel is open as a bottom sheet
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  // Swipe-to-dismiss tracking
  const swipeStartY = useRef<number | null>(null);
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [rewritingId, setRewritingId] = useState<string | null>(null);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [previewSlow, setPreviewSlow] = useState(false);
  const [previewKey] = useState(() => `${PREVIEW_KEY}-${Date.now()}`);
  const [splitView, setSplitView] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  // ── Drag-and-drop state ──
  const [canvasDragId, setCanvasDragId] = useState<string | null>(null);
  const [canvasDragLabel, setCanvasDragLabel] = useState('');
  const preDragSplitView = useRef(false);
  const canvasDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabScrollPositions = useRef<Record<string, number>>({});
  const contentPanelRef = useRef<HTMLDivElement>(null);
  // ── Unsaved changes indicator ──
  const [saveState, setSaveState] = useState<'saved' | 'unsaved'>('saved');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  // ── Undo/Redo history ──
  const historyRef = useRef<StoryManifest[]>([manifest]);
  const historyIndexRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Split view uses PreviewPane (React component). Default off — user toggles via toolbar.

  // ── Show "Click to jump" hint when split view first opens ──
  const hintShownRef = useRef(false);
  useEffect(() => {
    if (splitView && !hintShownRef.current) {
      hintShownRef.current = true;
      setShowHint(true);
      const t = setTimeout(() => setShowHint(false), 4000);
      return () => clearTimeout(t);
    }
  }, [splitView]);

  // Sync local chapters state when manifest.chapters changes from the parent
  // (e.g., after AI generation completes or an undo/redo operation)
  useEffect(() => {
    setChapters([...(manifest.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    setActiveId(prev => {
      const ids = new Set((manifest.chapters || []).map(c => c.id));
      return ids.has(prev ?? '') ? prev : manifest.chapters?.[0]?.id || null;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest.chapters]);

  // Split view is off by default — user can toggle it via the toolbar button

  // Auto-dismiss welcome overlay after 2.5s
  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 2500);
    return () => clearTimeout(t);
  }, []);

  // 8-second preview timeout — show "Taking longer than usual" message
  useEffect(() => {
    if (iframeReady) return;
    const t = setTimeout(() => setPreviewSlow(true), 8000);
    return () => clearTimeout(t);
  }, [iframeReady]);

  // Seed sessionStorage immediately on mount so the iframe has data when it first loads
  useEffect(() => {
    try {
      storePreview(previewKey, manifest, coupleNames);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushHistory = useCallback((m: StoryManifest) => {
    const stack = historyRef.current.slice(0, historyIndexRef.current + 1);
    stack.push(m);
    if (stack.length > 50) stack.shift();
    historyRef.current = stack;
    historyIndexRef.current = stack.length - 1;
    setCanUndo(stack.length > 1);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const prev = historyRef.current[historyIndexRef.current];
    onChange(prev);
    pushToPreview(prev); // will be defined below — ref used
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const next = historyRef.current[historyIndexRef.current];
    onChange(next);
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange]);

  // ── Stable refs for keyboard handler (avoids stale closures) ──
  const activeIdRef = useRef(activeId);
  const chaptersRef = useRef(chapters);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pushToPreviewRef = useRef<(m: StoryManifest) => void>(() => {});
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { chaptersRef.current = chapters; }, [chapters]);

  // ── Command Palette + Undo/Redo keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen(prev => !prev);
      }
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Cmd+Y as alt redo shortcut (Windows convention)
      if (mod && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      // Cmd+\ toggles sidebar
      if (mod && e.key === '\\') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
      // Cmd+D: duplicate active chapter
      if (mod && e.key === 'd') {
        e.preventDefault();
        const id = activeIdRef.current;
        const chs = chaptersRef.current;
        if (!id) return;
        const original = chs.find(c => c.id === id);
        if (!original) return;
        const copyId = `ch-${Date.now()}`;
        const copy: Chapter = {
          ...original,
          id: copyId,
          title: `${original.title} (copy)`,
          order: (original.order ?? 0) + 0.5,
        };
        const next = [...chs, copy].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setChapters(next);
        setActiveId(copyId);
        // syncManifest inline to avoid dependency
        const newManifest = { ...manifest, chapters: next.map((ch, i) => ({ ...ch, order: i })) };
        pushHistory(newManifest);
        onChange(newManifest);
        pushToPreviewRef.current(newManifest);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, manifest, pushHistory, onChange]);

  // ── Warn before tab close when there are unsaved changes ──
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Publish modal state
  const [showPublish, setShowPublish] = useState(false);
  const [subdomain, setSubdomain] = useState(initialSubdomain || '');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const handlePublishSubmit = useCallback(async () => {
    const target = subdomain.trim();
    if (!target) return setPublishError('Please enter a URL.');
    setPublishError(null);
    setIsPublishing(true);
    try {
      const res = await fetch('/api/sites/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: target,
          manifest: { ...manifest, chapters: chapters.map((ch, i) => ({ ...ch, order: i })) },
          names: coupleNames,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish');
      setPublishedUrl(data.url);
      setSaveState('saved');
      setIsDirty(false);
      onPublish?.();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsPublishing(false);
    }
  }, [subdomain, manifest, chapters, coupleNames, onPublish]);

  const activeChapter = chapters.find(c => c.id === activeId) || null;

  // Push manifest changes to iframe preview (debounced 600ms)
  const pushToPreview = useCallback((m: StoryManifest) => {
    // Mark unsaved
    setSaveState('unsaved');
    setIsDirty(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        storePreview(previewKey, m, coupleNames);
        // Send live update via postMessage (no iframe reload = preserves scroll)
        if (iframeRef.current?.contentWindow) {
          // Strip large art blobs from postMessage payload (art doesn't change during editing)
          const manifestForMsg = m.vibeSkin ? {
            ...m,
            vibeSkin: {
              ...m.vibeSkin,
              heroArtDataUrl: undefined,
              ambientArtDataUrl: undefined,
              artStripDataUrl: undefined,
            }
          } : m;
          iframeRef.current.contentWindow.postMessage({
            type: 'pearloom-preview-update',
            manifest: manifestForMsg,
            names: coupleNames,
          }, '*');
        }
        // Auto-mark as locally saved 2.5s after last change
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => setSaveState('saved'), 2500);
      } catch {}
    }, 600);
  }, [previewKey, coupleNames]);

  // Keep ref in sync so keyboard handler can call it without stale closure
  useEffect(() => { pushToPreviewRef.current = pushToPreview; }, [pushToPreview]);

  // Initial load — set sessionStorage synchronously so iframe has data the moment it loads
  useEffect(() => {
    try {
      storePreview(previewKey, manifest, coupleNames);
    } catch {}
    pushToPreview(manifest);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Autosave to localStorage (debounced 1.5s) ──
  const AUTOSAVE_KEY = 'pearloom_draft_manifest';
  const DRAFT_DISMISSED_KEY = `pearloom-draft-dismissed-${subdomain}`;
  const [draftBanner, setDraftBanner] = useState<'visible' | 'hidden' | null>(null);
  const [recoveredDraft, setRecoveredDraft] = useState<StoryManifest | null>(null);

  // On mount: check for a saved draft newer than the prop manifest
  useEffect(() => {
    try {
      // If the user previously dismissed the banner for this subdomain, skip it
      const previouslyDismissed = localStorage.getItem(DRAFT_DISMISSED_KEY);
      if (previouslyDismissed) return;

      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const saved: { manifest: StoryManifest; savedAt: number } = JSON.parse(raw);
      const propTime = manifest.generatedAt ? new Date(manifest.generatedAt).getTime() : 0;
      if (saved.savedAt > propTime) {
        setRecoveredDraft(saved.manifest);
        setDraftBanner('visible');
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave whenever manifest changes
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ manifest, savedAt: Date.now() }));
      } catch {}
    }, 1500);
    return () => clearTimeout(t);
  }, [manifest]);

  const handleRestoreDraft = useCallback(() => {
    if (!recoveredDraft) return;
    onChange(recoveredDraft);
    pushToPreview(recoveredDraft);
    pushHistory(recoveredDraft);
    setDraftBanner('hidden');
    setRecoveredDraft(null);
  }, [recoveredDraft, onChange, pushToPreview, pushHistory]);

  const syncManifest = useCallback((newChapters: Chapter[]) => {
    const newManifest = {
      ...manifest,
      chapters: newChapters.map((ch, i) => ({ ...ch, order: i })),
    };
    pushHistory(newManifest);
    onChange(newManifest);
    pushToPreview(newManifest);
  }, [manifest, onChange, pushToPreview, pushHistory]);

  const handleChatManifestUpdate = useCallback((updates: Partial<StoryManifest>) => {
    const next = { ...manifest, ...updates };
    pushHistory(next);
    onChange(next);
    pushToPreview(next);
  }, [manifest, onChange, pushToPreview, pushHistory]);

  const updateChapter = useCallback((id: string, data: Partial<Chapter>) => {
    const next = chapters.map(ch => ch.id === id ? { ...ch, ...data } : ch);
    setChapters(next);
    syncManifest(next);
  }, [chapters, syncManifest]);

  const deleteChapter = useCallback((id: string) => {
    const next = chapters.filter(ch => ch.id !== id);
    setChapters(next);
    if (activeId === id) setActiveId(next[0]?.id || null);
    syncManifest(next);
  }, [chapters, activeId, syncManifest]);

  const addChapter = useCallback(() => {
    const id = `ch-${Date.now()}`;
    const newCh: Chapter = {
      id, date: new Date().toISOString(), title: 'New Chapter',
      subtitle: 'Add your subtitle', description: 'Write your story here…',
      images: [], location: null, mood: 'romantic', order: chapters.length,
    };
    const next = [...chapters, newCh];
    setChapters(next);
    setActiveId(id);
    syncManifest(next);
  }, [chapters, syncManifest]);

  const handleTabChange = useCallback((newTab: EditorTab) => {
    if (contentPanelRef.current) {
      tabScrollPositions.current[activeTab] = contentPanelRef.current.scrollTop;
    }
    setActiveTab(newTab);
    setTimeout(() => {
      if (contentPanelRef.current) {
        contentPanelRef.current.scrollTop = tabScrollPositions.current[newTab] || 0;
      }
    }, 0);
  }, [activeTab]);

  const handleCommandAction = useCallback((action: CommandAction) => {
    switch (action.type) {
      case 'tab':    handleTabChange(action.tab); break;
      case 'device': setDevice(action.mode); break;
      case 'chapter': setActiveId(action.id); setActiveTab('story'); break;
      case 'add-chapter': addChapter(); break;
      case 'preview':
        storePreview(previewKey, manifest, coupleNames);
        window.open(`/preview?key=${previewKey}`, '_blank');
        break;
      case 'publish': setPublishError(null); setPublishedUrl(null); setShowPublish(true); break;
      case 'undo': undo(); break;
      case 'redo': redo(); break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addChapter, handleTabChange, setActiveTab, setDevice, setActiveId, manifest, coupleNames, previewKey, undo, redo]);

  const handleReorder = useCallback((newOrder: Chapter[]) => {
    setChapters(newOrder);
    syncManifest(newOrder);
  }, [syncManifest]);

  const handleCanvasDragStart = useCallback((e: DragStartEvent) => {
    const data = e.active.data.current as { type: string; id: string; label: string } | undefined;
    setCanvasDragId(String(e.active.id));
    setCanvasDragLabel(data?.label || '');
    // Auto-show split view so PreviewPane drop zones become visible during drag.
    // Save previous state so we can restore it when drag ends.
    if (!isMobile) {
      preDragSplitView.current = splitView;
      setSplitView(true);
    }
  }, [isMobile, splitView]);

  const handleCanvasDragEnd = useCallback((e: DragEndEvent) => {
    setCanvasDragId(null);
    setCanvasDragLabel('');
    // Restore split view to what it was before the drag started
    if (!isMobile) setSplitView(preDragSplitView.current);
    const { over, active } = e;
    if (!over) return;

    const dropId = String(over.id); // e.g. "drop:after:2" or "drop:before:0"
    const activeData = active.data.current as { type: string; id: string } | undefined;

    // Parse drop position from zone id
    const match = dropId.match(/^drop:(after|before):(\d+)$/);
    if (!match) return;
    const [, position, idxStr] = match;
    const targetIndex = parseInt(idxStr, 10) + (position === 'after' ? 1 : 0);

    if (activeData?.type === 'chapter') {
      // Reorder existing chapter
      const chapterId = activeData.id;
      const current = chapters.findIndex(c => c.id === chapterId);
      if (current === -1) return;
      const newOrder = [...chapters];
      const [moved] = newOrder.splice(current, 1);
      const insertAt = current < targetIndex ? targetIndex - 1 : targetIndex;
      newOrder.splice(Math.max(0, insertAt), 0, moved);
      setChapters(newOrder);
      syncManifest(newOrder);
    } else if (activeData?.type === 'block') {
      // Insert a new chapter with the dragged layout
      const layout = activeData.id.replace('block:', '') as Chapter['layout'];
      const newId = `ch-${Date.now()}`;
      const newCh: Chapter = {
        id: newId,
        title: 'New Chapter',
        subtitle: '',
        description: 'Add your story here...',
        date: new Date().toISOString().slice(0, 10),
        images: [],
        location: null,
        mood: 'golden hour',
        layout,
        order: targetIndex,
      };
      const newOrder = [...chapters];
      newOrder.splice(targetIndex, 0, newCh);
      setChapters(newOrder);
      syncManifest(newOrder);
      setActiveId(newId);
      setActiveTab('story');
    }
  }, [chapters, syncManifest]);

  const handleDesignChange = useCallback((m: StoryManifest) => {
    pushHistory(m);
    onChange(m);
    pushToPreview(m);
  }, [onChange, pushToPreview, pushHistory]);

  const handleAIRewrite = useCallback(async (id: string) => {
    const ch = chapters.find(c => c.id === id);
    if (!ch) return;
    setRewritingId(id);
    try {
      const res = await fetch('/api/generate-block', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Rewrite this ${manifest.occasion || 'wedding'} chapter with fresh, intimate, specific language. Keep the same emotional theme but use richer storytelling.

Current title: "${ch.title}"
Current story: "${ch.description}"
Mood: ${ch.mood || 'romantic'}
Vibe: ${manifest.vibeString || ''}
Occasion: ${manifest.occasion || 'wedding'}

Return JSON with: title, subtitle, description, mood`,
          systemPrompt: `You are a storytelling AI for Pearloom ${manifest.occasion || 'wedding'} websites. Write in a warm, cinematic, intimate voice appropriate for this type of life event. Return ONLY valid JSON with keys: title, subtitle, description, mood.`,
        }),
      });
      if (res.ok) {
        const { block } = await res.json();
        // API returns { block: { title, subtitle, description, mood } } — no .data wrapper
        if (block && (block.title || block.description)) {
          updateChapter(id, {
            title: block.title || ch.title,
            subtitle: block.subtitle || ch.subtitle,
            description: block.description || ch.description,
            mood: block.mood || ch.mood,
          });
        } else {
          setRewriteError('Rewrite returned no content — try again');
          setTimeout(() => setRewriteError(null), 4000);
        }
      } else {
        setRewriteError('Rewrite failed — please try again');
        setTimeout(() => setRewriteError(null), 4000);
      }
    } catch (e) {
      console.error('AI rewrite failed:', e);
      setRewriteError('Rewrite failed — please try again');
      setTimeout(() => setRewriteError(null), 4000);
    }
    finally { setRewritingId(null); }
  }, [chapters, manifest, updateChapter]);

  const TAB_ICONS: Record<EditorTab, React.ElementType> = {
    canvas: SectionsIcon, story: StoryIcon, events: EventsIcon, design: DesignIcon,
    details: DetailsIcon, pages: Globe, blocks: AIBlocksIcon, voice: VoiceIcon,
  };

  return (
    <DndContext
      sensors={canvasDragSensors}
      onDragStart={handleCanvasDragStart}
      onDragEnd={handleCanvasDragEnd}
    >
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', flexDirection: 'column',
      background: 'var(--eg-dark-2, #3D3530)', fontFamily: 'var(--eg-font-body, Lora, Georgia, serif)',
    }}>
      {/* ── Command Palette ── */}
      <CommandPalette
        open={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onAction={handleCommandAction}
        chapters={chapters.map(c => ({ id: c.id, title: c.title || '' }))}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* ── Draft Recovery Banner ── */}
      {draftBanner === 'visible' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
          background: 'var(--eg-gold, #D6C6A8)', color: '#2B2B2B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.75rem', padding: '0.6rem 1rem',
          fontSize: '0.85rem', fontWeight: 600,
        }}>
          <span>Unsaved draft recovered</span>
          <span style={{ opacity: 0.4 }}>—</span>
          <button
            onClick={handleRestoreDraft}
            style={{
              background: '#2B2B2B', color: '#fff', border: 'none', borderRadius: '4px',
              padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            restore draft
          </button>
          <button
            onClick={() => {
              try { localStorage.setItem(DRAFT_DISMISSED_KEY, '1'); } catch {}
              setDraftBanner('hidden');
            }}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#2B2B2B', fontSize: '0.78rem', fontWeight: 600, opacity: 0.6, padding: '3px 6px',
            }}
          >
            dismiss
          </button>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={{
        height: '52px', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(36,30,26,0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '0 1rem', gap: '0.75rem',
        zIndex: 10,
        boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 2px 12px rgba(0,0,0,0.2)',
      } as React.CSSProperties}>
        {/* Exit */}
        <motion.button
          onClick={onExit}
          title="Exit editor"
          whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.11)' }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 10px', borderRadius: '6px', border: 'none',
            background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)',
            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, flexShrink: 0,
          }}
        >
          <ExitIcon size={14} /> Exit
        </motion.button>

        {/* Site name — centered, contextual to occasion */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {manifest.occasion !== 'birthday' && (
            <ElegantHeartIcon size={12} color="var(--eg-gold, #D6C6A8)" />
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
            {manifest.occasion === 'birthday'
              ? `${coupleNames[0]}'s Birthday`
              : manifest.occasion === 'anniversary'
              ? `${coupleNames[0]} & ${coupleNames[1]}`
              : manifest.occasion === 'engagement'
              ? `${coupleNames[0]} & ${coupleNames[1]}`
              : `${coupleNames[0]} & ${coupleNames[1]}`}
          </span>
          <motion.button
            onClick={() => setCmdPaletteOpen(true)}
            title="Command Palette (Cmd+K)"
            whileHover={{ scale: 1.05, borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{
              display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '5px',
              padding: '3px 9px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            <CommandIcon size={10} />
            <kbd style={{ fontFamily: 'inherit', fontWeight: 700 }}>⌘K</kbd>
          </motion.button>

          {/* Contextual chapter actions — appear when a chapter is selected */}
          <AnimatePresence>
            {activeId && !isMobile && (
              <motion.div
                key="ctx-actions"
                initial={{ opacity: 0, scale: 0.88, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}
              >
                <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.12)', marginRight: '4px' }} />
                {/* Duplicate */}
                <motion.button
                  title="Duplicate chapter (⌘D)"
                  onClick={() => {
                    const original = chapters.find(c => c.id === activeId);
                    if (!original) return;
                    const copyId = `ch-${Date.now()}`;
                    const copy: Chapter = { ...original, id: copyId, title: `${original.title} (copy)`, order: (original.order ?? 0) + 0.5 };
                    const next = [...chapters, copy].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                    setChapters(next);
                    setActiveId(copyId);
                    const newManifest = { ...manifest, chapters: next.map((ch, i) => ({ ...ch, order: i })) };
                    pushHistory(newManifest); onChange(newManifest); pushToPreview(newManifest);
                  }}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                  whileTap={{ scale: 0.93 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em' }}
                >
                  ⌘D Duplicate
                </motion.button>
                {/* Delete */}
                <motion.button
                  title="Delete chapter"
                  onClick={() => deleteChapter(activeId)}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(248,113,113,0.14)', color: '#f87171' }}
                  whileTap={{ scale: 0.93 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '5px', border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)', color: 'rgba(248,113,113,0.6)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em' }}
                >
                  Delete
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Save status + Undo/Redo — desktop only */}
        <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <motion.button
            onClick={undo} disabled={!canUndo} title="Undo (Cmd+Z)"
            whileHover={canUndo ? { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
            whileTap={canUndo ? { scale: 0.88 } : {}}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{ padding: '5px 8px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.06)', color: canUndo ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)', cursor: canUndo ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center' }}
          ><UndoIcon size={13} /></motion.button>
          <motion.button
            onClick={redo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)"
            whileHover={canRedo ? { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
            whileTap={canRedo ? { scale: 0.88 } : {}}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{ padding: '5px 8px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.06)', color: canRedo ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)', cursor: canRedo ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center' }}
          ><RedoIcon size={13} /></motion.button>
          {/* Save status — animated pill */}
          <AnimatePresence mode="wait">
            <motion.div
              key={saveState}
              initial={{ opacity: 0, scale: 0.85, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 4 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '4px 9px', borderRadius: '100px',
                background: saveState === 'saved' ? 'rgba(163,177,138,0.14)' : 'rgba(251,146,60,0.12)',
              }}
            >
              {saveState === 'saved'
                ? <><SavedIcon size={10} color="#A3B18A" /><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A3B18A', letterSpacing: '0.04em' }}>Saved</span></>
                : <><UnsavedIcon size={10} color="#fb923c" /><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fb923c', letterSpacing: '0.04em' }}>Unsaved</span></>}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Device switcher — desktop only, animated sliding pill */}
        <div style={{ display: isMobile ? 'none' : 'flex', gap: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px', flexShrink: 0, position: 'relative' }}>
          {(Object.entries(DEVICE_DIMS) as [DeviceMode, typeof DEVICE_DIMS[DeviceMode]][]).map(([mode, { icon: Icon, label }]) => (
            <motion.button
              key={mode}
              onClick={() => setDevice(mode)}
              title={label}
              whileHover={{ color: device === mode ? '#fff' : 'rgba(255,255,255,0.75)' }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              style={{
                padding: '5px 9px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: 'transparent',
                color: device === mode ? '#fff' : 'rgba(255,255,255,0.4)',
                display: 'flex', position: 'relative', zIndex: 1,
              }}
            >
              {device === mode && (
                <motion.div
                  layoutId="device-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: '6px',
                    background: 'rgba(255,255,255,0.14)',
                    zIndex: -1,
                  }}
                />
              )}
              <Icon size={14} />
            </motion.button>
          ))}
        </div>

        {/* Language picker — desktop only, shown only when translations exist */}
        {!isMobile && manifest.translations && Object.keys(manifest.translations).length > 0 && (
          <select
            value={manifest.activeLocale || 'en'}
            onChange={(e) => {
              const next = { ...manifest, activeLocale: e.target.value };
              pushHistory(next);
              onChange(next);
              pushToPreview(next);
            }}
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', borderRadius: '0.5rem', padding: '0.3rem 0.5rem',
              fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            <option value="en">🌐 EN</option>
            {Object.keys(manifest.translations).map(locale => (
              <option key={locale} value={locale}>{locale.toUpperCase()}</option>
            ))}
          </select>
        )}

        {/* Preview + Publish — desktop only */}
        <div style={{ display: isMobile ? 'none' : 'flex', gap: '6px', flexShrink: 0 }}>
          {/* Split view toggle */}
          <motion.button
            onClick={() => setSplitView(v => !v)}
            title="Toggle split-pane preview"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 10px', borderRadius: '6px',
              border: `1px solid ${splitView ? 'rgba(163,177,138,0.5)' : 'rgba(255,255,255,0.12)'}`,
              background: splitView ? 'rgba(163,177,138,0.15)' : 'transparent',
              color: splitView ? 'var(--eg-accent, #A3B18A)' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
            }}
          >
            <Columns2 size={13} /> Split
          </motion.button>
          <motion.button
            onClick={() => {
              storePreview(previewKey, manifest, coupleNames);
              window.open(`/preview?key=${previewKey}`, '_blank');
            }}
            title="Preview site (Cmd+P)"
            whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.07)' }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 13px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent', color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
            }}
          >
            <PreviewIcon size={13} /> Preview
          </motion.button>
          <motion.button
            onClick={() => { setPublishError(null); setPublishedUrl(null); setShowPublish(true); }}
            title="Publish your site"
            whileHover={{ scale: 1.06, boxShadow: '0 6px 24px rgba(163,177,138,0.55)' }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 20 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 16px', borderRadius: '7px', border: 'none',
              background: 'linear-gradient(135deg, #A3B18A 0%, #8a9d72 100%)',
              color: 'var(--eg-bg, #F5F1E8)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
              boxShadow: '0 2px 12px rgba(163,177,138,0.35)',
            }}
          >
            <PublishIcon size={13} /> Publish
          </motion.button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR — Premium icon rail + resizable panel (desktop only) ── */}
        {!isMobile && (
          <EditorSidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            contentRef={contentPanelRef}
            footer={
              <div style={{ padding: '10px 12px', display: 'flex', gap: '8px' }}>
                {/* Preview Site — outline */}
                <motion.button
                  onClick={() => {
                    storePreview(previewKey, manifest, coupleNames);
                    window.open(`/preview?key=${previewKey}`, '_blank');
                  }}
                  whileHover={{ scale: 1.04, backgroundColor: 'rgba(163,177,138,0.1)', color: '#fff' }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '9px 10px', borderRadius: '8px',
                    border: '1px solid rgba(163,177,138,0.4)',
                    background: 'transparent', color: 'rgba(255,255,255,0.75)',
                    cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                    whiteSpace: 'nowrap', minHeight: '38px',
                  }}
                >
                  <Eye size={12} /> Preview
                </motion.button>
                {/* Publish — filled olive gradient */}
                <motion.button
                  onClick={() => { setPublishError(null); setPublishedUrl(null); setShowPublish(true); }}
                  whileHover={{ scale: 1.06, boxShadow: '0 6px 20px rgba(163,177,138,0.55)', y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '9px 10px', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #A3B18A 0%, #8a9d72 100%)',
                    color: '#F5F1E8', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(163,177,138,0.35)',
                    whiteSpace: 'nowrap', minHeight: '38px',
                  }}
                >
                  <Globe size={12} /> Publish
                </motion.button>
              </div>
            }
          >
            {activeTab === 'story' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)' }}>
                    Story Chapters ({chapters.length})
                  </span>
                  <motion.button
                    onClick={addChapter}
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

                {/* ── Global timeline format switcher ── */}
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
                          onClick={() => handleDesignChange({ ...manifest, layoutFormat: fmt.id as StoryManifest['layoutFormat'] })}
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

                <Reorder.Group axis="y" values={chapters} onReorder={handleReorder} as="div" style={{ margin: 0, padding: 0 }}>
                  <AnimatePresence>
                    {chapters.map((ch, i) => (
                      <SectionItem
                        key={ch.id}
                        chapter={ch}
                        index={i}
                        isActive={activeId === ch.id}
                        onSelect={setActiveId}
                        onDelete={deleteChapter}
                        onUpdate={updateChapter}
                        voiceSamples={manifest.voiceSamples}
                      />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>

                {/* Blocks palette — drag to canvas — always visible */}
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
                        onUpdate={updateChapter}
                        onAIRewrite={handleAIRewrite}
                        isRewriting={rewritingId === activeChapter.id}
                        vibeSkin={manifest.vibeSkin}
                        vibeString={manifest.vibeString}
                        sectionOverrides={sectionOverridesMap[activeChapter.id]}
                        onOverridesChange={(id, overrides) => {
                          setSectionOverridesMap(prev => ({ ...prev, [id]: overrides }));
                          updateChapter(id, { styleOverrides: { backgroundColor: overrides.backgroundColor, textColor: overrides.textColor, padding: overrides.padding } });
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            <AnimatePresence mode="wait">
              {activeTab === 'design' && (
                <motion.div key="design" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                  <DesignPanel manifest={manifest} onChange={handleDesignChange} />
                </motion.div>
              )}
              {activeTab === 'events' && (
                <motion.div key="events" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                  <EventsPanel manifest={manifest} onChange={handleDesignChange} />
                </motion.div>
              )}
              {activeTab === 'details' && (
                <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                  <DetailsPanel manifest={manifest} onChange={handleDesignChange} subdomain={subdomain} />
                </motion.div>
              )}
              {activeTab === 'pages' && (
                <motion.div key="pages" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                  <PagesPanel manifest={manifest} subdomain={subdomain} onChange={handleDesignChange} />
                </motion.div>
              )}
              {activeTab === 'blocks' && (
                <motion.div key="blocks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                  <AIBlocksPanel
                    manifest={manifest}
                    coupleNames={coupleNames}
                    onChange={(m) => { onChange(m); pushToPreview(m); }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {activeTab === 'voice' && (
              <motion.div key="voice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                <div style={{ padding: '4px 0' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)' }}>
                      AI Voice Training
                    </span>
                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', lineHeight: 1.5 }}>
                      Teach the chatbot to speak like you.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
                    <VoiceTrainerPanel
                      voiceSamples={manifest.voiceSamples || []}
                      onChange={(samples) => {
                        const updated = { ...manifest, voiceSamples: samples };
                        onChange(updated);
                        pushToPreview(updated);
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'canvas' && (
              <CanvasEditor
                manifest={manifest}
                onChange={(m) => { onChange(m); }}
                pushToPreview={pushToPreview}
              />
            )}
          </EditorSidebar>
        )}

        {/* ── CENTER — Live Preview Canvas ── */}
        {/* On mobile: always show the iframe preview full-screen (tabs at bottom for editing) */}
        {/* In split view (desktop only): show PreviewPane. Otherwise show iframe. */}
        {splitView && !isMobile ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            transition: 'flex 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden',
          }}>
            <PreviewPane
              manifest={{ ...manifest, chapters: chapters.map((ch, i) => ({ ...ch, order: i })) }}
              coupleNames={coupleNames}
              vibeSkin={manifest.vibeSkin}
              scale={0.55}
              draggingId={canvasDragId}
              selectedChapterId={activeId}
              onSectionClick={(chapterId) => {
                setActiveId(chapterId);
                setActiveTab('story');
              }}
            />
          </div>
        ) : (
          <div style={{
            flex: 1, background: '#1a1916',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', overflow: 'auto',
            padding: isMobile ? '0' : device === 'desktop' ? '0' : '2rem 2rem 4rem',
            // On mobile: add padding at bottom so content isn't hidden behind tab bar
            paddingBottom: isMobile ? 'calc(56px + env(safe-area-inset-bottom, 0px))' : undefined,
          }}>
            <div style={{
              width: isMobile ? '100%' : DEVICE_DIMS[device].width,
              height: isMobile ? '100%' : '100%',
              flexShrink: 0,
              position: 'relative',
              display: 'flex', flexDirection: 'column',
              boxShadow: !isMobile && device !== 'desktop' ? '0 20px 80px rgba(0,0,0,0.5)' : 'none',
              borderRadius: !isMobile && device !== 'desktop' ? '12px' : 0,
              overflow: 'hidden',
              border: !isMobile && device !== 'desktop' ? '1px solid rgba(255,255,255,0.08)' : 'none',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              {!iframeReady && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#1a1916', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', pointerEvents: 'none',
                }}>
                  {previewSlow ? 'Taking longer than usual… still loading' : 'Loading preview…'}
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={`/preview?key=${previewKey}`}
                style={{ flex: 1, border: 'none', width: '100%', minHeight: isMobile ? '100%' : '600px' }}
                title="Live Preview"
                onLoad={() => {
                  setIframeReady(true);
                  setPreviewSlow(false);
                  // Always push manifest on load — guarantees preview has data
                  // even if the sessionStorage write failed (QuotaExceededError)
                  try {
                    iframeRef.current?.contentWindow?.postMessage({
                      type: 'pearloom-preview-update',
                      manifest: stripArtForStorage(manifest),
                      names: coupleNames,
                    }, '*');
                  } catch {}
                }}
              />
            </div>
          </div>
        )}

      </div>

      {/* ── Mobile bottom tab bar ── */}
      {isMobile && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          zIndex: 1100,
          background: 'var(--eg-dark-2, #3D3530)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'stretch',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
          {(['canvas', 'story', 'events', 'design', 'details', 'blocks', 'voice'] as EditorTab[]).map(tab => {
            const Icon = TAB_ICONS[tab];
            const isActive = activeTab === tab && mobileSheetOpen;
            const labels: Record<string, string> = {
              story: 'Story', canvas: 'Sections', events: 'Events', design: 'Design',
              details: 'Details', blocks: 'AI', voice: 'Voice',
            };
            return (
              <motion.button
                key={tab}
                onClick={() => {
                  if (activeTab === tab && mobileSheetOpen) {
                    setMobileSheetOpen(false);
                  } else {
                    setActiveTab(tab);
                    setMobileSheetOpen(true);
                  }
                }}
                whileTap={{ scale: 0.82 }}
                transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                style={{
                  flex: '0 0 auto', minWidth: '52px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '3px', padding: '6px 8px',
                  border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(109,89,122,0.3)' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                  borderTop: isActive ? '2px solid var(--eg-plum, #6D597A)' : '2px solid transparent',
                  minHeight: '48px',
                }}
              >
                <Icon size={18} color={isActive ? '#fff' : 'rgba(255,255,255,0.35)'} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.1 }}>
                  {labels[tab] || tab}
                </span>
              </motion.button>
            );
          })}
          {/* Spacer to push preview/publish to right */}
          <div style={{ flex: 1 }} />
          {/* Publish */}
          <motion.button
            onClick={() => { setPublishError(null); setPublishedUrl(null); setShowPublish(true); }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 20 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '8px 16px', border: 'none',
              background: 'linear-gradient(135deg, #A3B18A 0%, #8a9d72 100%)',
              color: 'var(--eg-bg, #F5F1E8)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
              borderTop: '2px solid transparent',
              minHeight: '48px',
            }}
          >
            <PublishIcon size={14} />
          </motion.button>
        </div>
      )}

      {/* ── Mobile bottom sheet panel ── */}
      <AnimatePresence>
        {isMobile && mobileSheetOpen && (
          <motion.div
            ref={mobileSheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed', bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
              left: 0, right: 0,
              height: 'calc(80vh - 52px)',
              zIndex: 1050,
              background: 'var(--eg-dark-2, #3D3530)',
              borderRadius: '16px 16px 0 0',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
            onTouchStart={e => { swipeStartY.current = e.touches[0].clientY; }}
            onTouchEnd={e => {
              if (swipeStartY.current !== null) {
                const delta = e.changedTouches[0].clientY - swipeStartY.current;
                if (delta > 80) setMobileSheetOpen(false);
                swipeStartY.current = null;
              }
            }}
          >
            {/* Drag handle */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              padding: '10px 16px 6px', flexShrink: 0,
            }}>
              <div style={{
                width: '36px', height: '4px', borderRadius: '100px',
                background: 'rgba(255,255,255,0.2)',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{
                  fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)',
                }}>
                  {activeTab === 'story' ? 'Story' : activeTab === 'events' ? 'Events' :
                   activeTab === 'design' ? 'Design' : activeTab === 'details' ? 'Details' :
                   activeTab === 'blocks' ? 'AI Blocks' : activeTab === 'voice' ? 'Voice' : 'Sections'}
                </span>
                <button
                  onClick={() => setMobileSheetOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px',
                    color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '5px 12px',
                    fontSize: '0.72rem', fontWeight: 700, minHeight: '32px',
                  }}
                >
                  Done
                </button>
              </div>
            </div>

            {/* Scrollable panel content — same as desktop sidebar */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '8px 12px 16px',
              WebkitOverflowScrolling: 'touch',
            } as React.CSSProperties}>
              {activeTab === 'story' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)' }}>
                      Story Chapters
                    </span>
                    <motion.button
                      onClick={addChapter}
                      whileHover={{ scale: 1.06, backgroundColor: 'rgba(163,177,138,0.26)' }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '8px 14px', borderRadius: '5px', border: 'none',
                        background: 'rgba(163,177,138,0.18)', color: 'var(--eg-accent, #A3B18A)',
                        cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                        minHeight: '44px',
                      }}
                    >
                      <Plus size={13} /> Add
                    </motion.button>
                  </div>
                  {/* Horizontal swipeable chapter cards on mobile */}
                  <div style={{
                    display: 'flex', gap: '10px', overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch', paddingBottom: '8px', marginBottom: '12px',
                  } as React.CSSProperties}>
                    {chapters.map((ch, i) => {
                      const thumb = getThumb(ch);
                      const isActive = activeId === ch.id;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => setActiveId(ch.id)}
                          style={{
                            flexShrink: 0, width: '100px', borderRadius: '10px', border: 'none',
                            background: isActive ? 'rgba(163,177,138,0.18)' : 'rgba(255,255,255,0.05)',
                            outline: isActive ? '2px solid rgba(163,177,138,0.5)' : 'none',
                            cursor: 'pointer', padding: 0, overflow: 'hidden',
                            minHeight: '44px',
                          }}
                        >
                          <div style={{
                            width: '100%', height: '60px',
                            background: thumb ? 'transparent' : 'rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                          }}>
                            {thumb
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={thumb} alt={ch.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                  <Image size={16} color="rgba(255,255,255,0.2)" />
                                </div>}
                          </div>
                          <div style={{ padding: '6px 8px', textAlign: 'left' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isActive ? 'var(--eg-gold, #D6C6A8)' : 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ch.title || 'Untitled'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Ch. {i + 1}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {/* Inline chapter editor */}
                  <AnimatePresence mode="wait">
                    {activeChapter && (
                      <motion.div
                        key={activeChapter.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChapterPanel
                          chapter={activeChapter}
                          onUpdate={updateChapter}
                          onAIRewrite={handleAIRewrite}
                          isRewriting={rewritingId === activeChapter.id}
                          vibeSkin={manifest.vibeSkin}
                          vibeString={manifest.vibeString}
                          sectionOverrides={sectionOverridesMap[activeChapter.id]}
                          onOverridesChange={(id, overrides) => {
                            setSectionOverridesMap(prev => ({ ...prev, [id]: overrides }));
                            updateChapter(id, { styleOverrides: { backgroundColor: overrides.backgroundColor, textColor: overrides.textColor, padding: overrides.padding } });
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
              {activeTab === 'design' && (
                <DesignPanel manifest={manifest} onChange={handleDesignChange} />
              )}
              {activeTab === 'events' && (
                <EventsPanel manifest={manifest} onChange={handleDesignChange} />
              )}
              {activeTab === 'details' && (
                <DetailsPanel manifest={manifest} onChange={handleDesignChange} subdomain={subdomain} />
              )}
              {activeTab === 'pages' && (
                <PagesPanel manifest={manifest} subdomain={subdomain} onChange={handleDesignChange} />
              )}
              {activeTab === 'blocks' && (
                <AIBlocksPanel
                  manifest={manifest}
                  coupleNames={coupleNames}
                  onChange={(m) => { onChange(m); pushToPreview(m); }}
                />
              )}
              {activeTab === 'voice' && (
                <div style={{ padding: '4px 0' }}>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginBottom: '12px', lineHeight: 1.5 }}>
                    Teach the chatbot to speak like you.
                  </p>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
                    <VoiceTrainerPanel
                      voiceSamples={manifest.voiceSamples || []}
                      onChange={(samples) => {
                        const updated = { ...manifest, voiceSamples: samples };
                        onChange(updated);
                        pushToPreview(updated);
                      }}
                    />
                  </div>
                </div>
              )}
              {activeTab === 'canvas' && (
                <CanvasEditor
                  manifest={manifest}
                  onChange={(m) => { onChange(m); }}
                  pushToPreview={pushToPreview}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── "Click to jump" hint toast ── */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed', bottom: '80px', left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1500, pointerEvents: 'none',
              background: 'rgba(20,18,16,0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(163,177,138,0.3)',
              borderRadius: '100px',
              padding: '8px 18px',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            } as React.CSSProperties}
          >
            <span style={{ fontSize: '14px' }}>👆</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>
              Click any section in the preview to jump to it
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI rewrite error toast ── */}
      <AnimatePresence>
        {rewriteError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed', bottom: '80px', left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1500, pointerEvents: 'none',
              background: 'rgba(40,10,10,0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(248,113,113,0.35)',
              borderRadius: '100px',
              padding: '8px 18px',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            } as React.CSSProperties}
          >
            <span style={{ fontSize: '14px' }}>⚠</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(248,113,113,0.9)', whiteSpace: 'nowrap' }}>
              {rewriteError}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 100px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {/* ── PUBLISH MODAL ── */}
      <AnimatePresence>
        {showPublish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 'calc(2rem + env(safe-area-inset-top, 0px)) 2rem calc(2rem + env(safe-area-inset-bottom, 0px))',
            } as React.CSSProperties}
            onClick={() => setShowPublish(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'linear-gradient(160deg, #3d3530 0%, #312b26 100%)',
                borderRadius: '16px 16px 36px 36px',
                padding: '2.5rem', maxWidth: '460px', width: '100%',
                boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07) inset',
                textAlign: 'center',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {/* Subtle pear-glow at bottom */}
              <div style={{
                position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)',
                width: '200px', height: '200px', borderRadius: '50%',
                background: publishedUrl ? 'radial-gradient(circle, rgba(163,177,138,0.18) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(163,177,138,0.08) 0%, transparent 70%)',
                pointerEvents: 'none', transition: 'background 0.6s',
              }} />
              <AnimatePresence mode="wait">
              {publishedUrl ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', position: 'relative' }}
                >
                  {/* Animated globe icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 22, delay: 0.05 }}
                    style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(163,177,138,0.15)', border: '1px solid rgba(163,177,138,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(163,177,138,0.2)' }}
                  >
                    <Globe size={26} color="var(--eg-accent, #A3B18A)" />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 340, damping: 26 }}
                    style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}
                  >
                    It&apos;s Live.
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.25 }}
                    style={{ color: 'rgba(255,255,255,0.48)', margin: 0, fontSize: '0.9rem' }}
                  >
                    Your story is now live at:
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 320, damping: 26 }}
                    style={{ width: '100%', position: 'relative' }}
                  >
                    <code style={{ display: 'block', background: 'rgba(163,177,138,0.1)', border: '1px solid rgba(163,177,138,0.2)', padding: '0.65rem 2.8rem 0.65rem 1.2rem', borderRadius: '10px', fontSize: '0.82rem', color: 'var(--eg-accent, #A3B18A)', wordBreak: 'break-all', textAlign: 'left' }}>
                      {publishedUrl}
                    </code>
                    <motion.button
                      onClick={() => navigator.clipboard?.writeText(publishedUrl!).catch(() => {})}
                      title="Copy link"
                      whileHover={{ scale: 1.15, color: '#A3B18A' }}
                      whileTap={{ scale: 0.88 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                      style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(163,177,138,0.55)', padding: '4px', display: 'flex', alignItems: 'center' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </motion.button>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.26, type: 'spring', stiffness: 300, damping: 26 }}
                    style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}
                  >
                    <motion.a
                      href={publishedUrl!} target="_blank" rel="noreferrer"
                      whileHover={{ scale: 1.04, boxShadow: '0 6px 22px rgba(163,177,138,0.45)' }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                      style={{ flex: 1, padding: '0.9rem', borderRadius: '10px 10px 22px 22px', background: 'linear-gradient(135deg, #A3B18A 0%, #8a9d72 100%)', color: 'var(--eg-bg, #F5F1E8)', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center', display: 'block', boxShadow: '0 3px 12px rgba(163,177,138,0.35)' }}
                    >
                      Open Site →
                    </motion.a>
                    <motion.button
                      onClick={() => { setShowPublish(false); onExit(); }}
                      whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.1)' }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                      style={{ flex: 1, padding: '0.9rem', borderRadius: '10px 10px 22px 22px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                    >
                      Dashboard
                    </motion.button>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="url-picker"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                >
                  <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Choose Your URL</h2>
                  <p style={{ color: 'rgba(255,255,255,0.42)', marginBottom: '2rem', fontSize: '0.88rem' }}>Customize your site address — you can change it anytime.</p>

                  {publishError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ background: 'rgba(185,28,28,0.14)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}
                    >
                      <span style={{ flexShrink: 0 }}>⚠</span>
                      <span>{publishError}</span>
                    </motion.div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)', borderRadius: '0.85rem', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden', marginBottom: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.2) inset' }}>
                    <input
                      value={subdomain}
                      onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="shauna-and-ben"
                      style={{ flex: 1, padding: '0.9rem 1rem', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.95rem', fontFamily: 'inherit' }}
                      disabled={isPublishing}
                      autoFocus
                    />
                    <div style={{ padding: '0.9rem 1rem', color: 'rgba(255,255,255,0.28)', fontSize: '0.82rem', borderLeft: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.03)' }}>
                      .pearloom.com
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <motion.button
                      onClick={() => setShowPublish(false)}
                      disabled={isPublishing}
                      whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.1)' }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      style={{ flex: 1, padding: '0.9rem', borderRadius: '10px 10px 22px 22px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handlePublishSubmit}
                      disabled={isPublishing || !subdomain}
                      whileHover={!isPublishing && subdomain ? { scale: 1.04, boxShadow: '0 6px 24px rgba(163,177,138,0.5)' } : {}}
                      whileTap={!isPublishing && subdomain ? { scale: 0.95 } : {}}
                      transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                      style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.9rem', borderRadius: '10px 10px 22px 22px', background: 'linear-gradient(135deg, #A3B18A 0%, #8a9d72 100%)', color: 'var(--eg-bg, #F5F1E8)', border: 'none', cursor: isPublishing || !subdomain ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.88rem', opacity: isPublishing || !subdomain ? 0.65 : 1, boxShadow: '0 3px 12px rgba(163,177,138,0.3)' }}
                    >
                      {isPublishing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Publishing…</> : <><Globe size={14} /> Publish Site</>}
                    </motion.button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Drag Overlay — ghost card floating under cursor ── */}
      <DragOverlay dropAnimation={null}>
        {canvasDragId && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--eg-accent, #A3B18A)',
            color: '#F5F1E8',
            borderRadius: '8px',
            fontSize: '0.88rem', fontWeight: 700,
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', gap: '8px',
            pointerEvents: 'none',
            border: '1px solid rgba(255,255,255,0.2)',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: '1.2rem' }}>
              {canvasDragId.startsWith('chapter:') ? '⌖' : '✦'}
            </span>
            {canvasDragLabel}
          </div>
        )}
      </DragOverlay>

      {/* ── Floating AI chat assistant ── */}
      <AIEditorChat
        manifest={manifest}
        activeChapterId={activeId}
        onUpdateChapter={updateChapter}
        onUpdateManifest={handleChatManifestUpdate}
      />

      {/* ── Welcome overlay ── */}
      <AnimatePresence>
        {showWelcome && (
          <WelcomeOverlay onDismiss={() => setShowWelcome(false)} />
        )}
      </AnimatePresence>
    </div>
    </DndContext>
  );
}
