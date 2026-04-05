'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/block-editor.tsx
// Production-grade Block Editor — real DnD via @dnd-kit/sortable
// This file is ALWAYS loaded via dynamic({ ssr: false }) so
// all browser-only dnd-kit APIs are safe here.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  GripVertical, Plus, Trash2, Pencil, Sparkles, Loader2,
  LayoutTemplate, Image, HelpCircle, Map, Gift, Calendar, Check,
  Wand2, Eye, RotateCcw, ChevronDown, ChevronUp, Globe,
  MapPin, Tag, Layout,
} from 'lucide-react';
import type { Chapter, StoryManifest, FaqItem, WeddingEvent } from '@/types';

// ── Types ──────────────────────────────────────────────────────
type BlockType = 'chapter' | 'faq' | 'registry' | 'travel' | 'events' | 'coming-soon';

interface CanvasBlock {
  id: string;
  type: BlockType;
  data: Chapter | FaqItem | WeddingEvent | Record<string, unknown>;
  label: string;
}

interface BlockEditorProps {
  manifest: StoryManifest;
  onChange: (manifest: StoryManifest) => void;
  onSave?: () => void;
  onPreview?: () => void;
}

// ── Constants ──────────────────────────────────────────────────
const BLOCK_CONFIG: Record<BlockType, { label: string; color: string; gradient: string; icon: React.ElementType }> = {
  chapter: { label: 'Chapter', color: '#f0f4ff', gradient: 'linear-gradient(135deg, #667eea22, #764ba222)', icon: Image },
  faq:     { label: 'FAQ',     color: '#f0fdf4', gradient: 'linear-gradient(135deg, #11998e22, #38ef7d22)', icon: HelpCircle },
  events:  { label: 'Event',   color: '#fff7f0', gradient: 'linear-gradient(135deg, #f09a2222, #fc4a1a22)', icon: Calendar },
  registry:{ label: 'Registry',color: '#fdf4ff', gradient: 'linear-gradient(135deg, #a18cd122, #fbc2eb22)', icon: Gift },
  travel:  { label: 'Travel',  color: '#f0faff', gradient: 'linear-gradient(135deg, #4facfe22, #00f2fe22)', icon: Map },
  'coming-soon': { label: 'Coming Soon', color: '#fffbf0', gradient: 'linear-gradient(135deg, #f6d36522, #fda08522)', icon: Globe },
};

const LAYOUT_LABELS: Record<string, string> = {
  editorial: 'Editorial', fullbleed: 'Full Bleed', split: 'Split',
  cinematic: 'Cinematic', gallery: 'Gallery', mosaic: 'Mosaic',
};

// ── Helpers ────────────────────────────────────────────────────
function chaptersToBlocks(manifest: StoryManifest): CanvasBlock[] {
  return (manifest.chapters || [])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(ch => ({ id: ch.id, type: 'chapter' as BlockType, label: ch.title, data: ch }));
}

function blocksToManifest(blocks: CanvasBlock[], manifest: StoryManifest): StoryManifest {
  const chapters = blocks
    .filter(b => b.type === 'chapter')
    .map((b, i) => ({ ...(b.data as Chapter), order: i }));
  return { ...manifest, chapters };
}

function getThumbUrl(chapter: Chapter): string | null {
  const img = chapter.images?.[0];
  if (!img?.url) return null;
  return img.url;
}

// ── DragHandle ─────────────────────────────────────────────────
function DragHandle({ controls }: { controls: ReturnType<typeof useDragControls> }) {
  return (
    <div
      onPointerDown={e => { e.preventDefault(); controls.start(e); }}
      style={{
        cursor: 'grab', padding: '0.5rem 0.25rem', display: 'flex',
        alignItems: 'center', color: 'rgba(0,0,0,0.2)',
        touchAction: 'none', userSelect: 'none', flexShrink: 0,
        transition: 'color 0.15s',
      }}
      onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-olive)'; }}
      onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(0,0,0,0.2)'; }}
    >
      <GripVertical size={18} />
    </div>
  );
}

