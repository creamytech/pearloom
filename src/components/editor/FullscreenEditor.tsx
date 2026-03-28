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
  Image, Calendar, Upload, X, Camera, LayoutTemplate,
  Eye, Settings, AlignLeft, Palette, Heart, MapPin, Clock, ChevronDown,
  MessageCircleHeart,
} from 'lucide-react';
import type { StoryManifest, Chapter, ChapterImage, WeddingEvent, FaqItem, HotelBlock, TravelInfo } from '@/types';
import { AIBlocksPanel } from './AIBlocksPanel';
import { VoiceTrainerPanel } from './VoiceTrainerPanel';
import { CanvasEditor } from './CanvasEditor';
import { ColorPalettePanel } from './ColorPalettePanel';

// ── Types ──────────────────────────────────────────────────────
type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type EditorTab = 'story' | 'events' | 'design' | 'details' | 'pages' | 'blocks' | 'voice' | 'canvas';

const DEVICE_DIMS: Record<DeviceMode, { width: string; label: string; icon: React.ElementType }> = {
  desktop: { width: '100%',    label: 'Desktop', icon: Monitor },
  tablet:  { width: '768px',   label: 'Tablet',  icon: Tablet  },
  mobile:  { width: '390px',   label: 'Mobile',  icon: Smartphone },
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

// ── Events Panel ───────────────────────────────────────────────
function EventsPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const events = manifest.events || [];

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
    onChange({ ...manifest, events: [...events, newEvent] });
  };

  const updateEvent = (id: string, data: Partial<WeddingEvent>) => {
    onChange({ ...manifest, events: events.map(e => e.id === id ? { ...e, ...data } : e) });
  };

  const removeEvent = (id: string) => {
    onChange({ ...manifest, events: events.filter(e => e.id !== id) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
          {manifest.occasion === 'birthday' ? 'Party Events' : manifest.occasion === 'anniversary' ? 'Anniversary Events' : 'Wedding Events'}
        </span>
        <button
          onClick={addEvent}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '5px', border: 'none', background: 'rgba(184,146,106,0.18)', color: '#b8926a', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
        >
          <Plus size={11} /> Add
        </button>
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255,255,255,0.2)' }}>
          <Calendar size={24} style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '0.78rem' }}>No events yet</div>
          <div style={{ fontSize: '0.68rem', marginTop: '4px' }}>Add your ceremony, reception, etc.</div>
        </div>
      ) : (
        events.map((evt) => (
          <div key={evt.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b8926a' }}>{evt.name || 'Event'}</div>
              <button onClick={() => removeEvent(evt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: '2px', display: 'flex' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'; }}
              >
                <X size={12} />
              </button>
            </div>
            <Field label="Event Name" value={evt.name} onChange={v => updateEvent(evt.id, { name: v })} placeholder="Ceremony" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <Field label="Date" value={evt.date} onChange={v => updateEvent(evt.id, { date: v })} placeholder="2024-09-14" />
              <Field label="Time" value={evt.time} onChange={v => updateEvent(evt.id, { time: v })} placeholder="5:00 PM" />
            </div>
            <Field label="Venue" value={evt.venue} onChange={v => updateEvent(evt.id, { venue: v })} placeholder="The Grand Ballroom" />
            <Field label="Address" value={evt.address} onChange={v => updateEvent(evt.id, { address: v })} placeholder="123 Main St, New York, NY" />
            <Field label="Dress Code" value={evt.dressCode || ''} onChange={v => updateEvent(evt.id, { dressCode: v })} placeholder="Black Tie" />
          </div>
        ))
      )}
    </div>
  );
}

