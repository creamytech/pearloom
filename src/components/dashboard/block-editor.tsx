'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/block-editor.tsx
// Drag-and-Drop Site Block Editor with AI Modal Generation
//
// Architecture:
//  • Left sidebar: block type palette + AI generator
//  • Main canvas: DnD sortable chapter/block list
//  • AI prompt → Gemini → new Chapter block dropped in
//  • Each block: preview card with drag handle, edit, delete
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GripVertical, Plus, Trash2, Pencil, Sparkles, Loader2,
  LayoutTemplate, Image, HelpCircle, Map, Gift, Calendar, Check,
  Wand2, ChevronRight, Eye, RotateCcw
} from 'lucide-react';
import type { Chapter, StoryManifest, FaqItem, WeddingEvent } from '@/types';

// ── Pearloom signature pear-shaped border radius ──
// A pear is rounder at the bottom, narrower at the top.
// Format: top-left top-right bottom-right bottom-left / top-left-v top-right-v bottom-right-v bottom-left-v
const PEAR_RADIUS = '38% 38% 50% 50% / 28% 28% 50% 50%';
const PEAR_RADIUS_CARD = '1rem 1rem 1.75rem 1.75rem'; // subtle pear for cards

// ── Block types a user can drag from the palette ──
type BlockType = 'chapter' | 'faq' | 'registry' | 'travel' | 'events' | 'coming-soon';

interface PaletteBlock {
  type: BlockType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  aiPrompt?: string;
}

const PALETTE_BLOCKS: PaletteBlock[] = [
  { type: 'chapter', label: 'Story Chapter', description: 'A narrative moment with photos + text', icon: Image, color: '#f0f4ff', aiPrompt: 'Create a romantic chapter about a meaningful moment' },
  { type: 'faq', label: 'FAQ', description: 'Questions your guests are asking', icon: HelpCircle, color: '#f0fdf4', aiPrompt: 'Generate 3 common wedding FAQs' },
  { type: 'events', label: 'Wedding Event', description: 'Ceremony, reception, rehearsal dinner', icon: Calendar, color: '#fff7f0', aiPrompt: 'Create a wedding ceremony event block' },
  { type: 'registry', label: 'Registry', description: 'Gift registry links and cash fund', icon: Gift, color: '#fdf4ff', aiPrompt: 'Add a Zola registry card' },
  { type: 'travel', label: 'Travel & Hotel', description: "Hotel blocks and airport info for guests", icon: Map, color: '#f0faff', aiPrompt: 'Create travel info for out-of-town guests' },
];

// ── Draggable block item in the canvas ──
interface CanvasBlock {
  id: string;
  type: BlockType;
  data: Chapter | FaqItem | WeddingEvent | Record<string, unknown>;
  label: string;
}

function getBlockPreview(block: CanvasBlock): string {
  if (block.type === 'chapter') {
    const ch = block.data as Chapter;
    return ch.title || 'Untitled Chapter';
  }
  if (block.type === 'faq') {
    const f = block.data as FaqItem;
    return f.question || 'FAQ';
  }
  if (block.type === 'events') {
    const e = block.data as WeddingEvent;
    return e.name || 'Event';
  }
  if (block.type === 'registry') return 'Registry Section';
  if (block.type === 'travel') return 'Travel & Hotels';
  return block.label;
}

function getBlockColor(type: BlockType): string {
  const p = PALETTE_BLOCKS.find(b => b.type === type);
  return p?.color || '#f9f5f0';
}

function getBlockIcon(type: BlockType): React.ElementType {
  const p = PALETTE_BLOCKS.find(b => b.type === type);
  return p?.icon || LayoutTemplate;
}

// ── Sortable block card ──
interface SortableBlockCardProps {
  block: CanvasBlock;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isEditing: boolean;
  manifest: StoryManifest;
  onUpdate: (id: string, data: Partial<Chapter>) => void;
  onAIRewrite: (id: string) => void;
  isRewriting?: boolean;
  isDragging?: boolean;
}