// ── ChapterCard (inline editor) ────────────────────────────────
interface ChapterCardProps {
  block: CanvasBlock;
  index: number;
  total: number;
  manifest: StoryManifest;
  isEditing: boolean;
  isRewriting: boolean;
  onToggleEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Chapter>) => void;
  onAIRewrite: (id: string) => void;
}

function ChapterCard({
  block, index, total, manifest, isEditing, isRewriting,
  onToggleEdit, onDelete, onUpdate, onAIRewrite,
}: ChapterCardProps) {
  const controls = useDragControls();
  const chapter = block.data as Chapter;
  const thumb = getThumbUrl(chapter);
  const cfg = BLOCK_CONFIG[block.type];
  const BlockIcon = cfg.icon;

  return (
    <Reorder.Item
      value={block}
      id={block.id}
      dragListener={false}
      dragControls={controls}
      as="div"
      style={{ listStyle: 'none' }}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        zIndex: 50,
        cursor: 'grabbing',
      }}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '1rem',
        border: isEditing ? '2px solid var(--pl-olive)' : '1.5px solid rgba(0,0,0,0.06)',
        overflow: 'hidden',
        boxShadow: isEditing
          ? '0 8px 30px rgba(163,177,138,0.16)'
          : '0 2px 12px rgba(0,0,0,0.04)',
        marginBottom: '0.75rem',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        {/* ── Card Header ── */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          gap: 0, minHeight: '80px',
        }}>
          {/* Drag handle strip */}
          <div style={{
            display: 'flex', alignItems: 'center', padding: '0 0.5rem',
            background: 'rgba(0,0,0,0.015)',
            borderRight: '1.5px solid rgba(0,0,0,0.04)',
          }}>
            <DragHandle controls={controls} />
          </div>

          {/* Thumbnail */}
          <div style={{
            width: '72px', flexShrink: 0,
            background: thumb ? 'transparent' : cfg.color,
            position: 'relative', overflow: 'hidden',
          }}>
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb} alt={chapter.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: cfg.gradient,
              }}>
                <BlockIcon size={22} color="var(--pl-olive)" />
              </div>
            )}
            {/* Index badge */}
            <div style={{
              position: 'absolute', top: '6px', left: '6px',
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
              color: '#fff', fontSize: '0.6rem', fontWeight: 800,
              padding: '2px 6px', borderRadius: '100px', letterSpacing: '0.06em',
            }}>
              {index + 1}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '0.875rem 1rem', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
              {/* Block type badge */}
              <span style={{
                fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: 'var(--pl-olive)',
                background: 'var(--pl-olive-mist)', padding: '2px 7px',
                borderRadius: '100px',
              }}>
                {cfg.label}
              </span>
              {/* Layout badge */}
              {chapter.layout && (
                <span style={{
                  fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)',
                  background: 'rgba(0,0,0,0.05)', padding: '2px 7px',
                  borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '3px',
                }}>
                  <Layout size={9} />
                  {LAYOUT_LABELS[chapter.layout] || chapter.layout}
                </span>
              )}
              {/* Mood tag */}
              {chapter.mood && (
                <span style={{
                  fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em',
                  color: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '3px',
                }}>
                  <Tag size={9} /> {chapter.mood}
                </span>
              )}
            </div>

            {/* Title */}
            <div style={{
              fontSize: '1rem', fontWeight: 700,
              fontFamily: `"${manifest.theme?.fonts?.heading || 'Playfair Display'}", serif`,
              color: 'var(--pl-ink)', lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {chapter.title || 'Untitled Chapter'}
            </div>

            {/* Subtitle */}
            {chapter.subtitle && (
              <div style={{
                fontSize: '0.78rem', color: 'var(--pl-muted)', fontStyle: 'italic',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                marginTop: '0.15rem',
              }}>
                {chapter.subtitle}
              </div>
            )}

            {/* Location + date row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
              {chapter.location?.label && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: 'rgba(0,0,0,0.35)' }}>
                  <MapPin size={10} /> {chapter.location.label}
                </span>
              )}
              {chapter.date && (
                <span style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.3)' }}>
                  {new Date(chapter.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              )}
              {chapter.images && chapter.images.length > 0 && (
                <span style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Image size={10} /> {chapter.images.length} photo{chapter.images.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '0.35rem', padding: '0.75rem 0.875rem',
            borderLeft: '1.5px solid rgba(0,0,0,0.04)',
            background: 'rgba(0,0,0,0.01)',
            flexShrink: 0,
          }}>
            {/* AI rewrite */}
            <button
              onClick={() => onAIRewrite(block.id)}
              disabled={isRewriting}
              title="Rewrite with AI"
              style={{
                padding: '0.45rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.08)',
                background: isRewriting ? 'var(--pl-olive-mist)' : 'transparent',
                color: isRewriting ? 'var(--pl-olive)' : 'rgba(0,0,0,0.35)',
                cursor: isRewriting ? 'not-allowed' : 'pointer',
                display: 'flex', transition: 'all 0.15s',
              }}
              onMouseOver={e => { if (!isRewriting) { (e.currentTarget as HTMLElement).style.background = 'var(--pl-olive-mist)'; (e.currentTarget as HTMLElement).style.color = 'var(--pl-olive)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--pl-olive)'; }}}
              onMouseOut={e => { if (!isRewriting) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(0,0,0,0.35)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.08)'; }}}
            >
              {isRewriting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
            </button>

            {/* Edit */}
            <button
              onClick={() => onToggleEdit(block.id)}
              style={{
                padding: '0.45rem 0.7rem', borderRadius: '0.5rem', fontSize: '0.72rem',
                border: `1px solid ${isEditing ? 'var(--pl-olive)' : 'rgba(0,0,0,0.1)'}`,
                background: isEditing ? 'var(--pl-olive)' : 'transparent',
                color: isEditing ? '#fff' : 'rgba(0,0,0,0.5)',
                cursor: 'pointer', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '4px',
                transition: 'all 0.15s',
              }}
            >
              {isEditing ? <><Check size={12} /> Done</> : <><Pencil size={12} /> Edit</>}
            </button>

            {/* Delete */}
            <button
              onClick={() => onDelete(block.id)}
              style={{
                padding: '0.45rem', borderRadius: '0.5rem',
                border: '1px solid rgba(239,68,68,0.15)', background: 'transparent',
                color: 'rgba(239,68,68,0.45)', cursor: 'pointer', display: 'flex',
                transition: 'all 0.15s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.borderColor = '#ef4444'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.45)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.15)'; }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* ── Inline Chapter Editor ── */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              key="editor"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                padding: '1.25rem 1.25rem 1.5rem',
                borderTop: '1.5px solid rgba(163,177,138,0.15)',
                background: 'linear-gradient(to bottom, rgba(163,177,138,0.03), transparent)',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
              }}>
                {/* Title */}
                <div>
                  <label style={labelStyle}>Title</label>
                  <input
                    value={chapter.title || ''}
                    onChange={e => onUpdate(block.id, { title: e.target.value })}
                    style={inputStyle}
                    placeholder="The Rooftop, Brooklyn"
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--pl-olive)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                {/* Subtitle */}
                <div>
                  <label style={labelStyle}>Subtitle</label>
                  <input
                    value={chapter.subtitle || ''}
                    onChange={e => onUpdate(block.id, { subtitle: e.target.value })}
                    style={inputStyle}
                    placeholder="in all the best ways"
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--pl-olive)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                {/* Description */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Story</label>
                  <textarea
                    value={chapter.description || ''}
                    onChange={e => onUpdate(block.id, { description: e.target.value })}
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }}
                    placeholder="Write your memory here..."
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--pl-olive)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                {/* Mood + Layout */}
                <div>
                  <label style={labelStyle}>Mood Tag</label>
                  <input
                    value={chapter.mood || ''}
                    onChange={e => onUpdate(block.id, { mood: e.target.value })}
                    style={inputStyle}
                    placeholder="golden hour"
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--pl-olive)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Layout</label>
                  <select
                    value={chapter.layout || 'editorial'}
                    onChange={e => onUpdate(block.id, { layout: e.target.value as Chapter['layout'] })}
                    style={{
                      ...inputStyle, cursor: 'pointer',
                      appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center',
                    }}
                  >
                    {Object.entries(LAYOUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  );
}

