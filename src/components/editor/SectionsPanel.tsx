'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/SectionsPanel.tsx
// Mobile-friendly section reorder + visibility panel.
// Shows all page blocks as a list with toggle switches
// and move up/down buttons for reordering.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { motion, Reorder } from 'framer-motion';
import { suggestMissingBlocks } from '@/lib/block-engine/ai-blocks';
import { MultiSelectToolbar } from './MultiSelectToolbar';
import { SpacingHandle } from './SpacingHandle';
import { BlockDropZone } from './BlockDropZone';
import { useEditor } from '@/lib/editor-state';
import { insertBlockAt } from '@/lib/block-engine/block-actions';
import { makeId } from '@/lib/editor-ids';
import { PanelRoot, PanelSection, PanelChip, panelText, panelWeight } from './panel';
import {
  Eye, EyeOff, GripVertical, Plus, Trash2, Sparkles,
  Image, BookOpen, CalendarDays, Mail, Gift, Plane,
  HelpCircle, Timer, FileText, Quote, Video, MapPin,
  Camera, MessageSquare, Minus, Package, Music, Hash, Star, Layers,
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
  photoWall: { label: 'Guest Photo Wall' },
  hashtag: { label: 'Hashtags' },
  gallery: { label: 'Photo Collage' },
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
  const { state, dispatch } = useEditor();
  const [draggingType, setDraggingType] = useState<string | null>(null);

  const blocks = useMemo(
    () => [...(manifest.blocks || [])].sort((a, b) => a.order - b.order),
    [manifest.blocks],
  );

  const handleBlockClick = useCallback((blockId: string, shiftKey: boolean) => {
    if (shiftKey) {
      dispatch({ type: 'TOGGLE_BLOCK_SELECTION', id: blockId });
    } else {
      dispatch({ type: 'SET_ACTIVE_ID', id: blockId });
      dispatch({ type: 'SET_SELECTED_BLOCKS', ids: [] });
    }
  }, [dispatch]);

  const handleDropAtPosition = useCallback((position: number) => {
    if (!draggingType) return;
    const updated = insertBlockAt(blocks, draggingType, position);
    onChange({ ...manifest, blocks: updated });
    setDraggingType(null);
  }, [draggingType, blocks, manifest, onChange]);

  const handleMultiSelectUpdate = useCallback((updatedBlocks: PageBlock[]) => {
    onChange({ ...manifest, blocks: updatedBlocks });
    dispatch({ type: 'SET_SELECTED_BLOCKS', ids: [] });
  }, [manifest, onChange, dispatch]);

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
      id: makeId(type),
      type: type as PageBlock['type'],
      order: blocks.length,
      visible: true,
      config: {},
    };
    updateBlocks([...blocks, newBlock]);
  };

  return (
    <PanelRoot>
      <PanelSection
        title="Page Sections"
        icon={Layers}
        badge={blocks.length}
        hint="Reorder, show, or hide sections on your site. Drag or use arrows to change order."
        card={false}
      >
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

          const isSelected = state.selectedBlockIds.includes(block.id);

          return (
            <div key={block.id}>
            {/* Drop zone between blocks */}
            <BlockDropZone index={idx} isDragging={!!draggingType} onDrop={handleDropAtPosition} />
            <Reorder.Item
              value={block}
              onClick={(e: React.MouseEvent) => handleBlockClick(block.id, e.shiftKey)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 8px',
                borderRadius: 'var(--pl-radius-sm)',
                background: isSelected ? 'var(--pl-chrome-accent-soft)' : 'var(--pl-chrome-surface)',
                border: isSelected ? '1px solid var(--pl-chrome-accent)' : '1px solid var(--pl-chrome-border)',
                opacity: isHidden ? 0.45 : 1,
                cursor: 'grab',
                touchAction: 'none',
                transition: 'all 0.1s',
              }}
            >
              {/* Drag handle */}
              <GripVertical size={12} style={{ color: 'var(--pl-chrome-text-faint)', flexShrink: 0 }} />

              {/* Label */}
              <span style={{
                flex: 1, fontSize: '0.75rem', fontWeight: 500,
                color: isHidden ? 'var(--pl-chrome-text-faint)' : 'var(--pl-chrome-text)',
                textDecoration: isHidden ? 'line-through' : 'none',
              }}>
                {meta.label}
              </span>

              {/* Visibility toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleVisible(block.id); }}
                title={isHidden ? 'Show' : 'Hide'}
                style={{
                  all: 'unset', cursor: 'pointer', display: 'flex',
                  padding: '3px', borderRadius: 'var(--pl-radius-xs)',
                  color: isHidden ? 'var(--pl-chrome-text-faint)' : 'var(--pl-chrome-text-muted)',
                }}
              >
                {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>

              {/* Delete (only for addable types) */}
              {ADDABLE_TYPES.includes(block.type) && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                  title="Remove"
                  style={{
                    all: 'unset', cursor: 'pointer', display: 'flex',
                    padding: '3px', borderRadius: 'var(--pl-radius-xs)',
                    color: 'var(--pl-chrome-text-faint)',
                  }}
                >
                  <Trash2 size={11} />
                </button>
              )}
            </Reorder.Item>
            </div>
          );
        })}
      </Reorder.Group>

      </PanelSection>

      {/* Add section — lives in its own collapsible section so the
          chip grid doesn't visually compete with the block list.
          Each chip is both click-to-add AND draggable onto the canvas.
          HTML5 dataTransfer populates `pearloom/block-type` so the
          canvas DropZones in SiteRenderer can intercept it. */}
      <PanelSection title="Add Section" icon={Plus} defaultOpen hint="Click to append, or drag onto the canvas to drop between sections.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {ADDABLE_TYPES.map(type => {
            const meta = BLOCK_LABELS[type] || { label: type };
            const AddIcon = BLOCK_ICONS[type] || Package;
            return (
              <button
                key={type}
                onClick={() => addBlock(type)}
                draggable
                onDragStart={(e) => {
                  setDraggingType(type);
                  // Canvas DropZones read 'pearloom/block-type' to decide
                  // whether to accept the drop and which block to insert.
                  try {
                    e.dataTransfer.setData('pearloom/block-type', type);
                    e.dataTransfer.setData('text/plain', type);
                    e.dataTransfer.effectAllowed = 'copy';
                  } catch {
                    // Some browsers throw on unknown MIME during dragstart;
                    // swallow and fall back to the local draggingType state.
                  }
                  // Broadcast so the canvas can show a full-bleed "drop
                  // anywhere to add" hint, even over empty regions.
                  window.dispatchEvent(
                    new CustomEvent('pearloom-palette-drag-start', { detail: { type } })
                  );
                }}
                onDragEnd={() => {
                  setDraggingType(null);
                  window.dispatchEvent(new CustomEvent('pearloom-palette-drag-end'));
                }}
                title={`Click to append ${meta.label}, or drag onto the canvas`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 10px', borderRadius: 'var(--pl-radius-md)',
                  border: '1px solid var(--pl-chrome-border)',
                  background: 'var(--pl-chrome-surface)',
                  color: 'var(--pl-chrome-text-soft)',
                  fontSize: panelText.chip,
                  fontWeight: panelWeight.semibold,
                  cursor: 'grab',
                  transition: 'all var(--pl-dur-instant)',
                }}
              >
                <AddIcon size={13} style={{ color: 'var(--pl-chrome-text)' }} />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </PanelSection>

      {/* AI Suggestions — missing sections */}
      {(() => {
        const suggestions = suggestMissingBlocks(blocks, manifest);
        if (suggestions.length === 0) return null;
        return (
          <PanelSection title="Suggested Sections" icon={Sparkles} defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {suggestions.slice(0, 3).map((s) => {
                const SuggestIcon = BLOCK_ICONS[s.type] || Package;
                return (
                  <button
                    key={s.type}
                    onClick={() => addBlock(s.type)}
                    className="pl-panel-card"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      cursor: 'pointer',
                      border: '1px solid var(--pl-chrome-border)',
                      textAlign: 'left', width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--pl-radius-lg)',
                      background: 'var(--pl-chrome-surface)',
                    }}
                  >
                    <SuggestIcon size={14} style={{ color: 'var(--pl-gold)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: panelText.body,
                        fontWeight: panelWeight.semibold,
                        color: 'var(--pl-chrome-text)',
                        display: 'block',
                      }}>
                        {BLOCK_LABELS[s.type]?.label || s.type}
                      </span>
                      <span style={{ fontSize: panelText.meta, color: 'var(--pl-chrome-text-muted)' }}>
                        {s.reason}
                      </span>
                    </div>
                    <Plus size={12} style={{ color: 'var(--pl-chrome-text)', flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </PanelSection>
        );
      })()}

      {/* Multi-select toolbar */}
      {state.selectedBlockIds.length >= 2 && (
        <MultiSelectToolbar
          selectedIds={state.selectedBlockIds}
          blocks={blocks}
          onUpdate={handleMultiSelectUpdate}
          onClearSelection={() => dispatch({ type: 'SET_SELECTED_BLOCKS', ids: [] })}
        />
      )}
    </PanelRoot>
  );
}
