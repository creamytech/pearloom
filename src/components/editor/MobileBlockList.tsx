'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/MobileBlockList.tsx
// Mobile-optimized block list with drag-to-reorder, swipe
// actions, and add-block bottom sheet for the "Blocks" tab
// in the rebuilt mobile editor.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, memo } from 'react';
import {
  motion, AnimatePresence, useMotionValue, animate, Reorder,
  useDragControls, type MotionValue,
} from 'framer-motion';
import {
  Eye, EyeOff, Trash2, Plus, X, LayoutTemplate,
  Sparkles, Music, Hash, ImageIcon, PartyPopper,
  Heart, MessageSquareQuote, Users2, Footprints,
} from 'lucide-react';
import {
  BlockHeroIcon, BlockStoryIcon, BlockEventIcon, BlockCountdownIcon,
  BlockRsvpIcon, BlockRegistryIcon, BlockTravelIcon, BlockFaqIcon,
  BlockPhotosIcon, BlockGuestbookIcon, BlockMapIcon, BlockQuoteIcon,
  BlockTextIcon, BlockVideoIcon, BlockDividerIcon, GripIcon,
} from '@/components/icons/EditorIcons';
import type { StoryManifest, PageBlock, BlockType } from '@/types';
import { useEditor } from '@/lib/editor-state';

// ── Block Catalogue (mirrors CanvasEditor) ─────────────────────
type OccasionTag = 'wedding' | 'anniversary' | 'engagement' | 'birthday' | 'story';
const ALL_OCCASIONS: OccasionTag[] = ['wedding', 'anniversary', 'engagement', 'birthday', 'story'];

interface BlockDef {
  type: BlockType;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  occasions: OccasionTag[];
}

const BLOCK_CATALOGUE: BlockDef[] = [
  { type: 'hero',      label: 'Hero',              icon: BlockHeroIcon,      description: 'Full-screen hero with names & cover photo',  color: '#18181B', occasions: ALL_OCCASIONS },
  { type: 'story',     label: 'Our Story',         icon: BlockStoryIcon,     description: 'Chapter timeline & photo narrative',          color: '#7c5cbf', occasions: ALL_OCCASIONS },
  { type: 'event',     label: 'Event Cards',       icon: BlockEventIcon,     description: 'Ceremony, reception & event details',         color: '#e8927a', occasions: ['wedding', 'engagement'] },
  { type: 'countdown', label: 'Countdown',         icon: BlockCountdownIcon, description: 'Live countdown to your big day',              color: '#4a9b8a', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'rsvp',      label: 'RSVP',              icon: BlockRsvpIcon,      description: 'Guest RSVP form with meal preferences',       color: '#e87ab8', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'registry',  label: 'Registry',          icon: BlockRegistryIcon,  description: 'Registry links & honeymoon fund',             color: '#c4774a', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'travel',    label: 'Travel & Hotels',   icon: BlockTravelIcon,    description: 'Hotels, airports & directions',               color: '#4a7a9b', occasions: ['wedding', 'engagement'] },
  { type: 'faq',       label: 'FAQ',               icon: BlockFaqIcon,       description: 'Common guest questions & answers',            color: '#8b7a4a', occasions: ['wedding', 'engagement'] },
  { type: 'photos',    label: 'Photo Gallery',     icon: BlockPhotosIcon,    description: 'Grid of your curated uploaded photos',         color: '#4a8b6a', occasions: ALL_OCCASIONS },
  { type: 'guestbook', label: 'Guestbook',         icon: BlockGuestbookIcon, description: 'Public guest wishes & AI highlights',         color: '#7a4a8b', occasions: ALL_OCCASIONS },
  { type: 'map',       label: 'Map',               icon: BlockMapIcon,       description: 'Embedded venue map',                          color: '#4a6a8b', occasions: ['wedding', 'engagement', 'anniversary'] },
  { type: 'quote',     label: 'Quote',             icon: BlockQuoteIcon,     description: 'Romantic quote or vow snippet',               color: '#8b4a6a', occasions: ALL_OCCASIONS },
  { type: 'text',      label: 'Text Section',      icon: BlockTextIcon,      description: 'Custom text section',                         color: '#6a8b4a', occasions: ALL_OCCASIONS },
  { type: 'video',     label: 'Video',             icon: BlockVideoIcon,     description: 'YouTube or Vimeo embed',                      color: '#4a4a8b', occasions: ALL_OCCASIONS },
  { type: 'divider',   label: 'Divider',           icon: BlockDividerIcon,   description: 'Visual section separator',                    color: '#8b8b4a', occasions: ALL_OCCASIONS },
  { type: 'vibeQuote', label: 'Vibe Quote',        icon: MessageSquareQuote, description: 'Atmospheric quote with decorative symbol',    color: '#9b6a8b', occasions: ALL_OCCASIONS },
  { type: 'welcome',   label: 'Welcome',           icon: Heart,              description: 'Personal welcome statement from the couple',  color: '#c47a7a', occasions: ALL_OCCASIONS },
  { type: 'spotify',   label: 'Spotify Playlist',  icon: Music,              description: 'Embedded Spotify playlist for your guests',   color: '#1DB954', occasions: ALL_OCCASIONS },
  { type: 'hashtag',   label: 'Hashtag',           icon: Hash,               description: 'Social media hashtag for your event',         color: '#4a7a9b', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'photoWall', label: 'Guest Photo Wall',  icon: ImageIcon,          description: 'Live wall where guests upload photos',         color: '#7a6a4a', occasions: ALL_OCCASIONS },
  { type: 'gallery',   label: 'Photo Collage',     icon: BlockPhotosIcon,    description: 'Artistic collage layout for curated photos',   color: '#4a8b6a', occasions: ALL_OCCASIONS },
  { type: 'quiz',      label: 'Couple Quiz',       icon: Sparkles,           description: 'Fun quiz about the couple for guests',        color: '#b88a4a', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'weddingParty', label: 'Wedding Party',  icon: Users2,             description: 'Bridal party, groomsmen & roles',             color: '#7c5cbf', occasions: ['wedding', 'engagement'] },
  { type: 'anniversary', label: 'Anniversary',     icon: PartyPopper,        description: 'Anniversary milestones & memories',           color: '#c4774a', occasions: ['anniversary'] },
  { type: 'storymap',  label: 'Story Map',         icon: BlockMapIcon,       description: 'Interactive map of your journey together',    color: '#4a6a8b', occasions: ALL_OCCASIONS },
  { type: 'footer',    label: 'Footer',            icon: Footprints,         description: 'Site footer with credits and links',          color: '#7a7a7a', occasions: ALL_OCCASIONS },
];

