'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/FullscreenEditor.tsx
// Production-grade full-screen site editor — Webflow-style
// Left nav | Live preview canvas | Right property panel
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, Sparkles, Loader2,
  Globe, Monitor, Tablet, Smartphone, GripVertical,
  Image, Calendar, Upload, X, Camera,
  Eye, Settings, AlignLeft, Palette, Heart,
} from 'lucide-react';
import type { StoryManifest, Chapter, ChapterImage } from '@/types';

// ── Types ──────────────────────────────────────────────────────
type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type EditorTab = 'story' | 'events' | 'design' | 'details';

const DEVICE_DIMS: Record<DeviceMode, { width: string; label: string; icon: React.ElementType }> = {
  desktop: { width: '100%',    label: 'Desktop', icon: Monitor },
  tablet:  { width: '768px',   label: 'Tablet',  icon: Tablet  },
  mobile:  { width: '390px',   label: 'Mobile',  icon: Smartphone },
};

const LAYOUT_OPTS = ['editorial', 'fullbleed', 'split', 'cinematic', 'gallery', 'mosaic'] as const;

interface FullscreenEditorProps {
  manifest: StoryManifest;
  coupleNames: [string, string];
  onChange: (m: StoryManifest) => void;
  onPublish: () => void;
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
  display: 'block', fontSize: '0.6rem', fontWeight: 800,
  letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)', marginBottom: '0.45rem',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.8rem', borderRadius: '0.5rem',
  border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.05)',
  color: '#fff', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
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
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(184,146,106,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,106,0.1)'; }}
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
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(184,146,106,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,106,0.1)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

// ── DragHandle ─────────────────────────────────────────────────
function DragHandle({ controls }: { controls: ReturnType<typeof useDragControls> }) {
  return (
    <div
      onPointerDown={e => { e.preventDefault(); controls.start(e); }}
      style={{
        cursor: 'grab', padding: '0 6px', display: 'flex', alignItems: 'center',
        color: 'rgba(255,255,255,0.2)', touchAction: 'none', userSelect: 'none', flexShrink: 0,
      }}
      onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(184,146,106,0.8)'; }}
      onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'; }}
    >
      <GripVertical size={14} />
    </div>
  );
}

