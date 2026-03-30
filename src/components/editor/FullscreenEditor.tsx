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

function slugDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

// ── Label/Input shared styles ──────────────────────────────────
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.82rem', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--eg-muted, #9A9488)', marginBottom: '0.5rem',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.8rem', borderRadius: '0.5rem',
  border: '1px solid var(--eg-divider, #E6DFD2)', background: 'rgba(255,255,255,0.8)',
  color: 'var(--eg-fg, #2B2B2B)', fontSize: 'max(16px, 0.88rem)', outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
  minHeight: '38px',
};

function Field({ label, value, onChange, rows, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string;
}) {
  if (rows) return (
    <div>
      <label style={lbl}>{label}</label>
      <textarea
        value={value} onChange={e => onChange(e.target.value)} rows={rows}
        placeholder={placeholder}
        style={{ ...inp, resize: 'vertical', lineHeight: 1.65 }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={inp}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
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
function ImageManager({
  images, onUpdate, imagePosition, onPositionChange,
  chapterTitle, chapterMood, chapterDescription, vibeString,
}: {
  images: ChapterImage[];
  onUpdate: (imgs: ChapterImage[]) => void;
  imagePosition?: { x: number; y: number };
  onPositionChange?: (x: number, y: number) => void;
  chapterTitle?: string;
  chapterMood?: string;
  chapterDescription?: string;
  vibeString?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [captionSuccess, setCaptionSuccess] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);

  const removeImage = (idx: number) => {
    onUpdate(images.filter((_, i) => i !== idx));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const MAX_MB = 20;
    const validFiles = Array.from(files).filter(f => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > MAX_MB * 1024 * 1024) {
        alert(`"${f.name}" is too large (max ${MAX_MB}MB). Please compress and try again.`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const results: ChapterImage[] = [];
    for (const file of validFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.publicUrl) {
          results.push({
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url: data.publicUrl,
            alt: file.name.replace(/\.\w+$/, ''),
            width: 0, height: 0,
          });
        } else {
          const msg = data.error || `Upload failed (${res.status})`;
          console.error('[ImageManager] Upload failed:', msg);
          setUploadError(msg);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed — check your connection';
        console.error('[ImageManager] Upload error:', err);
        setUploadError(msg);
      }
    }
    if (results.length > 0) onUpdate([...images, ...results]);
    setUploading(false);
  };

  const handleGenerateCaptions = async () => {
    if (!images.length) return;
    setGeneratingCaptions(true);
    try {
      const res = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrls: images.map(img => img.url),
          chapterTitle: chapterTitle || '',
          chapterMood: chapterMood || '',
          chapterDescription: chapterDescription || '',
          vibeString: vibeString || '',
        }),
      });
      const data = await res.json();
      if (data.captions && Array.isArray(data.captions)) {
        const updated = images.map((img, i) => ({ ...img, caption: data.captions[i] || img.caption }));
        onUpdate(updated);
        setCaptionSuccess(true);
        setTimeout(() => setCaptionSuccess(false), 3000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Caption generation failed';
      setCaptionError(msg);
      setTimeout(() => setCaptionError(null), 5000);
    } finally {
      setGeneratingCaptions(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <label style={lbl}>Photos ({images.length})</label>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '5px 12px', borderRadius: '5px', border: '1px solid rgba(163,177,138,0.4)',
            background: 'rgba(163,177,138,0.15)', color: 'var(--eg-accent, #A3B18A)',
            fontSize: '0.82rem', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1, minHeight: '32px',
          }}
        >
          {uploading
            ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
            : <Upload size={10} />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFileUpload(e.target.files)}
      />

      {/* Photo grid */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const files = e.dataTransfer.files;
          if (files.length > 0) handleFileUpload(files);
        }}
        style={{
          borderRadius: '10px',
          border: isDragging ? '2px dashed rgba(163,177,138,0.7)' : '2px dashed transparent',
          background: isDragging ? 'rgba(163,177,138,0.08)' : 'transparent',
          transition: 'border-color 0.2s, background 0.2s',
          padding: isDragging ? '4px' : '0',
        }}
      >
      {images.length === 0 ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '8px', width: '100%', padding: '1.5rem',
            border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '10px',
            background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.25)',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(163,177,138,0.4)'; (e.currentTarget as HTMLElement).style.color = 'var(--eg-accent, #A3B18A)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}
        >
          <Camera size={20} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Add photos</span>
        </button>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {images.map((img, i) => (
            <div key={img.id || i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Cover image uses PhotoReposition */}
              {i === 0 && onPositionChange ? (
                <PhotoReposition
                  src={img.url}
                  alt={img.alt}
                  onPositionChange={onPositionChange}
                  initialX={imagePosition?.x ?? 50}
                  initialY={imagePosition?.y ?? 50}
                  width="100%"
                  height="100%"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.url} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}
              {/* Remove button */}
              <button
                onClick={() => removeImage(i)}
                style={{
                  position: 'absolute', top: '4px', right: '4px',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', backdropFilter: 'blur(4px)',
                  transition: 'background 0.15s',
                  zIndex: 2,
                }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--eg-plum, #6D597A)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.7)'; }}
              >
                <X size={10} />
              </button>
              {/* Cover badge */}
              {i === 0 && (
                <div style={{
                  position: 'absolute', bottom: '4px', left: '4px',
                  background: 'rgba(163,177,138,0.9)', color: '#fff',
                  fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.1em',
                  textTransform: 'uppercase', padding: '2px 5px', borderRadius: '3px',
                  zIndex: 2,
                }}>Cover</div>
              )}
            </div>
          ))}
          {/* Add more button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              aspectRatio: '1', borderRadius: '8px',
              border: '2px dashed rgba(255,255,255,0.1)', background: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.25)', transition: 'all 0.15s',
            }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(163,177,138,0.4)'; (e.currentTarget as HTMLElement).style.color = 'var(--eg-accent, #A3B18A)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}
          >
            <Plus size={16} />
          </button>
        </div>
      )}
      </div>

      {/* Upload error */}
      {uploadError && (
        <div style={{
          marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px',
          background: 'rgba(185,28,28,0.15)', border: '1px solid rgba(185,28,28,0.3)',
          color: '#fca5a5', fontSize: '0.78rem', lineHeight: 1.4,
        }}>
          Upload failed: {uploadError}
        </div>
      )}

      {/* Generate Captions button */}
      {images.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <button
            onClick={handleGenerateCaptions}
            disabled={generatingCaptions}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              width: '100%', padding: '7px 12px', borderRadius: '6px',
              border: '1px solid rgba(163,177,138,0.3)',
              background: generatingCaptions ? 'rgba(255,255,255,0.04)' : 'rgba(163,177,138,0.1)',
              color: generatingCaptions ? 'rgba(255,255,255,0.4)' : 'var(--eg-accent, #A3B18A)',
              fontSize: '0.82rem', fontWeight: 700, cursor: generatingCaptions ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em', transition: 'all 0.15s',
            }}
            onMouseOver={e => { if (!generatingCaptions) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.2)'; }}
            onMouseOut={e => { if (!generatingCaptions) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.1)'; }}
          >
            {generatingCaptions
              ? <><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Generating captions…</>
              : captionSuccess
                ? <><LoomThreadIcon size={10} /> Captions added!</>
                : <><LoomThreadIcon size={10} /> Generate Captions</>}
          </button>
          {captionError && (
            <div style={{
              marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px',
              background: 'rgba(185,28,28,0.15)', border: '1px solid rgba(185,28,28,0.3)',
              color: '#fca5a5', fontSize: '0.78rem', lineHeight: 1.4,
            }}>
              {captionError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

// ── Events Panel ───────────────────────────────────────────────
const EVENT_TYPE_OPTS: Array<{ type: WeddingEvent['type']; label: string; color: string }> = [
  { type: 'ceremony',      label: 'Ceremony',         color: '#7c5cbf' },
  { type: 'reception',     label: 'Reception',        color: '#e8927a' },
  { type: 'rehearsal',     label: 'Rehearsal Dinner', color: '#4a9b8a' },
  { type: 'welcome-party', label: 'Welcome Party',    color: '#8b4a6a' },
  { type: 'brunch',        label: 'Farewell Brunch',  color: '#c4774a' },
  { type: 'other',         label: 'Other',            color: '#6a8b4a' },
];

function EventsPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const events = manifest.events || [];
  const [expandedId, setExpandedId] = useState<string | null>(events[0]?.id || null);

  const addEvent = () => {
    const newEvent: WeddingEvent = {
      id: `event-${Date.now()}`,
      name: 'New Event',
      type: 'other',
      date: new Date().toISOString().slice(0, 10),
      time: '5:00 PM',
      venue: '',
      address: '',
    };
    const next = [...events, newEvent];
    onChange({ ...manifest, events: next });
    setExpandedId(newEvent.id);
  };

  const updateEvent = (id: string, data: Partial<WeddingEvent>) => {
    onChange({ ...manifest, events: events.map(e => e.id === id ? { ...e, ...data } : e) });
  };

  const removeEvent = (id: string) => {
    onChange({ ...manifest, events: events.filter(e => e.id !== id) });
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
        <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)', whiteSpace: 'nowrap' }}>
          {manifest.occasion === 'birthday' ? 'Party Events' : manifest.occasion === 'anniversary' ? 'Anniversary Events' : 'Wedding Events'}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.2)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <CalendarHeartIcon size={24} style={{ marginBottom: '8px', opacity: 0.4 }} />
          <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>No events yet</div>
          <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Add your ceremony, reception, and more</div>
        </div>
      ) : (
        events.map((evt) => {
          const evtTypeOpt = EVENT_TYPE_OPTS.find(o => o.type === (evt.type || 'other')) || EVENT_TYPE_OPTS[EVENT_TYPE_OPTS.length - 1];
          const isExpanded = expandedId === evt.id;
          return (
            <div key={evt.id} style={{ borderRadius: '10px', border: `1px solid ${isExpanded ? `${evtTypeOpt.color}35` : 'rgba(255,255,255,0.07)'}`, background: isExpanded ? `${evtTypeOpt.color}08` : 'rgba(255,255,255,0.04)', overflow: 'hidden', transition: 'all 0.15s' }}>
              {/* Card header — click to expand */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: evtTypeOpt.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.name || 'Event'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{evt.date}{evt.time ? ` · ${evt.time}` : ''}{evt.venue ? ` · ${evt.venue}` : ''}</div>
                </div>
                <ChevronDown size={13} color="rgba(255,255,255,0.3)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
              </button>

              {/* Expanded editor */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Event type pills */}
                      <div>
                        <label style={lbl}>Event Type</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {EVENT_TYPE_OPTS.map(opt => (
                            <button
                              key={opt.type}
                              onClick={() => updateEvent(evt.id, { type: opt.type })}
                              style={{
                                padding: '5px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                                fontSize: '0.82rem', fontWeight: 700,
                                background: (evt.type || 'other') === opt.type ? opt.color : 'rgba(255,255,255,0.08)',
                                color: (evt.type || 'other') === opt.type ? '#fff' : 'rgba(255,255,255,0.55)',
                                transition: 'all 0.15s',
                              }}
                            >{opt.label}</button>
                          ))}
                        </div>
                      </div>

                      <Field label="Event Name" value={evt.name} onChange={v => updateEvent(evt.id, { name: v })} placeholder="Ceremony" />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={lbl}>Date</label>
                          <input
                            type="date"
                            value={evt.date || ''}
                            onChange={e => updateEvent(evt.id, { date: e.target.value })}
                            style={{ ...inp, colorScheme: 'dark' }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
                          />
                        </div>
                        <Field label="Time" value={evt.time} onChange={v => updateEvent(evt.id, { time: v })} placeholder="5:00 PM" />
                      </div>
                      <Field label="Venue" value={evt.venue} onChange={v => updateEvent(evt.id, { venue: v })} placeholder="The Grand Ballroom" />
                      <Field label="Address" value={evt.address} onChange={v => updateEvent(evt.id, { address: v })} placeholder="123 Main St, New York, NY" />
                      <Field label="Dress Code" value={evt.dressCode || ''} onChange={v => updateEvent(evt.id, { dressCode: v })} placeholder="Black Tie" />

                      {/* Ceremony Details sub-section — shown for ceremony-type events */}
                      {evt.type === 'ceremony' && (
                        <div style={{ marginTop: '0.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)', marginBottom: '0.6rem', opacity: 0.7 }}>
                            Ceremony Details
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Field label="Officiant" value={evt.ceremony?.officiant || ''} onChange={v => updateEvent(evt.id, { ceremony: { ...evt.ceremony, officiant: v } })} placeholder="Pastor Smith" />
                            <Field label="Processional Song" value={evt.ceremony?.processionalSong || ''} onChange={v => updateEvent(evt.id, { ceremony: { ...evt.ceremony, processionalSong: v } })} placeholder="Canon in D" />
                            <Field label="Recessional Song" value={evt.ceremony?.recessionalSong || ''} onChange={v => updateEvent(evt.id, { ceremony: { ...evt.ceremony, recessionalSong: v } })} placeholder="Signed, Sealed, Delivered" />
                            <Field label="Unity Ritual" value={evt.ceremony?.unityRitual || ''} onChange={v => updateEvent(evt.id, { ceremony: { ...evt.ceremony, unityRitual: v } })} placeholder="Unity candle" />
                          </div>
                        </div>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={() => removeEvent(evt.id)}
                        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(109,89,122,0.2)', background: 'rgba(109,89,122,0.06)', color: 'var(--eg-plum, #6D597A)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
                      >
                        <Trash2 size={11} /> Remove Event
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })
      )}

      {/* Add event button */}
      <button
        onClick={addEvent}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', border: '1px dashed rgba(163,177,138,0.4)', background: 'transparent', color: 'var(--eg-accent, #A3B18A)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.15s' }}
        onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.08)'; }}
        onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <Plus size={13} /> Add Event
      </button>
    </div>
  );
}

// ── Details Panel — Travel, FAQ, Registry, Logistics ──────────
function DetailsPanel({ manifest, onChange, subdomain }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void; subdomain?: string }) {
  const logistics = manifest.logistics || {};
  const occasion = manifest.occasion || 'wedding';
  const isEvent = occasion === 'wedding' || occasion === 'engagement';
  const [openSection, setOpenSection] = useState<'couple' | 'theday' | 'registry' | 'rsvp' | 'travel' | 'faq' | 'vibe' | 'seating'>('couple');

  const upd = (data: Partial<typeof logistics>) =>
    onChange({ ...manifest, logistics: { ...logistics, ...data } });

  // ── FAQ helpers ──
  const faqs = manifest.faqs || [];
  const addFaq = () => {
    const newFaq: FaqItem = { id: `faq-${Date.now()}`, question: '', answer: '', order: faqs.length };
    onChange({ ...manifest, faqs: [...faqs, newFaq] });
  };
  const updFaq = (id: string, data: Partial<FaqItem>) =>
    onChange({ ...manifest, faqs: faqs.map(f => f.id === id ? { ...f, ...data } : f) });
  const delFaq = (id: string) =>
    onChange({ ...manifest, faqs: faqs.filter(f => f.id !== id) });

  // ── Registry helpers ──
  const entries = manifest.registry?.entries || [];
  const updRegistry = (patch: Partial<NonNullable<StoryManifest['registry']>>) =>
    onChange({ ...manifest, registry: { ...(manifest.registry || { enabled: true }), ...patch } });
  const addEntry = () =>
    updRegistry({ entries: [...entries, { name: '', url: '', note: '' }] });
  const updEntry = (i: number, data: { name?: string; url?: string; note?: string }) =>
    updRegistry({ entries: entries.map((e, idx) => idx === i ? { ...e, ...data } : e) });
  const delEntry = (i: number) =>
    updRegistry({ entries: entries.filter((_, idx) => idx !== i) });

  // ── Travel helpers ──
  const travel = manifest.travelInfo || { airports: [], hotels: [] };
  const updTravel = (patch: Partial<TravelInfo>) =>
    onChange({ ...manifest, travelInfo: { ...travel, ...patch } });
  const addHotel = () =>
    updTravel({ hotels: [...(travel.hotels || []), { name: '', address: '', bookingUrl: '', groupRate: '', notes: '' }] });
  const updHotel = (i: number, data: Partial<HotelBlock>) =>
    updTravel({ hotels: (travel.hotels || []).map((h, idx) => idx === i ? { ...h, ...data } : h) });
  const delHotel = (i: number) =>
    updTravel({ hotels: (travel.hotels || []).filter((_, idx) => idx !== i) });

  type SectionId = 'couple' | 'theday' | 'registry' | 'rsvp' | 'travel' | 'faq' | 'vibe' | 'seating';
  const Section = ({ id, label, children }: { id: SectionId; label: string; children: React.ReactNode }) => (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpenSection(openSection === id ? 'couple' : id)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer',
          color: openSection === id ? 'var(--eg-gold, #D6C6A8)' : 'rgba(255,255,255,0.6)',
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <ChevronDown size={12} style={{ transform: openSection === id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {openSection === id && <div style={{ paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>}
    </div>
  );

  // Section heading divider style
  const sectionHead = (label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <Section id="couple" label={occasion === 'birthday' ? 'Honoree' : occasion === 'anniversary' ? 'Couple' : 'Couple'}>
        {sectionHead(occasion === 'birthday' ? 'Honoree' : 'Couple')}
        {occasion !== 'birthday' && (
          <Field label="Dress Code" value={logistics.dresscode || ''} onChange={v => upd({ dresscode: v })} placeholder="Black Tie Optional" />
        )}
        <Field
          label={occasion === 'birthday' ? 'Host Notes' : 'Couple Notes'}
          value={logistics.notes || ''}
          onChange={v => upd({ notes: v })}
          placeholder="Additional notes for guests..."
        />
      </Section>

      <Section id="theday" label={occasion === 'birthday' ? 'The Party' : occasion === 'anniversary' ? 'The Celebration' : 'The Day'}>
        {sectionHead(occasion === 'birthday' ? 'The Party' : occasion === 'anniversary' ? 'The Celebration' : 'The Day')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          <div>
            <label style={lbl}>{occasion === 'birthday' ? 'Party Date' : occasion === 'anniversary' ? 'Anniversary Date' : 'Wedding Date'}</label>
            <input
              type="date"
              value={logistics.date || ''}
              onChange={e => upd({ date: e.target.value })}
              style={{ ...inp, colorScheme: 'dark' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
            />
          </div>
          <Field
            label={occasion === 'birthday' ? 'Party Time' : 'Ceremony Time'}
            value={logistics.time || ''}
            onChange={v => upd({ time: v })}
            placeholder="5:00 PM"
          />
        </div>
        {/* Venue search — populates name + address from Google Places */}
        <div style={{ marginBottom: '6px' }}>
          <label style={lbl}>Venue</label>
          {logistics.venue ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(163,177,138,0.1)', border: '1px solid rgba(163,177,138,0.3)', borderRadius: '8px', padding: '8px 10px' }}>
              <LocationPinIcon size={13} color="var(--eg-accent, #A3B18A)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{logistics.venue}</div>
                {logistics.venueAddress && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>{logistics.venueAddress}</div>}
              </div>
              <button
                onClick={() => upd({ venue: '', venueAddress: '', venuePlaceId: '' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '2px', flexShrink: 0, display: 'flex' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; }}
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px' }}>
              <VenueSearch
                placeholder="Search for a venue..."
                onSelect={(venue: VenuePartial) => upd({ venue: venue.name || '', venueAddress: venue.address || '', venuePlaceId: venue.placeId || '' })}
                onAddManually={() => upd({ venue: 'My Venue' })}
              />
            </div>
          )}
        </div>
      </Section>

      <Section id="registry" label="Registry">
        {sectionHead('Registry')}
        {/* Registry enabled toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Registry enabled</span>
          <button
            onClick={() => updRegistry({ enabled: !manifest.registry?.enabled })}
            style={{
              width: '36px', height: '20px', borderRadius: '100px', flexShrink: 0,
              background: manifest.registry?.enabled !== false ? 'var(--eg-accent, #A3B18A)' : 'rgba(255,255,255,0.12)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: '2px', left: manifest.registry?.enabled !== false ? '18px' : '2px',
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s', display: 'block',
            }} />
          </button>
        </div>
        <Field label="Cash Fund URL" value={manifest.registry?.cashFundUrl || ''} onChange={v => updRegistry({ cashFundUrl: v })} placeholder="https://hitchd.com/..." />
        <Field label="Cash Fund Message" value={manifest.registry?.cashFundMessage || ''} onChange={v => updRegistry({ cashFundMessage: v })} placeholder="We are saving for our honeymoon!" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
          <label style={{ ...lbl, margin: 0 }}>Registry Links ({entries.length})</label>
          <button onClick={addEntry} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '5px', border: 'none', background: 'rgba(163,177,138,0.18)', color: 'var(--eg-accent, #A3B18A)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
            <Plus size={10} /> Add Registry
          </button>
        </div>
        {entries.map((entry, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--eg-accent, #A3B18A)' }}>Registry {i + 1}</span>
              <button onClick={() => delEntry(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', display: 'flex', padding: '2px' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'; }}>
                <Trash2 size={11} />
              </button>
            </div>
            <Field label="Store Name" value={entry.name} onChange={v => updEntry(i, { name: v })} placeholder="Williams Sonoma" />
            <Field label="Registry URL" value={entry.url} onChange={v => updEntry(i, { url: v })} placeholder="https://..." />
            <Field label="Note (optional)" value={entry.note || ''} onChange={v => updEntry(i, { note: v })} placeholder="Our kitchen wishlist" />
          </div>
        ))}
        {entries.length === 0 && <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '0.5rem 0' }}>No registries yet</p>}
      </Section>

      <Section id="rsvp" label="RSVP">
        {sectionHead('RSVP')}
        <div>
          <label style={lbl}>RSVP Deadline</label>
          <input
            type="date"
            value={logistics.rsvpDeadline || ''}
            onChange={e => upd({ rsvpDeadline: e.target.value })}
            style={{ ...inp, colorScheme: 'dark' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
          />
        </div>
      </Section>

      <Section id="travel" label="Travel & Hotels">
        {sectionHead('Travel & Hotels')}
        <div>
          <label style={lbl}>Airports (one per line)</label>
          <textarea
            value={(travel.airports || []).join('\n')}
            onChange={e => updTravel({ airports: e.target.value.split('\n').filter(Boolean) })}
            rows={2} placeholder="JFK, LGA, EWR"
            style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
        <div>
          <label style={lbl}>Parking / Directions</label>
          <textarea value={travel.parkingInfo || ''} onChange={e => updTravel({ parkingInfo: e.target.value })} rows={2}
            placeholder="Valet parking available at the venue…" style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
        </div>
        <div>
          <label style={lbl}>Directions</label>
          <textarea value={travel.directions || ''} onChange={e => updTravel({ directions: e.target.value })} rows={2}
            placeholder="Take exit 14B off I-95…" style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <label style={{ ...lbl, margin: 0 }}>Hotels ({(travel.hotels || []).length})</label>
          <button onClick={addHotel} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '5px', border: 'none', background: 'rgba(163,177,138,0.18)', color: 'var(--eg-accent, #A3B18A)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
            <Plus size={10} /> Add Hotel
          </button>
        </div>
        {(travel.hotels || []).map((hotel, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--eg-accent, #A3B18A)' }}>Hotel {i + 1}</span>
              <button onClick={() => delHotel(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', display: 'flex', padding: '2px' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'; }}>
                <Trash2 size={11} />
              </button>
            </div>
            <Field label="Hotel Name" value={hotel.name} onChange={v => updHotel(i, { name: v })} placeholder="Marriott Newport" />
            <Field label="Address" value={hotel.address} onChange={v => updHotel(i, { address: v })} placeholder="123 Main St" />
            <Field label="Booking URL" value={hotel.bookingUrl || ''} onChange={v => updHotel(i, { bookingUrl: v })} placeholder="https://marriott.com/..." />
            <Field label="Group Rate" value={hotel.groupRate || ''} onChange={v => updHotel(i, { groupRate: v })} placeholder="$189/night" />
            <Field label="Notes" value={hotel.notes || ''} onChange={v => updHotel(i, { notes: v })} placeholder="Mention the wedding block…" />
          </div>
        ))}
      </Section>

      <Section id="faq" label="FAQ">
        {sectionHead('FAQ')}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={addFaq} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '5px', border: 'none', background: 'rgba(163,177,138,0.18)', color: 'var(--eg-accent, #A3B18A)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
            <Plus size={10} /> Add Question
          </button>
        </div>
        {faqs.map(faq => (
          <div key={faq.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => delFaq(faq.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', display: 'flex', padding: '2px' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'; }}>
                <Trash2 size={11} />
              </button>
            </div>
            <Field label="Question" value={faq.question} onChange={v => updFaq(faq.id, { question: v })} placeholder="Is the venue wheelchair accessible?" />
            <Field label="Answer" value={faq.answer} onChange={v => updFaq(faq.id, { answer: v })} rows={2} placeholder="Yes, the venue has full accessibility…" />
          </div>
        ))}
        {faqs.length === 0 && <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '1rem 0' }}>No FAQs yet — add common guest questions</p>}
      </Section>

      <Section id="vibe" label="Site Vibe">
        {sectionHead('Site Vibe')}
        <div>
          <label style={lbl}>Vibe String</label>
          <textarea
            value={manifest.vibeString || ''}
            onChange={e => onChange({ ...manifest, vibeString: e.target.value })}
            rows={3}
            placeholder="intimate, golden hour, wildflower meadow..."
            style={{ ...inp, resize: 'vertical', lineHeight: 1.65 }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
          />
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.4rem', lineHeight: 1.5 }}>
            Used by the AI when rewriting chapters and generating art.
          </div>
        </div>

        {/* ── Site Features ── */}
        <div style={{ marginTop: '0.5rem' }}>
          {sectionHead('Features')}

          {/* Guestbook toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Guest Wishes Wall</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: '2px' }}>Let guests leave messages on your site</div>
            </div>
            <button
              onClick={() => onChange({
                ...manifest,
                features: { ...manifest.features, guestbook: !(manifest.features?.guestbook ?? true) }
              })}
              style={{
                width: '40px', height: '22px', borderRadius: '11px',
                background: (manifest.features?.guestbook ?? true) ? 'var(--eg-accent, #A3B18A)' : 'rgba(0,0,0,0.15)',
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: '3px',
                left: (manifest.features?.guestbook ?? true) ? '21px' : '3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                display: 'block',
              }} />
            </button>
          </div>

          {/* Live Updates toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Live Updates Feed</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: '2px' }}>Enable live updates feed for day-of announcements</div>
            </div>
            <button
              onClick={() => onChange({
                ...manifest,
                features: { ...manifest.features, liveUpdates: !(manifest.features?.liveUpdates ?? true) }
              })}
              style={{
                width: '40px', height: '22px', borderRadius: '11px',
                background: (manifest.features?.liveUpdates ?? true) ? 'var(--eg-accent, #A3B18A)' : 'rgba(0,0,0,0.15)',
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: '3px',
                left: (manifest.features?.liveUpdates ?? true) ? '21px' : '3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                display: 'block',
              }} />
            </button>
          </div>
        </div>
      </Section>

      {/* Seating chart — weddings + engagements only */}
      {isEvent && (
        <Section id="seating" label="Seating Chart">
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginBottom: '10px', lineHeight: 1.5 }}>
            Drag guests to tables. Add constraints like &quot;keep together&quot; or &quot;near the exit&quot;.
          </div>
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
            <SeatingCanvas siteId={subdomain || manifest.coupleId || 'draft'} />
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Pages Panel ────────────────────────────────────────────────
// Occasion-aware preset pages + user-created custom pages
type OccasionType = 'wedding' | 'anniversary' | 'engagement' | 'birthday' | 'story';

interface PresetPage {
  id: string; slug: string; label: string; icon: string;
  alwaysOn: boolean;
  occasions: OccasionType[]; // which occasion types this page applies to
}

const ALL_SITE_PAGES: PresetPage[] = [
  { id: 'home',     slug: '',         label: 'Home',     icon: '', alwaysOn: true,  occasions: ['wedding', 'anniversary', 'engagement', 'birthday', 'story'] },
  { id: 'schedule', slug: 'schedule', label: 'Schedule', icon: '', alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'rsvp',     slug: 'rsvp',     label: 'RSVP',     icon: '', alwaysOn: false, occasions: ['wedding', 'engagement', 'birthday'] },
  { id: 'travel',   slug: 'travel',   label: 'Travel',   icon: '', alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'venue',    slug: 'venue',    label: 'Venue',    icon: '', alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'registry',  slug: 'registry',  label: 'Registry',      icon: '', alwaysOn: false, occasions: ['wedding', 'engagement', 'birthday'] },
  { id: 'faq',       slug: 'faq',       label: 'FAQ',           icon: '', alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'guestbook', slug: 'guestbook', label: 'Guest Wishes',  icon: '', alwaysOn: false, occasions: ['wedding', 'anniversary', 'birthday'] },
  { id: 'live',      slug: 'live',      label: 'Day-Of Updates', icon: '', alwaysOn: false, occasions: ['wedding'] },
];

function PagesPanel({ manifest, subdomain, onChange }: { manifest: StoryManifest; subdomain: string; onChange: (m: StoryManifest) => void }) {
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');

  const occasion = (manifest.occasion || 'wedding') as OccasionType;
  const filteredPresets = ALL_SITE_PAGES.filter(p => p.occasions.includes(occasion));

  const togglePageVisibility = (pageId: string) => {
    const hidden = manifest.hiddenPages || [];
    const isHidden = hidden.includes(pageId);
    const next = isHidden ? hidden.filter(id => id !== pageId) : [...hidden, pageId];
    onChange({ ...manifest, hiddenPages: next });
  };

  const enabled = new Set<string>(
    manifest.blocks?.flatMap(b =>
      b.type === 'event' ? ['schedule', 'rsvp'] : [b.type]
    ) || []
  );
  const baseUrl = subdomain ? `https://${subdomain}.pearloom.com` : '';
  const customPages = manifest.customPages || [];

  const addCustomPage = () => {
    if (!newPageTitle.trim()) return;
    const slug = newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newPage = {
      id: `page-${Date.now()}`,
      slug,
      title: newPageTitle.trim(),
      icon: '',
      blocks: [
        { id: `b-text-${Date.now()}`, type: 'text' as const, order: 0, visible: true },
      ],
      visible: true,
      order: customPages.length,
    };
    onChange({ ...manifest, customPages: [...customPages, newPage] });
    setNewPageTitle('');
    setShowAddPage(false);
  };

  const deleteCustomPage = (id: string) => {
    onChange({ ...manifest, customPages: customPages.filter(p => p.id !== id) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)' }}>
          Site Pages
        </span>
        <button
          onClick={() => setShowAddPage(!showAddPage)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '5px 10px', borderRadius: '5px', border: 'none',
            background: 'rgba(163,177,138,0.18)', color: 'var(--eg-accent, #A3B18A)',
            cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
          }}
        >
          <Plus size={11} /> Add Page
        </button>
      </div>

      {/* Add page form */}
      <AnimatePresence>
        {showAddPage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: '8px' }}
          >
            <div style={{ background: 'rgba(163,177,138,0.08)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(163,177,138,0.2)' }}>
              <label style={lbl}>Page Name</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  value={newPageTitle}
                  onChange={e => setNewPageTitle(e.target.value)}
                  placeholder="e.g. Our Engagement, The Venue"
                  style={{ ...inp, flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && addCustomPage()}
                />
                <button
                  onClick={addCustomPage}
                  disabled={!newPageTitle.trim()}
                  style={{
                    padding: '6px 12px', borderRadius: '5px', border: 'none',
                    background: newPageTitle.trim() ? 'var(--eg-accent, #A3B18A)' : 'rgba(255,255,255,0.1)',
                    color: newPageTitle.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                    fontSize: '0.72rem', fontWeight: 700, cursor: newPageTitle.trim() ? 'pointer' : 'not-allowed',
                  }}
                >Add</button>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                URL: {baseUrl}/{newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '...'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preset pages */}
      <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)', marginBottom: '4px', marginTop: '8px' }}>
        Built-in Pages
      </div>
      {filteredPresets.map(page => {
        const isActive = page.alwaysOn || enabled.has(page.slug) ||
          (page.slug === 'travel' && !!manifest.travelInfo?.hotels?.length) ||
          (page.slug === 'registry' && !!(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl)) ||
          (page.slug === 'faq' && !!(manifest.faqs?.length)) ||
          (page.slug === 'schedule' && !!(manifest.events?.length)) ||
          (page.slug === 'rsvp' && !!(manifest.events?.length)) ||
          (page.slug === 'venue' && !!(manifest.logistics?.venue));
        const url = page.slug === '' ? baseUrl : `${baseUrl}/${page.slug}`;
        const isHidden = !page.alwaysOn && (manifest.hiddenPages || []).includes(page.id);

        return (
          <div key={page.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px 8px 12px', borderRadius: '10px',
            background: isActive && !isHidden ? 'rgba(163,177,138,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isActive && !isHidden ? 'rgba(163,177,138,0.3)' : 'rgba(255,255,255,0.06)'}`,
            opacity: isHidden ? 0.4 : 1,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isActive && !isHidden ? '#fff' : 'rgba(255,255,255,0.45)' }}>{page.label}</div>
              {subdomain && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>}
            </div>
            <span style={{
              fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: isActive && !isHidden ? 'var(--eg-accent, #A3B18A)' : 'rgba(255,255,255,0.3)',
              background: isActive && !isHidden ? 'rgba(163,177,138,0.15)' : 'rgba(255,255,255,0.05)',
              padding: '3px 8px', borderRadius: '100px',
            }}>{isActive && !isHidden ? 'Live' : 'Inactive'}</span>
            {!page.alwaysOn && (
              <button
                onClick={() => togglePageVisibility(page.id)}
                title={isHidden ? 'Show page' : 'Hide page'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: isHidden ? '#f87171' : 'rgba(255,255,255,0.3)', display: 'flex', padding: '2px', flexShrink: 0 }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = isHidden ? '#fca5a5' : 'rgba(255,255,255,0.7)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = isHidden ? '#f87171' : 'rgba(255,255,255,0.3)'; }}
              >
                {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            )}
          </div>
        );
      })}

      {/* Custom pages */}
      {customPages.length > 0 && (
        <>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)', margin: '12px 0 4px' }}>
            Custom Pages
          </div>
          {customPages.map(page => (
            <div key={page.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px 8px 12px', borderRadius: '10px',
              background: 'rgba(163,177,138,0.08)',
              border: '1px solid rgba(163,177,138,0.2)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{page.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>{baseUrl}/{page.slug}</div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--eg-accent, #A3B18A)', background: 'rgba(163,177,138,0.15)', padding: '3px 8px', borderRadius: '100px',
                }}>Live</span>
                <button
                  onClick={() => deleteCustomPage(page.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', display: 'flex', padding: '2px' }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'; }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(163,177,138,0.06)', borderRadius: '8px', border: '1px dashed rgba(163,177,138,0.2)' }}>
        <p style={{ fontSize: '0.82rem', color: 'rgba(163,177,138,0.8)', lineHeight: 1.5, margin: 0 }}>
          To activate built-in pages, add content in the <strong style={{ color: 'var(--eg-accent, #A3B18A)' }}>Details</strong> tab. Custom pages can be edited in the <strong style={{ color: 'var(--eg-accent, #A3B18A)' }}>Canvas</strong> tab.
        </p>
      </div>
    </div>
  );
}
function DesignPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');

  const handleRegenerateDesign = async () => {
    setIsRegenerating(true);
    setRegenError('');
    try {
      const res = await fetch('/api/regenerate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibeString: manifest.vibeString,
          coupleNames: [
            manifest.chapters?.[0]?.title?.split(' ')[0] ?? 'Partner',
            manifest.chapters?.[1]?.title?.split(' ')[0] ?? 'Partner',
          ],
          chapters: manifest.chapters?.map(c => ({
            title: c.title, subtitle: c.subtitle,
            mood: c.mood, location: c.location,
            description: c.description,
          })),
        }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const { vibeSkin } = await res.json();
      handleThemeApply(vibeSkin);
    } catch (e) {
      setRegenError('Try again in a moment');
      console.error(e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const updateFont = (key: 'heading' | 'body', val: string) => {
    onChange({ ...manifest, theme: { ...manifest.theme, fonts: { ...manifest.theme.fonts, [key]: val } } });
  };

  const handleThemeApply = (newSkin: VibeSkin) => {
    onChange({
      ...manifest,
      vibeSkin: newSkin,
      theme: {
        ...manifest.theme,
        fonts: { heading: newSkin.fonts.heading, body: newSkin.fonts.body },
        colors: {
          ...manifest.theme.colors,
          background: newSkin.palette.background,
          foreground: newSkin.palette.foreground,
          accent: newSkin.palette.accent,
          muted: newSkin.palette.muted,
        },
      },
    });
  };

  const colors = manifest.theme?.colors || {};
  const vibeSkin = manifest.vibeSkin;
  const paletteColors = vibeSkin?.palette
    ? Object.values(vibeSkin.palette).slice(0, 5)
    : [colors.background, colors.foreground, colors.accent, colors.accentLight, colors.muted].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Theme Switcher ── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
        <ThemeSwitcher
          currentVibeSkin={manifest.vibeSkin ?? ({} as VibeSkin)}
          manifest={manifest}
          onApply={handleThemeApply}
        />
      </div>

      {/* VibeSkin palette swatches */}
      <div id="design-customization" />
      {paletteColors.length > 0 && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)', marginBottom: '8px' }}>
            Current Palette
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {paletteColors.map((c, i) => (
              <div
                key={i}
                title={String(c)}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: String(c),
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
          {/* Tone badge */}
          {vibeSkin?.tone && (
            <div style={{ marginTop: '8px' }}>
              <span style={{
                display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--eg-accent, #A3B18A)',
                background: 'rgba(163,177,138,0.12)', padding: '4px 12px', borderRadius: '100px',
                border: '1px solid rgba(163,177,138,0.25)',
              }}>
                {vibeSkin.tone}
              </span>
            </div>
          )}
          {/* Regenerate design button */}
          <button
            onClick={handleRegenerateDesign}
            disabled={isRegenerating}
            style={{
              marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '7px',
              border: '1px solid rgba(163,177,138,0.25)',
              background: isRegenerating ? 'rgba(163,177,138,0.15)' : 'rgba(163,177,138,0.07)',
              color: 'var(--eg-accent, #A3B18A)', cursor: isRegenerating ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.15s',
              opacity: isRegenerating ? 0.7 : 1,
            }}
            onMouseOver={e => { if (!isRegenerating) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.15)'; }}
            onMouseOut={e => { if (!isRegenerating) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.07)'; }}
          >
            <DesignIcon size={13} />
            {isRegenerating ? 'Generating new design…' : 'Regenerate design'}
          </button>
          {regenError && (
            <p style={{ fontSize: '0.82rem', color: '#e87a7a', marginTop: '4px', marginLeft: '2px' }}>
              {regenError}
            </p>
          )}
        </div>
      )}

      {/* AI palette + pattern picker */}
      <ColorPalettePanel manifest={manifest} onChange={onChange} />

      {/* Typography — full font pair picker */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-gold, #D6C6A8)', marginBottom: '10px' }}>
          Typography
        </div>
        <FontPicker
          currentHeading={manifest.theme?.fonts?.heading || 'Playfair Display'}
          currentBody={manifest.theme?.fonts?.body || 'Inter'}
          onChange={(heading, body) => { updateFont('heading', heading); updateFont('body', body); }}
        />
      </div>

      {/* Asset Library */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-gold, #D6C6A8)', marginBottom: '10px' }}>
          Asset Library
        </div>
        <p style={{ fontSize: '0.82rem', color: 'rgba(214,198,168,0.5)', marginBottom: '10px', lineHeight: 1.5 }}>
          Dividers, illustrations & accents to add to your pages.
        </p>
        <AssetPicker
          onSelect={(asset) => {
            // Store last-selected asset on manifest for canvas insertion
            onChange({ ...manifest, lastAsset: asset as StoryManifest['lastAsset'] });
          }}
        />
      </div>

      {/* Live color preview swatch */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)', marginBottom: '10px' }}>Preview</div>
        <div style={{ borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          <div style={{ background: colors.background || '#faf9f6', padding: '16px' }}>
            <div style={{ fontFamily: `"${manifest.theme?.fonts?.heading || 'Playfair Display'}", serif`, fontSize: '1.1rem', fontWeight: 700, color: colors.foreground || 'var(--eg-fg, #2B2B2B)', marginBottom: '4px' }}>
              Shauna & Ben
            </div>
            <div style={{ color: colors.muted || '#8c8c8c', fontSize: '0.75rem', marginBottom: '10px' }}>The beginning of everything.</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ background: colors.accent || 'var(--eg-accent, #A3B18A)', color: '#fff', padding: '4px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700 }}>RSVP</div>
              <div style={{ background: colors.accentLight || '#f3e8d8', color: colors.accent || 'var(--eg-accent, #A3B18A)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 600 }}>View Story</div>
            </div>
          </div>
          <div style={{ height: '4px', background: colors.accent || 'var(--eg-accent, #A3B18A)' }} />
        </div>
      </div>
    </div>
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
