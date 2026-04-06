'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/SectionsPanel.tsx
// Mobile-friendly section reorder + visibility panel.
// Shows all page blocks as a list with toggle switches
// and move up/down buttons for reordering.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { motion, Reorder } from 'framer-motion';
import {
  Eye, EyeOff, GripVertical, Plus, Trash2,
  Image, BookOpen, CalendarDays, Mail, Gift, Plane,
  HelpCircle, Timer, FileText, Quote, Video, MapPin,
  Camera, MessageSquare, Minus, Package, Music, Hash, Star,
  type LucideIcon,
} from 'lucide-react';
import type { StoryManifest, PageBlock } from '@/types';

// Block type display labels + Lucide icons
const BLOCK_ICONS: Record<string, LucideIcon> = {
  hero: Image, story: BookOpen, event: CalendarDays,
  rsvp: Mail, registry: Gift, travel: Plane,
  faq: HelpCircle, countdown: Timer, text: FileText,
  quote: Quote, video: Video, map: MapPin,
  photos: Camera, guestbook: MessageSquare, divider: Minus,
  spotify: Music, quiz: HelpCircle, photoWall: Camera,
  hashtag: Hash, gallery: Image, vibeQuote: Quote,
  welcome: FileText, footer: Minus, anniversary: Star,
};

const BLOCK_LABELS: Record<string, { label: string }> = {
  hero: { label: 'Hero' },
  story: { label: 'Story' },
  event: { label: 'Events' },
  rsvp: { label: 'RSVP' },
  registry: { label: 'Registry' },
  travel: { label: 'Travel' },
  faq: { label: 'FAQ' },
  countdown: { label: 'Countdown' },
  text: { label: 'Text Block' },
  quote: { label: 'Quote' },
  video: { label: 'Video' },
  map: { label: 'Map' },
  photos: { label: 'Photo Gallery' },
  guestbook: { label: 'Guestbook' },
  divider: { label: 'Divider' },
  spotify: { label: 'Music' },
  quiz: { label: 'Couple Quiz' },
  photoWall: { label: 'Guest Photos' },
  hashtag: { label: 'Hashtags' },
  gallery: { label: 'Gallery' },
  vibeQuote: { label: 'Vibe Quote' },
  welcome: { label: 'Welcome' },
  footer: { label: 'Footer' },
  anniversary: { label: 'Anniversary' },
};

const ADDABLE_TYPES = [
  'countdown', 'text', 'quote', 'video', 'map', 'photos', 'guestbook', 'divider',
  'spotify', 'quiz', 'photoWall', 'hashtag', 'gallery', 'vibeQuote', 'welcome', 'footer', 'anniversary',
];

export function SectionsPanel({ manifest, onChange }: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const blocks = useMemo(
    () => [...(manifest.blocks || [])].sort((a, b) => a.order - b.order),
    [manifest.blocks],
  );

  const updateBlocks = (newBlocks: typeof blocks) => {
    const sorted = newBlocks.map((b, i) => ({ ...b, order: i }));
    onChange({ ...manifest, blocks: sorted });
  };

  const toggleVisible = (id: string) => {
    updateBlocks(blocks.map(b => b.id === id ? { ...b, visible: b.visible === false ? true : false } : b));
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    updateBlocks(next);
  };

  const removeBlock = (id: string) => {
    updateBlocks(blocks.filter(b => b.id !== id));
  };

  const addBlock = (type: string) => {
    const newBlock: PageBlock = {
      id: `${type}-${Date.now()}`,
      type: type as PageBlock['type'],
      order: blocks.length,
      visible: true,
      config: {},
    };
    updateBlocks([...blocks, newBlock]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(163,177,138,0.8)', marginBottom: '0.3rem' }}>
          Page Sections
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--pl-muted)', lineHeight: 1.5, margin: 0 }}>
          Reorder, show, or hide sections on your site. Drag or use arrows to change order.
        </p>
      </div>

      {/* Block list */}
      <Reorder.Group
        axis="y"
        values={blocks}
        onReorder={updateBlocks}
        style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}
      >
        {blocks.map((block, idx) => {
          const meta = BLOCK_LABELS[block.type] || { label: block.type };
              const BlockIcon = BLOCK_ICONS[block.type] || Package;
          const isHidden = block.visible === false;

          return (
            <Reorder.Item
              key={block.id}
              value={block}
              className="pl-panel-card"
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                opacity: isHidden ? 0.45 : 1,
                cursor: 'grab',
                touchAction: 'none',
              }}
            >
              {/* Drag handle */}
              <GripVertical size={14} style={{ color: 'var(--pl-muted)', flexShrink: 0 }} />

              {/* Icon + label */}
              <BlockIcon size={16} style={{ flexShrink: 0, color: isHidden ? 'var(--pl-muted)' : 'var(--pl-olive)' }} />
              <span style={{
                flex: 1, fontSize: '0.82rem', fontWeight: 600,
                color: isHidden ? 'var(--pl-muted)' : 'var(--pl-ink)',
                textDecoration: isHidden ? 'line-through' : 'none',
              }}>
                {meta.label}
              </span>

              {/* Move up/down */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); moveBlock(idx, -1); }}
                  disabled={idx === 0}
                  style={{
                    all: 'unset', cursor: idx === 0 ? 'default' : 'pointer',
                    fontSize: '0.6rem', lineHeight: 1, padding: '2px',
                    color: idx === 0 ? 'rgba(0,0,0,0.06)' : 'var(--pl-ink-soft)',
                  }}
                >▲</button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveBlock(idx, 1); }}
                  disabled={idx === blocks.length - 1}
                  style={{
                    all: 'unset', cursor: idx === blocks.length - 1 ? 'default' : 'pointer',
                    fontSize: '0.6rem', lineHeight: 1, padding: '2px',
                    color: idx === blocks.length - 1 ? 'rgba(0,0,0,0.06)' : 'var(--pl-ink-soft)',
                  }}
                >▼</button>
              </div>

              {/* Visibility toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleVisible(block.id); }}
                style={{
                  all: 'unset', cursor: 'pointer', display: 'flex',
                  padding: '4px', borderRadius: '6px',
                  color: isHidden ? 'var(--pl-muted)' : 'rgba(163,177,138,0.8)',
                }}
              >
                {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>

              {/* Delete (only for addable types) */}
              {ADDABLE_TYPES.includes(block.type) && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                  style={{
                    all: 'unset', cursor: 'pointer', display: 'flex',
                    padding: '4px', borderRadius: '6px',
                    color: 'rgba(0,0,0,0.08)',
                  }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {/* Add section */}
      <div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--pl-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Add Section
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {ADDABLE_TYPES.map(type => {
            const meta = BLOCK_LABELS[type] || { label: type };
            const AddIcon = BLOCK_ICONS[type] || Package;
            return (
              <button
                key={type}
                onClick={() => addBlock(type)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 10px', borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.06)',
                  background: 'rgba(163,177,138,0.04)',
                  color: 'var(--pl-ink-soft)',
                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <AddIcon size={13} style={{ color: 'var(--pl-olive)' }} />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