// ── SectionItem in left nav ─────────────────────────────────────
function SectionItem({
  chapter, index, isActive, onSelect, onDelete,
}: {
  chapter: Chapter; index: number; isActive: boolean;
  onSelect: (id: string) => void; onDelete: (id: string) => void;
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
      style={{ marginBottom: '4px', cursor: 'pointer' }}
    >
      <div
        onClick={() => onSelect(chapter.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px', borderRadius: '8px',
          background: isActive ? 'rgba(184,146,106,0.18)' : 'rgba(255,255,255,0.04)',
          border: isActive ? '1px solid rgba(184,146,106,0.35)' : '1px solid transparent',
          transition: 'all 0.15s',
          position: 'relative',
        }}
        onMouseOver={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
        onMouseOut={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
      >
        <DragHandle controls={controls} />

        {/* Thumbnail */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '6px', flexShrink: 0,
          background: thumb ? 'transparent' : 'rgba(255,255,255,0.08)',
          overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {thumb
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={thumb} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Image size={14} color="rgba(255,255,255,0.25)" />
              </div>}
        </div>

        {/* Labels */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.75rem', fontWeight: 700, color: isActive ? 'rgba(184,146,106,1)' : 'rgba(255,255,255,0.85)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}>
            {chapter.title || 'Untitled'}
          </div>
          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>
            Ch. {index + 1} · {slugDate(chapter.date)}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(chapter.id); }}
          style={{
            padding: '4px', borderRadius: '4px', border: 'none',
            background: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer',
            display: 'flex', flexShrink: 0, transition: 'color 0.15s',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'; }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </Reorder.Item>
  );
}

// ── ImageManager ───────────────────────────────────────────────
function ImageManager({
  images, onUpdate,
}: {
  images: ChapterImage[];
  onUpdate: (imgs: ChapterImage[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const removeImage = (idx: number) => {
    onUpdate(images.filter((_, i) => i !== idx));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const results: ChapterImage[] = [];
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      await new Promise<void>(resolve => {
        reader.onload = e => {
          const url = e.target?.result as string;
          results.push({
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url, alt: file.name.replace(/\.\w+$/, ''),
            width: 0, height: 0,
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    onUpdate([...images, ...results]);
    setUploading(false);
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
            padding: '4px 10px', borderRadius: '5px', border: '1px solid rgba(184,146,106,0.3)',
            background: 'rgba(184,146,106,0.1)', color: '#b8926a',
            fontSize: '0.68rem', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
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
      {images.length === 0 ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '8px', width: '100%', padding: '1.5rem',
            border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '10px',
            background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.25)',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,146,106,0.4)'; (e.currentTarget as HTMLElement).style.color = '#b8926a'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}
        >
          <Camera size={20} />
          <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Add photos</span>
        </button>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {images.map((img, i) => (
            <div key={img.id || i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
                }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = '#ef4444'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.7)'; }}
              >
                <X size={10} />
              </button>
              {/* Cover badge */}
              {i === 0 && (
                <div style={{
                  position: 'absolute', bottom: '4px', left: '4px',
                  background: 'rgba(184,146,106,0.9)', color: '#fff',
                  fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.1em',
                  textTransform: 'uppercase', padding: '2px 5px', borderRadius: '3px',
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
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,146,106,0.4)'; (e.currentTarget as HTMLElement).style.color = '#b8926a'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Chapter Property Panel ─────────────────────────────────────
function ChapterPanel({
  chapter, onUpdate, onAIRewrite, isRewriting,
}: {
  chapter: Chapter;
  onUpdate: (id: string, data: Partial<Chapter>) => void;
  onAIRewrite: (id: string) => void;
  isRewriting: boolean;
}) {
  const upd = useCallback((data: Partial<Chapter>) => onUpdate(chapter.id, data), [chapter.id, onUpdate]);

  return (
    <motion.div
      key={chapter.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      {/* Chapter header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <div>
          <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(184,146,106,0.8)', marginBottom: '0.2rem' }}>Chapter</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
            {chapter.title || 'Untitled'}
          </div>
        </div>
        <button
          onClick={() => onAIRewrite(chapter.id)}
          disabled={isRewriting}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(184,146,106,0.3)',
            background: 'rgba(184,146,106,0.12)', color: 'rgba(184,146,106,1)',
            fontSize: '0.7rem', fontWeight: 700, cursor: isRewriting ? 'not-allowed' : 'pointer',
            opacity: isRewriting ? 0.6 : 1, letterSpacing: '0.05em',
          }}
        >
          {isRewriting
            ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
            : <Sparkles size={11} />}
          {isRewriting ? 'Rewriting…' : 'AI Rewrite'}
        </button>
      </div>

      <Field label="Title" value={chapter.title || ''} onChange={v => upd({ title: v })} placeholder="The Rooftop, Brooklyn" />
      <Field label="Subtitle" value={chapter.subtitle || ''} onChange={v => upd({ subtitle: v })} placeholder="in all the best ways" />
      <Field label="Story" value={chapter.description || ''} onChange={v => upd({ description: v })} rows={5} placeholder="Write your memory here..." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <Field label="Mood Tag" value={chapter.mood || ''} onChange={v => upd({ mood: v })} placeholder="golden hour" />
        <div>
          <label style={lbl}>Layout</label>
          <select
            value={chapter.layout || 'editorial'}
            onChange={e => upd({ layout: e.target.value as Chapter['layout'] })}
            style={{ ...inp, cursor: 'pointer' }}
          >
            {LAYOUT_OPTS.map(l => (
              <option key={l} value={l} style={{ background: '#1a1a1a' }}>
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Image Manager */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
        <ImageManager
          images={chapter.images || []}
          onUpdate={imgs => upd({ images: imgs })}
        />
      </div>
    </motion.div>
  );
}

// ── Design Panel ───────────────────────────────────────────────
function DesignPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const updateColor = (key: string, val: string) => {
    onChange({ ...manifest, theme: { ...manifest.theme, colors: { ...manifest.theme.colors, [key]: val } } });
  };
  const updateFont = (key: 'heading' | 'body', val: string) => {
    onChange({ ...manifest, theme: { ...manifest.theme, fonts: { ...manifest.theme.fonts, [key]: val } } });
  };

  const colors = manifest.theme?.colors || {};

  const COLOR_FIELDS = [
    { key: 'background', label: 'Background' },
    { key: 'foreground', label: 'Text' },
    { key: 'accent', label: 'Accent' },
    { key: 'accentLight', label: 'Accent Light' },
    { key: 'muted', label: 'Muted' },
    { key: 'cardBg', label: 'Card Background' },
  ];

  const HEADING_FONTS = ['Playfair Display', 'Cormorant Garamond', 'Lora', 'Cinzel', 'DM Serif Display', 'Libre Baskerville'];
  const BODY_FONTS = ['Inter', 'Outfit', 'DM Sans', 'Work Sans', 'Nunito', 'Roboto'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(184,146,106,0.8)' }}>
        Colors
      </div>
      {COLOR_FIELDS.map(({ key, label }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: (colors as Record<string, string>)[key] || '#fff',
              border: '2px solid rgba(255,255,255,0.15)', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }} />
            <input
              type="color"
              value={(colors as Record<string, string>)[key] || '#ffffff'}
              onChange={e => updateColor(key, e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ ...lbl, marginBottom: '2px' }}>{label}</label>
            <input
              type="text"
              value={(colors as Record<string, string>)[key] || ''}
              onChange={e => updateColor(key, e.target.value)}
              style={{ ...inp, padding: '4px 8px', fontSize: '0.75rem', fontFamily: 'monospace' }}
            />
          </div>
        </div>
      ))}

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(184,146,106,0.8)', marginBottom: '1rem' }}>
          Typography
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={lbl}>Heading Font</label>
            <select value={manifest.theme?.fonts?.heading || 'Playfair Display'} onChange={e => updateFont('heading', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {HEADING_FONTS.map(f => <option key={f} value={f} style={{ background: '#1a1a1a' }}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Body Font</label>
            <select value={manifest.theme?.fonts?.body || 'Inter'} onChange={e => updateFont('body', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {BODY_FONTS.map(f => <option key={f} value={f} style={{ background: '#1a1a1a' }}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Live color preview swatch */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>Preview</div>
        <div style={{ borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          <div style={{ background: colors.background || '#faf9f6', padding: '16px' }}>
            <div style={{ fontFamily: `"${manifest.theme?.fonts?.heading || 'Playfair Display'}", serif`, fontSize: '1.1rem', fontWeight: 700, color: colors.foreground || '#1a1a1a', marginBottom: '4px' }}>
              Shauna & Ben
            </div>
            <div style={{ color: colors.muted || '#8c8c8c', fontSize: '0.75rem', marginBottom: '10px' }}>The beginning of everything.</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ background: colors.accent || '#b8926a', color: '#fff', padding: '4px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700 }}>RSVP</div>
              <div style={{ background: colors.accentLight || '#f3e8d8', color: colors.accent || '#b8926a', padding: '4px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 600 }}>View Story</div>
            </div>
          </div>
          <div style={{ height: '4px', background: colors.accent || '#b8926a' }} />
        </div>
      </div>
    </div>
  );
}

// ── Main FullscreenEditor ──────────────────────────────────────
export function FullscreenEditor({ manifest, coupleNames, onChange, onPublish, onExit }: FullscreenEditorProps) {
  const [chapters, setChapters] = useState<Chapter[]>(
    [...(manifest.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );
  const [activeId, setActiveId] = useState<string | null>(chapters[0]?.id || null);
  const [activeTab, setActiveTab] = useState<EditorTab>('story');
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [rewritingId, setRewritingId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [previewKey] = useState(() => `${PREVIEW_KEY}-${Date.now()}`);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeChapter = chapters.find(c => c.id === activeId) || null;

  // Push manifest changes to iframe preview (debounced 600ms)
  const pushToPreview = useCallback((m: StoryManifest) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(previewKey, JSON.stringify({ manifest: m, names: coupleNames }));
        if (iframeRef.current) {
          iframeRef.current.src = `/preview?key=${previewKey}`;
        }
      } catch {}
    }, 600);
  }, [previewKey, coupleNames]);

  // Initial load
  useEffect(() => {
    pushToPreview(manifest);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncManifest = useCallback((newChapters: Chapter[]) => {
    const newManifest = {
      ...manifest,
      chapters: newChapters.map((ch, i) => ({ ...ch, order: i })),
    };
    onChange(newManifest);
    pushToPreview(newManifest);
  }, [manifest, onChange, pushToPreview]);

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

  const handleReorder = useCallback((newOrder: Chapter[]) => {
    setChapters(newOrder);
    syncManifest(newOrder);
  }, [syncManifest]);

  const handleDesignChange = useCallback((m: StoryManifest) => {
    onChange(m);
    pushToPreview(m);
  }, [onChange, pushToPreview]);

  const handleAIRewrite = useCallback(async (id: string) => {
    const ch = chapters.find(c => c.id === id);
    if (!ch) return;
    setRewritingId(id);
    try {
      const res = await fetch('/api/generate-block', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockType: 'chapter',
          context: { title: ch.title, description: ch.description, mood: ch.mood, vibeString: manifest.vibeString },
          instruction: 'Rewrite with fresh, intimate, specific language.',
        }),
      });
      if (res.ok) {
        const { block } = await res.json();
        if (block?.data) updateChapter(id, { ...block.data, id, images: ch.images, date: ch.date, order: ch.order });
      }
    } catch (e) { console.error('AI rewrite failed:', e); }
    finally { setRewritingId(null); }
  }, [chapters, manifest, updateChapter]);

  const TAB_ICONS: Record<EditorTab, React.ElementType> = {
    story: AlignLeft, events: Calendar, design: Palette, details: Settings,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', flexDirection: 'column',
      background: '#0e0d0c', fontFamily: 'Inter, sans-serif',
    }}>
      {/* ── TOP BAR ── */}
      <div style={{
        height: '52px', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: '#111110', padding: '0 1rem', gap: '1rem',
        zIndex: 10,
      }}>
        {/* Exit */}
        <button
          onClick={onExit}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 10px', borderRadius: '6px', border: 'none',
            background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0,
          }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
        >
          <ArrowLeft size={14} /> Exit
        </button>

        {/* Site name */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Heart size={13} color="#b8926a" fill="#b8926a" />
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
            {coupleNames[0]} & {coupleNames[1]}
          </span>
          <span style={{
            fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em',
            textTransform: 'uppercase', background: 'rgba(184,146,106,0.2)',
            color: 'rgba(184,146,106,0.9)', padding: '2px 8px', borderRadius: '100px',
          }}>
            {chapters.length} chapters
          </span>
        </div>

        {/* Device switcher */}
        <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px', flexShrink: 0 }}>
          {(Object.entries(DEVICE_DIMS) as [DeviceMode, typeof DEVICE_DIMS[DeviceMode]][]).map(([mode, { icon: Icon, label }]) => (
            <button
              key={mode}
              onClick={() => setDevice(mode)}
              title={label}
              style={{
                padding: '5px 9px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: device === mode ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: device === mode ? '#fff' : 'rgba(255,255,255,0.4)',
                display: 'flex', transition: 'all 0.15s',
              }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        {/* Preview + Publish */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => {
              sessionStorage.setItem(previewKey, JSON.stringify({ manifest, names: coupleNames }));
              window.open(`/preview?key=${previewKey}`, '_blank');
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent', color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
            }}
          >
            <Eye size={13} /> Preview
          </button>
          <button
            onClick={() => { setIsPublishing(true); onPublish(); setTimeout(() => setIsPublishing(false), 2000); }}
            disabled={isPublishing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 18px', borderRadius: '6px', border: 'none',
              background: 'linear-gradient(135deg, #b8926a, #d4a574)',
              color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
              boxShadow: '0 4px 12px rgba(184,146,106,0.35)',
              transition: 'all 0.2s', opacity: isPublishing ? 0.7 : 1,
            }}
          >
            {isPublishing
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Publishing…</>
              : <><Globe size={13} /> Publish</>}
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR — Section Nav ── */}
        <div style={{
          width: '248px', flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.06)',
          background: '#111110',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Tab strip */}
          <div style={{
            display: 'flex', padding: '8px 8px 0',
            borderBottom: '1px solid rgba(255,255,255,0.06)', gap: '2px',
          }}>
            {(['story', 'events', 'design', 'details'] as EditorTab[]).map(tab => {
              const Icon = TAB_ICONS[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '3px', padding: '6px 4px 8px', borderRadius: '6px 6px 0 0',
                    border: 'none', cursor: 'pointer',
                    background: activeTab === tab ? 'rgba(255,255,255,0.05)' : 'transparent',
                    borderBottom: activeTab === tab ? '2px solid #b8926a' : '2px solid transparent',
                    color: activeTab === tab ? '#b8926a' : 'rgba(255,255,255,0.3)',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={13} />
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {tab}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
            {activeTab === 'story' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                    Story Chapters
                  </span>
                  <button
                    onClick={addChapter}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 8px', borderRadius: '5px', border: 'none',
                      background: 'rgba(184,146,106,0.18)', color: '#b8926a',
                      cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700,
                    }}
                  >
                    <Plus size={11} /> Add
                  </button>
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
                      />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              </>
            )}

            {activeTab === 'design' && (
              <DesignPanel manifest={manifest} onChange={handleDesignChange} />
            )}

            {(activeTab === 'events' || activeTab === 'details') && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                <Calendar size={28} />
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Coming soon</div>
                <div style={{ fontSize: '0.72rem' }}>Event details are set during generation</div>
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER — Live Preview Canvas ── */}
        <div style={{
          flex: 1, background: '#1a1916',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', overflow: 'auto',
          padding: device === 'desktop' ? '0' : '2rem 2rem 4rem',
        }}>
          <div style={{
            width: DEVICE_DIMS[device].width,
            height: '100%',
            flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            boxShadow: device !== 'desktop' ? '0 20px 80px rgba(0,0,0,0.5)' : 'none',
            borderRadius: device !== 'desktop' ? '12px' : 0,
            overflow: 'hidden',
            border: device !== 'desktop' ? '1px solid rgba(255,255,255,0.08)' : 'none',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <iframe
              ref={iframeRef}
              src={`/preview?key=${previewKey}`}
              style={{ flex: 1, border: 'none', width: '100%', minHeight: '600px' }}
              title="Live Preview"
            />
          </div>
        </div>

        {/* ── RIGHT PANEL — Property Inspector ── */}
        <AnimatePresence>
          {activeTab === 'story' && activeChapter && (
            <motion.div
              key="right-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                flexShrink: 0, overflow: 'hidden',
                borderLeft: '1px solid rgba(255,255,255,0.06)',
                background: '#131211',
              }}
            >
              <div style={{
                width: '300px', height: '100%', overflowY: 'auto',
                padding: '1rem',
              }}>
                {/* Panel header */}
                <div style={{
                  fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
                  marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <Settings size={10} /> Properties
                </div>

                <AnimatePresence mode="wait">
                  <ChapterPanel
                    key={activeChapter.id}
                    chapter={activeChapter}
                    onUpdate={updateChapter}
                    onAIRewrite={handleAIRewrite}
                    isRewriting={rewritingId === activeChapter.id}
                  />
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 100px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