// ── Shared field styles ────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.65rem', fontWeight: 800,
  letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'var(--pl-muted)', marginBottom: '0.5rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.6rem',
  border: '1.5px solid rgba(0,0,0,0.1)', outline: 'none',
  fontSize: '0.88rem', background: '#F5F1E8', fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
  color: 'var(--pl-ink)',
};

// ── AI Block Generator ────────────────────────────────────────
function AIBlockGenerator({ onGenerated, manifest }: { onGenerated: (block: CanvasBlock) => void; manifest: StoryManifest }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/generate-block', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, manifest }),
      });
      const data = await res.json();
      if (data.block) {
        const id = `ai-${Date.now()}`;
        onGenerated({
          id, type: 'chapter', label: data.block.title || 'AI Chapter',
          data: {
            id, date: data.block.date || new Date().toISOString().slice(0, 10),
            title: data.block.title || 'New Chapter', subtitle: data.block.subtitle || '',
            description: data.block.description || '', images: [],
            location: null, mood: data.block.mood || 'romantic', order: 0,
          },
        });
        setPrompt('');
      } else {
        setError('Could not generate. Try again.');
      }
    } catch {
      setError('Generation failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      borderRadius: '1rem', overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.06)',
      background: 'linear-gradient(145deg, #1c1410 0%, #251a10 100%)',
    }}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.875rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ padding: '0.3rem', borderRadius: '0.4rem', background: 'rgba(163,177,138,0.2)' }}>
            <Wand2 size={13} color="var(--pl-olive)" />
          </div>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pl-ink)' }}>
            AI Block Generator
          </span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} color="var(--pl-ink-soft)" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 1rem 1rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                Describe a section and AI will write it instantly.
              </p>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={'e.g. "Write about our first trip to Paris"'}
                rows={3}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '0.55rem',
                  border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(163,177,138,0.06)',
                  color: '#fff', fontSize: '0.82rem', lineHeight: 1.6, resize: 'none',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate(); }}
              />
              {error && <p style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.4rem' }}>{error}</p>}
              <button
                onClick={generate}
                disabled={loading || !prompt.trim()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  width: '100%', marginTop: '0.6rem', padding: '0.7rem',
                  borderRadius: '0.55rem', border: 'none', cursor: prompt.trim() ? 'pointer' : 'not-allowed',
                  background: prompt.trim() ? 'var(--pl-olive)' : 'rgba(0,0,0,0.05)',
                  color: prompt.trim() ? '#fff' : 'rgba(255,255,255,0.28)',
                  fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.04em',
                  transition: 'all 0.2s',
                }}
              >
                {loading
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                  : <><Sparkles size={13} /> Generate Block</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Palette Item ───────────────────────────────────────────────
function PaletteItem({ type, onAdd }: { type: BlockType; onAdd: (t: BlockType) => void }) {
  const cfg = BLOCK_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <motion.button
      onClick={() => onAdd(type)}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        width: '100%', padding: '0.7rem 0.875rem', borderRadius: '0.65rem',
        background: cfg.color, border: '1px solid rgba(0,0,0,0.05)',
        cursor: 'pointer', textAlign: 'left', marginBottom: '0.4rem',
        transition: 'box-shadow 0.15s',
      }}
      onMouseOver={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'; }}
      onMouseOut={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={{
        width: '30px', height: '30px', borderRadius: '0.45rem',
        background: cfg.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={14} color="var(--pl-olive)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pl-ink)' }}>{cfg.label}</div>
      </div>
      <ChevronDown size={12} color="rgba(0,0,0,0.25)" style={{ transform: 'rotate(-90deg)' }} />
    </motion.button>
  );
}

// ── Main BlockEditor ───────────────────────────────────────────
export function BlockEditor({ manifest, onChange, onSave, onPreview }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<CanvasBlock[]>(chaptersToBlocks(manifest));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rewritingId, setRewritingId] = useState<string | null>(null);
  const [aiCount, setAiCount] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncManifest = useCallback((newBlocks: CanvasBlock[]) => {
    onChange(blocksToManifest(newBlocks, manifest));
    setHasChanges(true);
    // Debounced auto-save indicator reset
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, [manifest, onChange]);

  const handleReorder = useCallback((newBlocks: CanvasBlock[]) => {
    setBlocks(newBlocks);
    syncManifest(newBlocks);
  }, [syncManifest]);

  const addBlock = useCallback((type: BlockType) => {
    const id = `block-${Date.now()}`;
    const newBlock: CanvasBlock = {
      id, type, label: `New ${type}`,
      data: type === 'chapter' ? {
        id, date: new Date().toISOString().slice(0, 10),
        title: 'New Chapter', subtitle: 'Add your subtitle here',
        description: 'Write your story…', images: [],
        location: null, mood: 'romantic', order: blocks.length,
      } : {},
    };
    const next = [...blocks, newBlock];
    setBlocks(next);
    syncManifest(next);
    setEditingId(id);
  }, [blocks, syncManifest]);

  const deleteBlock = useCallback((id: string) => {
    const next = blocks.filter(b => b.id !== id);
    setBlocks(next);
    syncManifest(next);
    if (editingId === id) setEditingId(null);
  }, [blocks, editingId, syncManifest]);

  const updateBlock = useCallback((id: string, data: Partial<Chapter>) => {
    const next = blocks.map(b => b.id === id ? { ...b, data: { ...(b.data as Chapter), ...data } } : b);
    setBlocks(next);
    syncManifest(next);
  }, [blocks, syncManifest]);

  const handleAIGenerated = useCallback((block: CanvasBlock) => {
    setAiCount(n => n + 1);
    const next = [...blocks, block];
    setBlocks(next);
    syncManifest(next);
    setEditingId(block.id);
  }, [blocks, syncManifest]);

  const handleAIRewrite = useCallback(async (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block || block.type !== 'chapter') return;
    setRewritingId(id);
    try {
      const chapter = block.data as Chapter;
      const res = await fetch('/api/generate-block', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockType: 'chapter',
          context: { title: chapter.title, description: chapter.description, mood: chapter.mood, vibeString: manifest.vibeString },
          instruction: 'Rewrite this chapter with fresh, more evocative, intimate language.',
        }),
      });
      if (res.ok) {
        const { block: gen } = await res.json();
        if (gen?.data) updateBlock(id, { ...gen.data, id, images: chapter.images, date: chapter.date, order: chapter.order });
      }
    } catch (err) { console.error('AI rewrite failed:', err); }
    finally { setRewritingId(null); }
  }, [blocks, manifest, updateBlock]);

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', minHeight: '600px' }}>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: '272px', flexShrink: 0,
        position: 'sticky', top: '2rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        {/* Header */}
        <div style={{ paddingBottom: '0.25rem' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--pl-olive)', marginBottom: '0.2rem' }}>
            Block Editor
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--pl-ink)' }}>Add Sections</div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {onPreview && (
                <button onClick={onPreview} title="Preview" style={sidebarIconBtn}>
                  <Eye size={13} color="var(--pl-muted)" />
                </button>
              )}
              {onSave && (
                <button
                  onClick={() => { onSave(); setHasChanges(false); }}
                  title="Publish"
                  style={{
                    ...sidebarIconBtn,
                    background: hasChanges ? 'var(--pl-olive)' : 'rgba(0,0,0,0.04)',
                    border: hasChanges ? '1px solid var(--pl-olive)' : '1px solid rgba(0,0,0,0.08)',
                    color: hasChanges ? '#fff' : 'var(--pl-muted)',
                    padding: '0.45rem 0.875rem',
                    gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700,
                    transition: 'all 0.2s',
                  }}
                >
                  <Check size={12} />
                  {hasChanges ? 'Publish' : 'Saved'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {[{ label: 'Blocks', value: blocks.length }, { label: 'AI Made', value: aiCount }].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: '0.75rem', padding: '0.875rem 1rem',
              border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--pl-ink)', fontFamily: 'var(--pl-font-heading)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginTop: '0.3rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* AI Generator */}
        <AIBlockGenerator onGenerated={handleAIGenerated} manifest={manifest} />

        {/* Block Palette */}
        <div style={{
          background: '#fff', borderRadius: '1rem',
          border: '1px solid rgba(0,0,0,0.06)',
          overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}>
          <div style={{
            padding: '0.75rem 0.875rem', borderBottom: '1px solid rgba(0,0,0,0.05)',
            fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--pl-muted)',
          }}>
            Block Palette
          </div>
          <div style={{ padding: '0.625rem' }}>
            {(Object.keys(BLOCK_CONFIG) as BlockType[]).map(t => (
              <PaletteItem key={t} type={t} onAdd={addBlock} />
            ))}
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={() => { setBlocks(chaptersToBlocks(manifest)); setHasChanges(false); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            padding: '0.6rem', borderRadius: '0.65rem', width: '100%',
            border: '1px solid rgba(0,0,0,0.08)', background: 'transparent',
            color: 'var(--pl-muted)', fontSize: '0.75rem', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.2)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.08)'; }}
        >
          <RotateCcw size={12} /> Reset to Saved
        </button>
      </div>

      {/* ── MAIN CANVAS ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Canvas Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.25rem', padding: '0.875rem 1.25rem',
          background: '#fff', borderRadius: '0.875rem',
          border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}>
          <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '0.15rem' }}>
              Page Canvas
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'rgba(0,0,0,0.4)' }}>
              Drag to reorder · click <strong>Edit</strong> to modify · <strong>✦</strong> rewrites with AI
            </div>
          </div>
          <button
            onClick={() => addBlock('chapter')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.1rem', borderRadius: '0.6rem',
              background: 'var(--pl-ink)', color: '#fff', border: 'none',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; }}
          >
            <Plus size={14} /> Add Chapter
          </button>
        </div>

        {/* ── DnD Canvas using Framer Motion Reorder ── */}
        <AnimatePresence>
          {blocks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '320px',
                background: '#fff', borderRadius: '1rem',
                border: '2px dashed rgba(0,0,0,0.09)',
                color: 'var(--pl-muted)', gap: '1rem',
              }}
            >
              <div style={{
                width: '56px', height: '56px', borderRadius: '1rem',
                background: 'rgba(0,0,0,0.04)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <LayoutTemplate size={28} color="rgba(0,0,0,0.15)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', textAlign: 'center', color: 'var(--pl-ink)', marginBottom: '0.35rem' }}>Your canvas is empty</div>
                <div style={{ fontSize: '0.82rem', textAlign: 'center', color: 'var(--pl-muted)' }}>Add blocks from the sidebar or use AI to generate content</div>
              </div>
              <button
                onClick={() => addBlock('chapter')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.7rem 1.5rem', borderRadius: '100px',
                  background: 'var(--pl-olive)', color: '#fff', border: 'none',
                  cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                  boxShadow: '0 8px 20px rgba(163,177,138,0.3)',
                }}
              >
                <Plus size={15} /> Add Your First Block
              </button>
            </motion.div>
          ) : (
            <Reorder.Group
              axis="y"
              values={blocks}
              onReorder={handleReorder}
              as="div"
              style={{ listStyle: 'none', margin: 0, padding: 0 }}
            >
              {blocks.map((block, index) => (
                <ChapterCard
                  key={block.id}
                  block={block}
                  index={index}
                  total={blocks.length}
                  manifest={manifest}
                  isEditing={editingId === block.id}
                  isRewriting={rewritingId === block.id}
                  onToggleEdit={id => setEditingId(editingId === id ? null : id)}
                  onDelete={deleteBlock}
                  onUpdate={updateBlock}
                  onAIRewrite={handleAIRewrite}
                />
              ))}
            </Reorder.Group>
          )}
        </AnimatePresence>

        {/* Drop zone at bottom */}
        {blocks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => addBlock('chapter')}
            whileHover={{ borderColor: 'var(--pl-olive)', color: 'var(--pl-olive)' }}
            style={{
              marginTop: '0.875rem', padding: '1.1rem',
              border: '2px dashed rgba(0,0,0,0.08)', borderRadius: '0.875rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', color: 'rgba(0,0,0,0.22)', fontSize: '0.82rem',
              cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
            }}
          >
            <Plus size={14} /> Add a new block here
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────
const sidebarIconBtn: React.CSSProperties = {
  padding: '0.45rem', borderRadius: '0.5rem',
  border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.03)',
  cursor: 'pointer', display: 'flex', alignItems: 'center',
};