const BLOCK_DEF_MAP = new Map<string, BlockDef>(BLOCK_CATALOGUE.map(d => [d.type, d]));

const DEFAULT_BLOCKS: PageBlock[] = [
  { id: 'b-hero',      type: 'hero',      order: 0,  visible: true },
  { id: 'b-story',     type: 'story',     order: 1,  visible: true },
  { id: 'b-event',     type: 'event',     order: 2,  visible: true },
  { id: 'b-rsvp',      type: 'rsvp',      order: 3,  visible: true },
  { id: 'b-registry',  type: 'registry',  order: 4,  visible: true },
  { id: 'b-travel',    type: 'travel',    order: 5,  visible: true },
  { id: 'b-faq',       type: 'faq',       order: 6,  visible: true },
  { id: 'b-guestbook', type: 'guestbook', order: 7,  visible: true },
  { id: 'b-photos',    type: 'photos',    order: 8,  visible: true },
];

// ── Props ──────────────────────────────────────────────────────
export interface MobileBlockListProps {
  onSelectBlock: (blockId: string) => void;
  onScrollToBlock: (blockId: string) => void;
}

// ── Main Component ─────────────────────────────────────────────
export function MobileBlockList({ onSelectBlock, onScrollToBlock }: MobileBlockListProps) {
  const { manifest, actions } = useEditor();

  const occasion = (manifest.occasion || 'wedding') as OccasionTag;
  const currentBlocks = manifest.blocks && manifest.blocks.length > 0
    ? manifest.blocks
    : DEFAULT_BLOCKS;

  const [blocks, setBlocks] = useState<PageBlock[]>(currentBlocks);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Keep blocks in sync with manifest changes
  const manifestBlocksRef = useRef(manifest.blocks);
  if (manifest.blocks !== manifestBlocksRef.current) {
    manifestBlocksRef.current = manifest.blocks;
    const updated = manifest.blocks && manifest.blocks.length > 0
      ? manifest.blocks
      : DEFAULT_BLOCKS;
    setBlocks(updated);
  }

  const commit = useCallback((newBlocks: PageBlock[]) => {
    const sorted = newBlocks.map((b, i) => ({ ...b, order: i }));
    setBlocks(sorted);
    const updated: StoryManifest = { ...manifest, blocks: sorted };
    actions.handleDesignChange(updated);
    actions.pushToPreview(updated);
  }, [manifest, actions]);

  const toggleVisible = useCallback((id: string) => {
    commit(blocks.map(b => b.id === id ? { ...b, visible: !b.visible } : b));
  }, [blocks, commit]);

  const deleteBlock = useCallback((id: string) => {
    commit(blocks.filter(b => b.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
    setDeleteConfirmId(null);
  }, [blocks, commit, activeBlockId]);

  const addBlock = useCallback((type: BlockType) => {
    const id = `block-${type}-${Date.now()}`;
    const newBlock: PageBlock = { id, type, order: blocks.length, visible: true };
    const updated = [...blocks, newBlock];
    commit(updated);
    setActiveBlockId(id);
    setShowAddSheet(false);

    // If adding event block and no events yet, seed a ceremony
    if (type === 'event' && (!manifest.events || manifest.events.length === 0)) {
      const updatedManifest: StoryManifest = {
        ...manifest,
        blocks: updated.map((b, i) => ({ ...b, order: i })),
        events: [{
          id: `evt-${Date.now()}`,
          name: 'Ceremony',
          type: 'ceremony' as const,
          date: '',
          time: '5:00 PM',
          venue: '',
          address: '',
        }],
      };
      actions.handleDesignChange(updatedManifest);
      actions.pushToPreview(updatedManifest);
    }
  }, [blocks, commit, manifest, actions]);

  const handleCardTap = useCallback((blockId: string) => {
    setActiveBlockId(blockId);
    onSelectBlock(blockId);
    onScrollToBlock(blockId);
  }, [onSelectBlock, onScrollToBlock]);

  const handleReorder = useCallback((reordered: PageBlock[]) => {
    setBlocks(reordered);
  }, []);

  const handleReorderComplete = useCallback(() => {
    commit(blocks);
  }, [blocks, commit]);

  const existingTypes = new Set(blocks.map(b => b.type));

  const filteredCatalogue = BLOCK_CATALOGUE.filter(b => b.occasions.includes(occasion));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '0 0 20px 0' }}>
      {/* Section header */}
      <div style={{
        padding: '12px 16px 8px',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#3F3F46',
      }}>
        Page Sections &middot; {blocks.length}
      </div>

      {/* Reorderable block list */}
      <Reorder.Group
        axis="y"
        values={blocks}
        onReorder={handleReorder}
        as="div"
        style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        <AnimatePresence initial={false}>
          {blocks.map(block => {
            const def = BLOCK_DEF_MAP.get(block.type);
            return (
              <MobileBlockCard
                key={block.id}
                block={block}
                def={def}
                isActive={activeBlockId === block.id}
                isDeleteConfirm={deleteConfirmId === block.id}
                onTap={handleCardTap}
                onToggle={toggleVisible}
                onDelete={deleteBlock}
                onDeleteConfirm={setDeleteConfirmId}
                onReorderComplete={handleReorderComplete}
              />
            );
          })}
        </AnimatePresence>
      </Reorder.Group>

      {/* Add block button */}
      <div style={{ padding: '10px 10px 0' }}>
        <button
          onClick={() => setShowAddSheet(true)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '14px',
            borderRadius: 'var(--pl-radius-sm, 8px)',
            border: '2px dashed var(--pl-black-7, rgba(0,0,0,0.07))',
            background: 'transparent',
            color: '#18181B',
            fontSize: 'var(--pl-text-sm, 13px)',
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            minHeight: 44,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Plus size={18} />
          <span>Add Section</span>
        </button>
      </div>

      {/* Add Block Bottom Sheet */}
      <AnimatePresence>
        {showAddSheet && (
          <AddBlockSheet
            catalogue={filteredCatalogue}
            existingTypes={existingTypes}
            onAdd={addBlock}
            onClose={() => setShowAddSheet(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation toast */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            style={{
              position: 'fixed',
              bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))',
              left: 16,
              right: 16,
              zIndex: 1400,
              background: 'var(--pl-cream, #FFFCF7)',
              border: '1px solid #ef4444',
              borderRadius: 'var(--pl-radius-sm, 8px)',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            <span style={{ fontSize: 'var(--pl-text-sm, 13px)', fontWeight: 600, color: '#18181B' }}>
              Delete this section?
            </span>
            <div style={{ display: 'flex', gap: 16 }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--pl-radius-sm)',
                  border: '1px solid var(--pl-black-7)',
                  background: 'transparent',
                  fontSize: 'var(--pl-text-sm, 13px)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#18181B',
                  minHeight: 44,
                  touchAction: 'manipulation',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteBlock(deleteConfirmId)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--pl-radius-sm)',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 'var(--pl-text-sm, 13px)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  minHeight: 44,
                  touchAction: 'manipulation',
                }}
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Block Card ────────────────────────────────────────────────
const MobileBlockCard = memo(function MobileBlockCard({
  block, def, isActive, isDeleteConfirm, onTap, onToggle, onDelete, onDeleteConfirm,
  onReorderComplete,
}: {
  block: PageBlock;
  def: BlockDef | undefined;
  isActive: boolean;
  isDeleteConfirm: boolean;
  onTap: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteConfirm: (id: string | null) => void;
  onReorderComplete: () => void;
}) {
  const controls = useDragControls();
  const rowX = useMotionValue(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const Icon = def?.icon || LayoutTemplate;
  const color = def?.color || '#18181B';

  // Resolve color for inline styles (CSS vars need fallback for opacity calcs)
  const colorHex = color.startsWith('var(') ? '#71717A' : color;

  return (
    <Reorder.Item
      value={block}
      id={block.id}
      dragListener={false}
      dragControls={controls}
      as="div"
      whileDrag={{
        scale: 1.02,
        zIndex: 50,
        boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
      }}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.18 } }}
      transition={{
        layout: { type: 'spring', stiffness: 400, damping: 30 },
        duration: 0.18,
      }}
      onDragEnd={() => onReorderComplete()}
      style={{ touchAction: 'none' }}
    >
      {/* Swipe container */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'var(--pl-radius-sm, 8px)',
      }}>
        {/* Swipe action zones revealed behind card */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          {/* Toggle visibility zone */}
          <div style={{
            width: 60,
            background: '#18181B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {block.visible
              ? <EyeOff size={18} color="#fff" />
              : <Eye size={18} color="#fff" />
            }
          </div>
          {/* Delete zone */}
          <div style={{
            width: 60,
            background: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Trash2 size={18} color="#fff" />
          </div>
        </div>

        {/* Card content — swipeable on x-axis */}
        <motion.div
          drag="x"
          dragConstraints={{ left: -120, right: 0 }}
          dragElastic={{ left: 0.15, right: 0 }}
          style={{
            x: rowX,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 10px 10px 0',
            minHeight: 64,
            height: 64,
            borderRadius: 'var(--pl-radius-sm, 8px)',
            background: isActive
              ? 'rgba(24,24,27,0.04)'
              : 'var(--pl-cream-card, #FFFCF7)',
            border: `1px solid var(--pl-black-4, rgba(0,0,0,0.04))`,
            borderLeft: isActive
              ? '3px solid #18181B'
              : '1px solid var(--pl-black-4, rgba(0,0,0,0.04))',
            cursor: 'pointer',
            position: 'relative',
            opacity: block.visible ? 1 : 0.4,
            transition: 'opacity 0.2s, background 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}
          onDragStart={() => setIsSwiping(true)}
          onDragEnd={(_, info) => {
            setIsSwiping(false);
            const offsetX = info.offset.x;

            if (offsetX < -100) {
              // Full swipe — trigger delete confirm
              animate(rowX, -120, { type: 'spring', stiffness: 350, damping: 38 });
              onDeleteConfirm(block.id);
            } else if (offsetX < -40) {
              // Partial swipe — snap to show buttons
              animate(rowX, -120, { type: 'spring', stiffness: 350, damping: 38 });
            } else {
              // Spring back
              animate(rowX, 0, { type: 'spring', stiffness: 350, damping: 38 });
              onDeleteConfirm(null);
            }
          }}
          onClick={() => {
            if (!isSwiping) {
              // If card is swiped open, close it first
              if (rowX.get() < -10) {
                animate(rowX, 0, { type: 'spring', stiffness: 350, damping: 38 });
                onDeleteConfirm(null);
                return;
              }
              onTap(block.id);
            }
          }}
        >
          {/* Drag grip handle — long-press activates y-axis drag */}
          <motion.div
            role="button"
            aria-label="Hold and drag to reorder"
            onPointerDown={e => {
              e.preventDefault();
              e.stopPropagation();
              controls.start(e);
            }}
            style={{
              cursor: 'grab',
              padding: '10px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--pl-muted, #9C9585)',
              minWidth: 44,
              minHeight: 44,
              touchAction: 'none',
            }}
          >
            <GripIcon size={20} />
          </motion.div>

          {/* Block type icon (colored circle, 36px) */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            flexShrink: 0,
            background: `${colorHex}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${colorHex}30`,
          }}>
            <Icon size={16} color={color} />
          </div>

          {/* Block name + description */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{
              fontSize: 'var(--pl-text-sm, 13px)',
              fontWeight: 700,
              color: block.visible ? 'var(--pl-ink, #2B1E14)' : 'var(--pl-muted, #9C9585)',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {def?.label || block.type}
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: 'var(--pl-ink-soft, #6B5E52)',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.3,
            }}>
              {def?.description}
            </div>
          </div>

          {/* Visibility eye toggle */}
          <button
            onClick={e => {
              e.stopPropagation();
              toggleVisibilityInline(rowX, onToggle, block.id);
            }}
            aria-label={block.visible ? 'Hide section' : 'Show section'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: block.visible
                ? 'var(--pl-ink-soft, #6B5E52)'
                : 'var(--pl-muted, #9C9585)',
              flexShrink: 0,
              minWidth: 44,
              minHeight: 44,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {block.visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </motion.div>
      </div>
    </Reorder.Item>
  );
});

/** Helper: toggle visibility and spring-back if card is swiped */
function toggleVisibilityInline(
  rowX: MotionValue<number>,
  onToggle: (id: string) => void,
  blockId: string,
) {
  if (rowX.get() < -10) {
    animate(rowX, 0, { type: 'spring', stiffness: 350, damping: 38 });
  }
  onToggle(blockId);
}

// ── Add Block Bottom Sheet ───────────────────────────────────
function AddBlockSheet({
  catalogue,
  existingTypes,
  onAdd,
  onClose,
}: {
  catalogue: BlockDef[];
  existingTypes: Set<BlockType>;
  onAdd: (type: BlockType) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 300,
          background: 'rgba(0,0,0,0.15)',
          WebkitTapHighlightColor: 'transparent',
        }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 36 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 301,
          maxHeight: '70vh',
          borderRadius: '20px 20px 0 0',
          background: 'var(--pl-cream, #FFFCF7)',
          border: '1px solid var(--pl-black-7, rgba(0,0,0,0.07))',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Handle bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '10px 0 4px',
        }}>
          <div style={{
            width: 36,
            height: 4,
            borderRadius: 'var(--pl-radius-xs)',
            background: 'var(--pl-black-10, rgba(0,0,0,0.1))',
          }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px 12px',
          borderBottom: '1px solid var(--pl-black-4, rgba(0,0,0,0.04))',
        }}>
          <span style={{
            fontSize: 'var(--pl-text-base, 14px)',
            fontWeight: 700,
            color: 'var(--pl-ink, #2B1E14)',
          }}>
            Add Section
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--pl-ink-soft, #6B5E52)',
              minWidth: 44,
              minHeight: 44,
              borderRadius: 'var(--pl-radius-md)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Block type grid: 3 columns */}
        <div style={{
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '12px 12px 24px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}>
            {catalogue.map(blockDef => {
              const alreadyAdded = existingTypes.has(blockDef.type);
              const Icon = blockDef.icon;
              const colorHex = blockDef.color.startsWith('var(') ? '#71717A' : blockDef.color;

              return (
                <motion.button
                  key={blockDef.type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onAdd(blockDef.type)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '14px 6px 12px',
                    borderRadius: 'var(--pl-radius-sm, 8px)',
                    border: '1px solid var(--pl-black-4, rgba(0,0,0,0.04))',
                    background: alreadyAdded
                      ? `${colorHex}0A`
                      : 'var(--pl-cream-card, #FFFCF7)',
                    cursor: 'pointer',
                    minHeight: 44,
                    WebkitTapHighlightColor: 'transparent',
                    position: 'relative',
                  }}
                >
                  {/* Colored icon circle */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: `${colorHex}1A`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${colorHex}25`,
                    marginBottom: 2,
                  }}>
                    <Icon size={18} color={blockDef.color} />
                  </div>

                  {/* Label */}
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'var(--pl-ink, #2B1E14)',
                    textAlign: 'center',
                    lineHeight: 1.3,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {blockDef.label}
                  </span>

                  {/* "Added" indicator dot */}
                  {alreadyAdded && (
                    <div style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: colorHex,
                      opacity: 0.6,
                    }} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default MobileBlockList;