function SortableBlockCard({ block, onEdit, onDelete, isEditing, manifest, onUpdate, onAIRewrite, isRewriting, isDragging }: SortableBlockCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const colorBg = getBlockColor(block.type);
  const preview = getBlockPreview(block);
  const IconComp = getBlockIcon(block.type);

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        layout
        style={{
          background: '#fff',
          borderRadius: PEAR_RADIUS_CARD,
          border: `1px solid ${isDragging ? 'var(--eg-accent)' : 'rgba(0,0,0,0.06)'}`,
          overflow: 'hidden',
          boxShadow: isDragging ? '0 20px 50px rgba(0,0,0,0.15)' : '0 2px 12px rgba(0,0,0,0.03)',
          marginBottom: '0.75rem',
          transition: 'box-shadow 0.2s, border-color 0.2s',
        }}
      >
        {/* Block header row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.25rem',
          background: isSortableDragging ? colorBg : '#fff',
          borderBottom: isEditing ? '1px solid rgba(0,0,0,0.06)' : 'none',
        }}>
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            style={{
              cursor: 'grab', color: 'rgba(0,0,0,0.25)',
              display: 'flex', flexShrink: 0,
              padding: '0.25rem',
              borderRadius: '0.25rem',
              transition: 'color 0.2s, background 0.2s',
            }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--eg-accent)'; (e.currentTarget as HTMLElement).style.background = colorBg; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(0,0,0,0.25)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <GripVertical size={18} />
          </div>

          {/* Icon + type badge */}
          <div style={{
            width: '34px', height: '34px', borderRadius: '0.5rem',
            background: colorBg, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(IconComp as any)({ size: 16, color: 'var(--eg-accent)' })}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '0.2rem' }}>
              {block.type}
            </div>
            <div style={{
              fontSize: '0.95rem', fontWeight: 600, color: 'var(--eg-fg)',
              fontFamily: block.type === 'chapter' ? `"${manifest.theme.fonts.heading}", serif` : 'inherit',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {preview}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
            {block.type === 'chapter' && (
              <>
                {/* AI Rewrite */}
                <button
                  onClick={() => onAIRewrite(block.id)}
                  disabled={isRewriting}
                  title="Rewrite with AI"
                  style={{
                    padding: '0.4rem', borderRadius: '0.5rem',
                    border: '1px solid rgba(0,0,0,0.1)', background: 'transparent',
                    color: isRewriting ? 'var(--eg-accent)' : 'var(--eg-muted)',
                    cursor: isRewriting ? 'not-allowed' : 'pointer', display: 'flex',
                    transition: 'all 0.2s',
                  }}
                >
                  <Sparkles size={14} className={isRewriting ? 'animate-spin' : ''} />
                </button>
                {/* Edit */}
                <button
                  onClick={() => onEdit(block.id)}
                  style={{
                    padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem',
                    border: `1px solid ${isEditing ? 'var(--eg-accent)' : 'rgba(0,0,0,0.1)'}`,
                    background: isEditing ? 'var(--eg-accent)' : 'transparent',
                    color: isEditing ? '#fff' : 'var(--eg-muted)',
                    cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}
                >
                  {isEditing ? <Check size={12} /> : <Pencil size={12} />}
                  {isEditing ? 'Done' : 'Edit'}
                </button>
              </>
            )}
            <button
              onClick={() => onDelete(block.id)}
              style={{
                padding: '0.4rem', borderRadius: '0.5rem',
                border: '1px solid rgba(239,68,68,0.2)', background: 'transparent',
                color: 'rgba(239,68,68,0.6)', cursor: 'pointer', display: 'flex',
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Inline chapter quick-editor */}
        {isEditing && block.type === 'chapter' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
          >
            {[
              { key: 'title' as const, label: 'Chapter Title', ph: 'The First Hello' },
              { key: 'subtitle' as const, label: 'Subtitle', ph: 'In a quiet coffee shop...' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '0.4rem' }}>{f.label}</label>
                <input
                  value={(block.data as Chapter)[f.key] as string}
                  placeholder={f.ph}
                  onChange={e => onUpdate(block.id, { [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '0.5rem', border: '1.5px solid rgba(0,0,0,0.08)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: f.key === 'title' ? `"${manifest.theme.fonts.heading}", serif` : 'inherit' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--eg-accent)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'}
                />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '0.4rem' }}>Story</label>
              <textarea
                value={(block.data as Chapter).description}
                placeholder="Write your memory..."
                onChange={e => onUpdate(block.id, { description: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '0.5rem', border: '1.5px solid rgba(0,0,0,0.08)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// ── Palette block item (draggable from sidebar) ──
function PaletteItem({ block, onAdd }: { block: PaletteBlock; onAdd: (type: BlockType) => void }) {
  const BlockIcon = block.icon;
  return (
    <motion.button
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onAdd(block.type)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        width: '100%', padding: '0.85rem 1rem', borderRadius: '0.7rem',
        background: block.color, border: '1px solid rgba(0,0,0,0.05)',
        cursor: 'pointer', textAlign: 'left', marginBottom: '0.5rem',
        transition: 'box-shadow 0.2s',
      }}
      onMouseOver={e => (e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)')}
      onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ width: '32px', height: '32px', borderRadius: '0.45rem', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <BlockIcon size={16} color="var(--eg-accent)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--eg-fg)', marginBottom: '0.15rem' }}>{block.label}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--eg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{block.description}</div>
      </div>
      <ChevronRight size={14} color="rgba(0,0,0,0.2)" />
    </motion.button>
  );
}

// ── AI Block Generator ──
function AIBlockGenerator({ onGenerated, manifest }: { onGenerated: (block: CanvasBlock) => void; manifest: StoryManifest }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');

    try {
      const systemPrompt = `You are a wedding website content generator. The couple is named ${manifest.chapters[0]?.title || 'the couple'}.
Given a user request, generate a JSON chapter block for their wedding site.
Return ONLY valid JSON like:
{
  "title": "...",
  "subtitle": "...",
  "description": "...",
  "mood": "romantic",
  "date": "2024-06-15"
}
Be poetic, warm, and editorial. 2-3 sentences for description.`;

      const res = await fetch('/api/generate-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt }),
      });
      const data = await res.json();

      if (data.block) {
        const id = `ai-${Date.now()}`;
        const newBlock: CanvasBlock = {
          id,
          type: 'chapter',
          label: data.block.title || 'AI Chapter',
          data: {
            id,
            date: data.block.date || new Date().toISOString().slice(0, 10),
            title: data.block.title || 'New Chapter',
            subtitle: data.block.subtitle || '',
            description: data.block.description || '',
            images: [],
            location: null,
            mood: data.block.mood || 'romantic',
            order: 0,
          },
        };
        onGenerated(newBlock);
        setPrompt('');
      } else {
        setError('Could not generate block. Try again.');
      }
    } catch {
      setError('Generation failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2a1a0a 100%)',
      borderRadius: PEAR_RADIUS,
      padding: '1.5rem 1.25rem 1.25rem',
      border: '1px solid rgba(255,255,255,0.05)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Pear watermark */}
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px',
        width: '80px', height: '80px', opacity: 0.06,
        background: 'var(--eg-accent)',
        borderRadius: PEAR_RADIUS,
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Wand2 size={16} color="var(--eg-accent)" />
        <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
          AI Block Generator
        </span>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1rem', lineHeight: 1.5 }}>
        Describe a section or modal and AI will write it instantly.
      </p>
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder={'e.g. "Write about our first trip to Paris" or "Create a proposal story for a beach at sunset"'}
        rows={3}
        style={{
          width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
          border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
          color: '#fff', fontSize: '0.82rem', lineHeight: 1.6,
          resize: 'none', outline: 'none', boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate(); }}
      />
      {error && <p style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.5rem' }}>{error}</p>}
      <button
        onClick={generate}
        disabled={loading || !prompt.trim()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          width: '100%', marginTop: '0.75rem', padding: '0.75rem',
          borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
          background: prompt.trim() ? 'var(--eg-accent)' : 'rgba(255,255,255,0.1)',
          color: prompt.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
          fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.05em',
          transition: 'all 0.2s',
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? 'Generating...' : 'Generate Block (⌘↵)'}
      </button>
    </div>
  );
}

// ── Canvas overlay card (shown while dragging) ──
function DragOverlayCard({ block, manifest }: { block: CanvasBlock; manifest: StoryManifest }) {
  const OverlayIcon = getBlockIcon(block.type);
  return (
    <div style={{
      background: '#fff', borderRadius: PEAR_RADIUS_CARD,
      border: '2px solid var(--eg-accent)', padding: '1rem 1.25rem',
      boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      opacity: 0.95,
    }}>
      <GripVertical size={18} color="var(--eg-accent)" />
      <div style={{ width: '34px', height: '34px', borderRadius: '0.5rem', background: getBlockColor(block.type), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(OverlayIcon as any)({ size: 16, color: 'var(--eg-accent)' })}
      </div>
      <div>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--eg-muted)' }}>{block.type}</div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--eg-fg)', fontFamily: `"${manifest.theme.fonts.heading}", serif` }}>{getBlockPreview(block)}</div>
      </div>
    </div>
  );
}

// ── Main BlockEditor ──
interface BlockEditorProps {
  manifest: StoryManifest;
  onChange: (manifest: StoryManifest) => void;
  onSave?: () => void;
  onPreview?: () => void;
}

function chaptersToBlocks(manifest: StoryManifest): CanvasBlock[] {
  return (manifest.chapters || []).map(ch => ({
    id: ch.id,
    type: 'chapter' as BlockType,
    label: ch.title,
    data: ch,
  }));
}

function blocksToManifest(blocks: CanvasBlock[], manifest: StoryManifest): StoryManifest {
  const chapters = blocks
    .filter(b => b.type === 'chapter')
    .map((b, i) => ({ ...(b.data as Chapter), order: i }));
  return { ...manifest, chapters };
}

export function BlockEditor({ manifest, onChange, onSave, onPreview }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<CanvasBlock[]>(chaptersToBlocks(manifest));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiBlockCount, setAiBlockCount] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [rewritingId, setRewritingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const syncManifest = useCallback((newBlocks: CanvasBlock[]) => {
    onChange(blocksToManifest(newBlocks, manifest));
    setHasUnsavedChanges(true);
  }, [manifest, onChange]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setEditingId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setBlocks(prev => {
        const oldIdx = prev.findIndex(b => b.id === active.id);
        const newIdx = prev.findIndex(b => b.id === over.id);
        const moved = arrayMove(prev, oldIdx, newIdx);
        syncManifest(moved);
        return moved;
      });
    }
  };

  const addBlock = useCallback((type: BlockType) => {
    const id = `block-${Date.now()}`;
    const newBlock: CanvasBlock = {
      id,
      type,
      label: `New ${type}`,
      data: type === 'chapter' ? {
        id, date: new Date().toISOString().slice(0, 10),
        title: 'New Chapter', subtitle: 'Add your subtitle here',
        description: 'Write your story...', images: [],
        location: null, mood: 'romantic', order: blocks.length,
      } : {},
    };
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    syncManifest(newBlocks);
    setEditingId(id);
  }, [blocks, syncManifest]);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const next = prev.filter(b => b.id !== id);
      syncManifest(next);
      return next;
    });
    if (editingId === id) setEditingId(null);
  }, [editingId, syncManifest]);

  const updateBlock = useCallback((id: string, data: Partial<Chapter>) => {
    setBlocks(prev => {
      const next = prev.map(b => b.id === id ? { ...b, data: { ...(b.data as Chapter), ...data } } : b);
      syncManifest(next);
      return next;
    });
  }, [syncManifest]);

  const handleAIGenerated = useCallback((block: CanvasBlock) => {
    setAiBlockCount(n => n + 1);
    const newBlocks = [...blocks, block];
    setBlocks(newBlocks);
    syncManifest(newBlocks);
    setEditingId(block.id);
  }, [blocks, syncManifest]);

  // AI rewrite: regenerate a specific chapter block in-place
  const handleAIRewrite = useCallback(async (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block || block.type !== 'chapter') return;
    setRewritingId(id);
    try {
      const chapter = block.data as Chapter;
      const res = await fetch('/api/generate-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockType: 'chapter',
          context: {
            title: chapter.title,
            description: chapter.description,
            mood: chapter.mood,
            location: chapter.location?.label,
            vibeString: manifest.vibeString,
          },
          instruction: 'Rewrite this chapter with fresh, more evocative language. Keep the same date, location and mood but craft a new title, subtitle, and richer description.',
        }),
      });
      if (res.ok) {
        const { block: generated } = await res.json();
        if (generated?.data) {
          updateBlock(id, { ...generated.data, id, images: chapter.images, date: chapter.date, order: chapter.order });
        }
      }
    } catch (err) {
      console.error('AI rewrite failed:', err);
    } finally {
      setRewritingId(null);
    }
  }, [blocks, manifest, updateBlock]);

  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null;

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', minHeight: '600px' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{
        width: '280px', flexShrink: 0, position: 'sticky', top: '2rem',
        display: 'flex', flexDirection: 'column', gap: '1.25rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--eg-accent)', marginBottom: '0.25rem' }}>Block Editor</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--eg-fg)' }}>Add Sections</div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {onPreview && (
              <button onClick={onPreview} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', display: 'flex' }}>
                <Eye size={14} color="var(--eg-muted)" />
              </button>
            )}
            {onSave && (
              <button
                onClick={() => { onSave(); setHasUnsavedChanges(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.5rem 1rem', borderRadius: '0.5rem',
                  background: hasUnsavedChanges ? 'var(--eg-accent)' : '#f0f0f0',
                  color: hasUnsavedChanges ? '#fff' : 'var(--eg-muted)',
                  border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem',
                  transition: 'all 0.2s',
                }}
              >
                <Check size={13} />
                {hasUnsavedChanges ? 'Save*' : 'Saved'}
              </button>
            )}
          </div>
        </div>

        {/* Block count */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
        }}>
          {[
            { label: 'Blocks', value: blocks.length },
            { label: 'AI Created', value: aiBlockCount },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: '0.6rem', padding: '0.75rem 1rem', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--eg-fg)', fontFamily: 'var(--eg-font-heading)' }}>{s.value}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginTop: '0.15rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* AI Generator */}
        <AIBlockGenerator onGenerated={handleAIGenerated} manifest={manifest} />

        {/* Block palette */}
        <div style={{ background: '#fff', borderRadius: '0.875rem', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--eg-muted)' }}>
            Block Palette
          </div>
          <div style={{ padding: '0.75rem' }}>
            {PALETTE_BLOCKS.map(pb => (
              <PaletteItem key={pb.type} block={pb} onAdd={addBlock} />
            ))}
          </div>
        </div>

        {/* Reset to manifest */}
        <button
          onClick={() => { setBlocks(chaptersToBlocks(manifest)); setHasUnsavedChanges(false); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            padding: '0.6rem', borderRadius: '0.6rem', width: '100%',
            border: '1px solid rgba(0,0,0,0.08)', background: 'transparent',
            color: 'var(--eg-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <RotateCcw size={12} />
          Reset to Saved
        </button>
      </div>

      {/* ── MAIN CANVAS ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Canvas header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.25rem', padding: '1rem 1.25rem',
          background: '#fff', borderRadius: '0.875rem',
          border: '1px solid rgba(0,0,0,0.05)',
        }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--eg-muted)' }}>
              Page Canvas
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginTop: '0.15rem' }}>
              Drag to reorder · Click Edit to modify · AI generates instant blocks
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => addBlock('chapter')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.1rem', borderRadius: '0.6rem',
                background: 'var(--eg-fg)', color: '#fff', border: 'none',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
              }}
            >
              <Plus size={14} />
              Add Chapter
            </button>
          </div>
        </div>

        {/* DnD canvas */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence>
              {blocks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '300px',
                    background: '#fff', borderRadius: '0.875rem',
                    border: '2px dashed rgba(0,0,0,0.1)',
                    color: 'var(--eg-muted)', gap: '0.75rem',
                  }}
                >
                  <LayoutTemplate size={32} color="rgba(0,0,0,0.15)" />
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Your canvas is empty</div>
                  <div style={{ fontSize: '0.82rem' }}>Add blocks from the sidebar or use AI to generate content</div>
                  <button
                    onClick={() => addBlock('chapter')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.6rem 1.25rem', borderRadius: '100px',
                      background: 'var(--eg-accent)', color: '#fff', border: 'none',
                      cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', marginTop: '0.5rem',
                    }}
                  >
                    <Plus size={14} />
                    Add Your First Block
                  </button>
                </motion.div>
              ) : (
                blocks.map(block => (
                  <SortableBlockCard
                    key={block.id}
                    block={block}
                    onEdit={id => setEditingId(editingId === id ? null : id)}
                    onDelete={deleteBlock}
                    isEditing={editingId === block.id}
                    manifest={manifest}
                    onUpdate={updateBlock}
                    onAIRewrite={handleAIRewrite}
                    isRewriting={rewritingId === block.id}
                    isDragging={activeId === block.id}
                  />
                ))
              )}
            </AnimatePresence>
          </SortableContext>

          <DragOverlay>
            {activeBlock ? <DragOverlayCard block={activeBlock} manifest={manifest} /> : null}
          </DragOverlay>
        </DndContext>

        {/* Drop zone hint */}
        {blocks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              marginTop: '0.75rem', padding: '1rem',
              border: '2px dashed rgba(0,0,0,0.08)', borderRadius: '0.875rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', color: 'rgba(0,0,0,0.25)', fontSize: '0.8rem', cursor: 'pointer',
            }}
            onClick={() => addBlock('chapter')}
            whileHover={{ borderColor: 'var(--eg-accent)', color: 'var(--eg-accent)' }}
          >
            <Plus size={14} />
            Drop a new block here
          </motion.div>
        )}
      </div>
    </div>
  );
}