// ── Details Panel — Travel, FAQ, Registry, Logistics ──────────
function DetailsPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const logistics = manifest.logistics || {};
  const [openSection, setOpenSection] = useState<'logistics' | 'travel' | 'faq' | 'registry' | 'vibe'>('logistics');

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

  const Section = ({ id, label, emoji, children }: { id: typeof openSection; label: string; emoji: string; children: React.ReactNode }) => (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpenSection(openSection === id ? 'logistics' : id)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer',
          color: openSection === id ? '#b8926a' : 'rgba(255,255,255,0.5)',
        }}
      >
        <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {emoji} {label}
        </span>
        <ChevronDown size={12} style={{ transform: openSection === id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {openSection === id && <div style={{ paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <Section id="logistics" label="Logistics" emoji="📅">
        <Field label="Wedding Date" value={logistics.date || ''} onChange={v => upd({ date: v })} placeholder="2025-09-14" />
        <Field label="Ceremony Time" value={logistics.time || ''} onChange={v => upd({ time: v })} placeholder="5:00 PM" />
        <Field label="Venue" value={logistics.venue || ''} onChange={v => upd({ venue: v })} placeholder="The Grand Ballroom" />
        <Field label="RSVP Deadline" value={logistics.rsvpDeadline || ''} onChange={v => upd({ rsvpDeadline: v })} placeholder="2025-08-01" />
      </Section>

      <Section id="travel" label="Travel & Hotels" emoji="✈️">
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
          <button onClick={addHotel} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '5px', border: 'none', background: 'rgba(184,146,106,0.18)', color: '#b8926a', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700 }}>
            <Plus size={10} /> Add Hotel
          </button>
        </div>
        {(travel.hotels || []).map((hotel, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#b8926a' }}>Hotel {i + 1}</span>
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

      <Section id="faq" label="FAQ" emoji="❓">
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={addFaq} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '5px', border: 'none', background: 'rgba(184,146,106,0.18)', color: '#b8926a', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700 }}>
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
        {faqs.length === 0 && <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '1rem 0' }}>No FAQs yet — add common guest questions</p>}
      </Section>

      <Section id="registry" label="Registry" emoji="🎁">
        <Field label="Cash Fund URL (optional)" value={manifest.registry?.cashFundUrl || ''} onChange={v => updRegistry({ cashFundUrl: v })} placeholder="https://hitchd.com/..." />
        <Field label="Cash Fund Message" value={manifest.registry?.cashFundMessage || ''} onChange={v => updRegistry({ cashFundMessage: v })} placeholder="We're saving for our honeymoon!" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <label style={{ ...lbl, margin: 0 }}>Registry Links ({entries.length})</label>
          <button onClick={addEntry} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '5px', border: 'none', background: 'rgba(184,146,106,0.18)', color: '#b8926a', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700 }}>
            <Plus size={10} /> Add Registry
          </button>
        </div>
        {entries.map((entry, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#b8926a' }}>Registry {i + 1}</span>
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
        {entries.length === 0 && <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '0.5rem 0' }}>No registries yet</p>}
      </Section>

      <Section id="vibe" label="Site Vibe" emoji="✨">
        <div>
          <label style={lbl}>Vibe String</label>
          <textarea
            value={manifest.vibeString || ''}
            onChange={e => onChange({ ...manifest, vibeString: e.target.value })}
            rows={3}
            placeholder="intimate, golden hour, wildflower meadow..."
            style={{ ...inp, resize: 'vertical', lineHeight: 1.65 }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(184,146,106,0.6)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
          />
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.4rem', lineHeight: 1.5 }}>
            Used by the AI when rewriting chapters and generating art.
          </div>
        </div>
      </Section>
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
  { id: 'home',     slug: '',         label: 'Home',     icon: '🏠', alwaysOn: true,  occasions: ['wedding', 'anniversary', 'engagement', 'birthday', 'story'] },
  { id: 'schedule', slug: 'schedule', label: 'Schedule', icon: '📅', alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'rsvp',     slug: 'rsvp',     label: 'RSVP',     icon: '💌', alwaysOn: false, occasions: ['wedding', 'engagement', 'birthday'] },
  { id: 'travel',   slug: 'travel',   label: 'Travel',   icon: '✈️', alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'venue',    slug: 'venue',    label: 'Venue',    icon: '🏛️', alwaysOn: false, occasions: ['wedding', 'engagement'] },
  { id: 'registry', slug: 'registry', label: 'Registry', icon: '🎁', alwaysOn: false, occasions: ['wedding', 'engagement', 'birthday'] },
  { id: 'faq',      slug: 'faq',      label: 'FAQ',      icon: '❓', alwaysOn: false, occasions: ['wedding', 'engagement'] },
];

function PagesPanel({ manifest, subdomain, onChange }: { manifest: StoryManifest; subdomain: string; onChange: (m: StoryManifest) => void }) {
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');

  const occasion = (manifest.occasion || 'wedding') as OccasionType;
  const filteredPresets = ALL_SITE_PAGES.filter(p => p.occasions.includes(occasion));

  const enabled = new Set<string>(
    manifest.blocks?.flatMap(b =>
      b.type === 'event' ? ['schedule', 'rsvp'] : [b.type]
    ) || []
  );
  const baseUrl = subdomain ? `https://${subdomain}.pearloom.app` : '';
  const customPages = manifest.customPages || [];

  const addCustomPage = () => {
    if (!newPageTitle.trim()) return;
    const slug = newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newPage = {
      id: `page-${Date.now()}`,
      slug,
      title: newPageTitle.trim(),
      icon: '📄',
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
        <span style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
          Site Pages
        </span>
        <button
          onClick={() => setShowAddPage(!showAddPage)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 8px', borderRadius: '5px', border: 'none',
            background: 'rgba(184,146,106,0.18)', color: '#b8926a',
            cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700,
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
            <div style={{ background: 'rgba(184,146,106,0.08)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(184,146,106,0.2)' }}>
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
                    background: newPageTitle.trim() ? '#b8926a' : 'rgba(255,255,255,0.1)',
                    color: newPageTitle.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                    fontSize: '0.72rem', fontWeight: 700, cursor: newPageTitle.trim() ? 'pointer' : 'not-allowed',
                  }}
                >Add</button>
              </div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>
                URL: {baseUrl}/{newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '...'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preset pages */}
      <div style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: '4px', marginTop: '4px' }}>
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

        return (
          <div key={page.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px 8px 12px', borderRadius: '10px',
            background: isActive ? 'rgba(184,146,106,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isActive ? 'rgba(184,146,106,0.3)' : 'rgba(255,255,255,0.06)'}`,
          }}>
            <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{page.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isActive ? '#fff' : 'rgba(255,255,255,0.35)' }}>{page.label}</div>
              {subdomain && <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.15)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>}
            </div>
            <span style={{
              fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: isActive ? '#4ade80' : 'rgba(255,255,255,0.2)',
              background: isActive ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
              padding: '2px 6px', borderRadius: '100px',
            }}>{isActive ? 'Live' : 'Inactive'}</span>
          </div>
        );
      })}

      {/* Custom pages */}
      {customPages.length > 0 && (
        <>
          <div style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', margin: '12px 0 4px' }}>
            Custom Pages
          </div>
          {customPages.map(page => (
            <div key={page.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px 8px 12px', borderRadius: '10px',
              background: 'rgba(184,146,106,0.08)',
              border: '1px solid rgba(184,146,106,0.2)',
            }}>
              <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{page.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>{page.title}</div>
                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.15)', marginTop: '1px' }}>{baseUrl}/{page.slug}</div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <span style={{
                  fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '2px 6px', borderRadius: '100px',
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

      <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(184,146,106,0.06)', borderRadius: '8px', border: '1px dashed rgba(184,146,106,0.2)' }}>
        <p style={{ fontSize: '0.68rem', color: 'rgba(184,146,106,0.7)', lineHeight: 1.5, margin: 0 }}>
          💡 To activate built-in pages, add content in the <strong style={{ color: '#b8926a' }}>Details</strong> tab. Custom pages can be edited in the <strong style={{ color: '#b8926a' }}>Canvas</strong> tab.
        </p>
      </div>
    </div>
  );
}
function DesignPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const updateFont = (key: 'heading' | 'body', val: string) => {
    onChange({ ...manifest, theme: { ...manifest.theme, fonts: { ...manifest.theme.fonts, [key]: val } } });
  };

  const HEADING_FONTS = ['Playfair Display', 'Cormorant Garamond', 'Lora', 'Cinzel', 'DM Serif Display', 'Libre Baskerville', 'Josefin Sans'];
  const BODY_FONTS = ['Inter', 'Outfit', 'DM Sans', 'Work Sans', 'Nunito', 'Roboto', 'Raleway', 'Poppins', 'Lato'];

  const colors = manifest.theme?.colors || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* AI palette + pattern picker */}
      <ColorPalettePanel manifest={manifest} onChange={onChange} />

      {/* Typography */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(184,146,106,0.8)', marginBottom: '0.75rem' }}>
          Typography
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
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
export function FullscreenEditor({ manifest, coupleNames, subdomain: initialSubdomain, onChange, onPublish, onExit }: FullscreenEditorProps) {
  const [chapters, setChapters] = useState<Chapter[]>(
    [...(manifest.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );
  const [activeId, setActiveId] = useState<string | null>(chapters[0]?.id || null);
  const [activeTab, setActiveTab] = useState<EditorTab>('story');
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [rewritingId, setRewritingId] = useState<string | null>(null);
  const [previewKey] = useState(() => `${PREVIEW_KEY}-${Date.now()}`);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── Unsaved changes indicator ──
  const [saveState, setSaveState] = useState<'saved' | 'unsaved'>('saved');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── Undo/Redo history ──
  const historyRef = useRef<StoryManifest[]>([manifest]);
  const historyIndexRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

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
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(previewKey, JSON.stringify({ manifest: m, names: coupleNames }));
        if (iframeRef.current) {
          iframeRef.current.src = `/preview?key=${previewKey}`;
        }
        // Auto-mark as locally saved 2.5s after last change
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => setSaveState('saved'), 2500);
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
    pushHistory(newManifest);
    onChange(newManifest);
    pushToPreview(newManifest);
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

  const handleReorder = useCallback((newOrder: Chapter[]) => {
    setChapters(newOrder);
    syncManifest(newOrder);
  }, [syncManifest]);

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
          prompt: `Rewrite this wedding chapter with fresh, intimate, specific language. Keep the same emotional theme but use richer storytelling.

Current title: "${ch.title}"
Current story: "${ch.description}"
Mood: ${ch.mood || 'romantic'}
Vibe: ${manifest.vibeString || ''}

Return JSON with: title, subtitle, description, mood`,
          systemPrompt: 'You are a romantic storytelling AI for Pearloom wedding websites. Write in a warm, cinematic, intimate voice. Return ONLY valid JSON with keys: title, subtitle, description, mood.',
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
        }
      }
    } catch (e) { console.error('AI rewrite failed:', e); }
    finally { setRewritingId(null); }
  }, [chapters, manifest, updateChapter]);

  const TAB_ICONS: Record<EditorTab, React.ElementType> = {
    story: AlignLeft, events: Calendar, canvas: LayoutTemplate, design: Palette, details: Settings, pages: Globe, blocks: Sparkles, voice: MessageCircleHeart,
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

        {/* Save state + Undo/Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={undo} disabled={!canUndo} title="Undo"
            style={{ padding: '5px 8px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.06)', color: canUndo ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', cursor: canUndo ? 'pointer' : 'not-allowed', fontSize: '0.75rem', fontWeight: 700 }}
          >↩</button>
          <button
            onClick={redo} disabled={!canRedo} title="Redo"
            style={{ padding: '5px 8px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.06)', color: canRedo ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', cursor: canRedo ? 'pointer' : 'not-allowed', fontSize: '0.75rem', fontWeight: 700 }}
          >↪</button>
          <span style={{
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
            color: saveState === 'saved' ? '#4ade80' : '#facc15',
            background: saveState === 'saved' ? 'rgba(74,222,128,0.1)' : 'rgba(250,204,21,0.1)',
            padding: '3px 8px', borderRadius: '100px', transition: 'all 0.3s',
          }}>
            {saveState === 'saved' ? '✓ Saved' : '● Unsaved'}
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
          {/* Publish */}
          <button
            onClick={() => { setPublishError(null); setPublishedUrl(null); setShowPublish(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 18px', borderRadius: '6px', border: 'none',
              background: 'linear-gradient(135deg, #b8926a, #d4a574)',
              color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
              boxShadow: '0 4px 12px rgba(184,146,106,0.35)',
              transition: 'all 0.2s',
            }}
          >
            <Globe size={13} /> Publish
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
            {(['story', 'events', 'canvas', 'design', 'details', 'pages', 'blocks', 'voice'] as EditorTab[]).map(tab => {
              const Icon = TAB_ICONS[tab];
              const isBlocks = tab === 'blocks';
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '3px', padding: '6px 4px 8px', borderRadius: '6px 6px 0 0',
                    border: 'none', cursor: 'pointer',
                    background: activeTab === tab
                      ? (isBlocks ? 'rgba(184,146,106,0.1)' : 'rgba(255,255,255,0.05)')
                      : 'transparent',
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

            {activeTab === 'events' && (
              <EventsPanel manifest={manifest} onChange={handleDesignChange} />
            )}

            {activeTab === 'details' && (
              <DetailsPanel manifest={manifest} onChange={handleDesignChange} />
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
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                    AI Voice Training
                  </span>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px', lineHeight: 1.5 }}>
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
            )}

            {activeTab === 'canvas' && (
              <CanvasEditor
                manifest={manifest}
                onChange={(m) => { onChange(m); }}
                pushToPreview={pushToPreview}
              />
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
                    key={activeChapter!.id}
                    chapter={activeChapter!}
                    onUpdate={updateChapter}
                    onAIRewrite={handleAIRewrite}
                    isRewriting={rewritingId === activeChapter!.id}
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

      {/* ── PUBLISH MODAL ── */}
      <AnimatePresence>
        {showPublish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
            }}
            onClick={() => setShowPublish(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#1a1917', borderRadius: '1.5rem',
                padding: '2.5rem', maxWidth: '460px', width: '100%',
                boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center',
              }}
            >
              {publishedUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Globe size={24} color="#22c55e" />
                  </div>
                  <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.8rem', color: '#fff', margin: 0 }}>It&apos;s Live.</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.9rem' }}>Your story is now live at:</p>
                  <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontSize: '0.82rem', color: '#b8926a', wordBreak: 'break-all' }}>
                    {publishedUrl}
                  </code>
                  <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
                    <a
                      href={publishedUrl!} target="_blank" rel="noreferrer"
                      style={{ flex: 1, padding: '0.85rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #b8926a, #d4a574)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' }}
                    >
                      Open Site →
                    </a>
                    <button
                      onClick={() => { setShowPublish(false); onExit(); }}
                      style={{ flex: 1, padding: '0.85rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                    >
                      Dashboard
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem' }}>Choose Your URL</h2>
                  <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '2rem', fontSize: '0.88rem' }}>Customize your site address — you can change it anytime.</p>

                  {publishError && (
                    <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                      {publishError}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: '1.5rem' }}>
                    <input
                      value={subdomain}
                      onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="shauna-and-ben"
                      style={{ flex: 1, padding: '0.85rem 1rem', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.95rem', fontFamily: 'inherit' }}
                      disabled={isPublishing}
                      autoFocus
                    />
                    <div style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', borderLeft: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>
                      .pearloom.app
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => setShowPublish(false)}
                      disabled={isPublishing}
                      style={{ flex: 1, padding: '0.85rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePublishSubmit}
                      disabled={isPublishing || !subdomain}
                      style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.85rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #b8926a, #d4a574)', color: '#fff', border: 'none', cursor: isPublishing || !subdomain ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.88rem', opacity: isPublishing || !subdomain ? 0.7 : 1 }}
                    >
                      {isPublishing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Publishing…</> : <><Globe size={14} /> Publish Site</>}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
