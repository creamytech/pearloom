'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/BlockLibraryDrawer.tsx
// The canonical "insert a block" surface — a persistent drawer
// that slides out from the left of the canvas with:
//   • category tabs (Story · Logistics · Gifts · Guests · Media · Structure)
//   • live search
//   • draggable block cards that work with CanvasEditor's existing
//     `pearloom/block-type` drop listener
//   • tap-to-insert as a keyboard-accessible fallback
//
// Wires into the editor's `pear-command` event so the AI can prompt
// guests to "tap to add a Registry section" and the drawer opens
// focused on the right block.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Search,
  X,
  Sparkles,
  Music,
  Hash,
  ImageIcon,
  PartyPopper,
  Heart,
  MessageSquareQuote,
  Users2,
  Footprints,
} from 'lucide-react';
import {
  BlockHeroIcon, BlockStoryIcon, BlockEventIcon, BlockCountdownIcon,
  BlockRsvpIcon, BlockRegistryIcon, BlockTravelIcon, BlockFaqIcon,
  BlockPhotosIcon, BlockGuestbookIcon, BlockMapIcon, BlockQuoteIcon,
  BlockTextIcon, BlockVideoIcon, BlockDividerIcon,
} from '@/components/icons/EditorIcons';
import {
  BLOCK_CATALOGUE,
  BLOCK_CATEGORIES,
  type BlockCategory,
  type BlockDef,
  type OccasionTag,
} from '@/lib/block-catalogue';
import type { BlockType } from '@/types';
import { panelText, panelWeight, panelTracking } from './panel';

// Resolve the lucide/EditorIcon component for each block type. Keeping
// this table here (not in the catalogue) lets the catalogue stay pure
// data and avoids a circular dep on component-level icons.
const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
  hero: BlockHeroIcon,
  story: BlockStoryIcon,
  event: BlockEventIcon,
  countdown: BlockCountdownIcon,
  rsvp: BlockRsvpIcon,
  registry: BlockRegistryIcon,
  travel: BlockTravelIcon,
  faq: BlockFaqIcon,
  photos: BlockPhotosIcon,
  guestbook: BlockGuestbookIcon,
  map: BlockMapIcon,
  quote: BlockQuoteIcon,
  text: BlockTextIcon,
  video: BlockVideoIcon,
  divider: BlockDividerIcon,
  vibeQuote: MessageSquareQuote,
  welcome: Heart,
  spotify: Music,
  hashtag: Hash,
  photoWall: ImageIcon,
  gallery: BlockPhotosIcon,
  quiz: Sparkles,
  weddingParty: Users2,
  anniversary: PartyPopper,
  storymap: BlockMapIcon,
  footer: Footprints,
};

export interface BlockLibraryDrawerProps {
  /** Controls visibility — let the parent own open state. */
  open: boolean;
  /** Called when the user tries to close the drawer (Esc / overlay / X). */
  onClose: () => void;
  /** User's occasion; filters the catalogue. Defaults to wedding. */
  occasion?: OccasionTag;
  /** Types already present on the canvas — rendered with a check badge. */
  existingTypes?: Set<BlockType>;
  /** Called when a block is inserted via tap/enter. */
  onInsert: (type: BlockType) => void;
  /**
   * Fires as the user drags a block card. The parent can highlight
   * drop zones while non-null. The card also writes the type to the
   * native `DataTransfer` so existing `drop` handlers keep working.
   */
  onDragType?: (type: BlockType | null) => void;
}

export function BlockLibraryDrawer({
  open,
  onClose,
  occasion = 'wedding',
  existingTypes,
  onInsert,
  onDragType,
}: BlockLibraryDrawerProps) {
  const [activeCat, setActiveCat] = useState<BlockCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Esc to close. Focus search when opened.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => searchRef.current?.focus(), 80);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const byOccasion = BLOCK_CATALOGUE.filter((b) => b.occasions.includes(occasion));
    const byCat = activeCat === 'all' ? byOccasion : byOccasion.filter((b) => b.category === activeCat);
    const q = search.trim().toLowerCase();
    if (!q) return byCat;
    return byCat.filter((b) =>
      b.label.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.type.toLowerCase().includes(q),
    );
  }, [occasion, activeCat, search]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Click-off overlay — click anywhere outside to close */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(9,9,11,0.35)',
              zIndex: 200,
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
            }}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: -420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -420, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            role="dialog"
            aria-label="Block library"
            style={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 0,
              width: 'min(420px, 92vw)',
              zIndex: 201,
              background: '#FFFFFF',
              borderRight: '1px solid #E4E4E7',
              boxShadow: '24px 0 80px -24px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #E4E4E7',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <LayoutGrid size={16} color="#18181B" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: panelText.heading,
                    fontWeight: panelWeight.bold,
                    letterSpacing: panelTracking.widest,
                    textTransform: 'uppercase',
                    color: '#71717A',
                  }}
                >
                  Block library
                </div>
                <div
                  style={{
                    fontSize: panelText.itemTitle,
                    fontWeight: panelWeight.semibold,
                    color: '#18181B',
                  }}
                >
                  Drag onto the canvas or tap to insert
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close block library"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: '1px solid #E4E4E7',
                  background: '#FAFAFA',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={14} color="#52525B" />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #F4F4F5' }}>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Search size={12} color="#A1A1AA" style={{ position: 'absolute', left: 10 }} />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search blocks\u2026"
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 30px',
                    borderRadius: 8,
                    border: '1px solid #E4E4E7',
                    background: '#FAFAFA',
                    fontSize: 'max(16px, 0.8rem)',
                    outline: 'none',
                    color: '#18181B',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#18181B';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24,24,27,0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E4E4E7';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Category tabs */}
            <div
              role="tablist"
              aria-label="Block categories"
              style={{
                display: 'flex',
                gap: 6,
                padding: '10px 12px',
                borderBottom: '1px solid #F4F4F5',
                overflowX: 'auto',
                scrollbarWidth: 'thin',
              }}
            >
              <CategoryTab
                active={activeCat === 'all'}
                onClick={() => setActiveCat('all')}
                label="All"
              />
              {BLOCK_CATEGORIES.map((c) => (
                <CategoryTab
                  key={c.id}
                  active={activeCat === c.id}
                  onClick={() => setActiveCat(c.id)}
                  label={c.label}
                />
              ))}
            </div>

            {/* Block grid */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 10,
                alignContent: 'start',
              }}
            >
              {filtered.length === 0 ? (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    padding: '32px 16px',
                    textAlign: 'center',
                    fontSize: panelText.body,
                    color: '#71717A',
                  }}
                >
                  No blocks match &ldquo;{search}&rdquo;
                </div>
              ) : (
                filtered.map((b) => (
                  <BlockCard
                    key={b.type}
                    block={b}
                    existing={!!existingTypes?.has(b.type)}
                    onInsert={() => { onInsert(b.type); onClose(); }}
                    onDragType={onDragType}
                  />
                ))
              )}
            </div>

            {/* Footer hint */}
            <div
              style={{
                padding: '10px 14px',
                borderTop: '1px solid #F4F4F5',
                fontSize: panelText.meta,
                color: '#A1A1AA',
                letterSpacing: panelTracking.wider,
                textTransform: 'uppercase',
                fontWeight: panelWeight.semibold,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span>Drag onto canvas</span>
              <span>
                <kbd
                  style={{
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: '#F4F4F5',
                    border: '1px solid #E4E4E7',
                    fontSize: 10,
                    fontFamily: 'ui-monospace, Menlo, monospace',
                    color: '#3F3F46',
                  }}
                >
                  Esc
                </kbd>
                &nbsp; to close
              </span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function CategoryTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        whiteSpace: 'nowrap',
        padding: '6px 11px',
        borderRadius: 999,
        border: active ? '1px solid #18181B' : '1px solid #E4E4E7',
        background: active ? '#18181B' : '#FFFFFF',
        color: active ? '#FFFFFF' : '#3F3F46',
        fontSize: panelText.chip,
        fontWeight: panelWeight.semibold,
        letterSpacing: panelTracking.wide,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function BlockCard({
  block,
  existing,
  onInsert,
  onDragType,
}: {
  block: BlockDef;
  existing: boolean;
  onInsert: () => void;
  onDragType?: (type: BlockType | null) => void;
}) {
  const Icon = BLOCK_ICONS[block.type];
  const [dragging, setDragging] = useState(false);

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('pearloom/block-type', block.type);
        e.dataTransfer.setData('text/plain', block.type);
        e.dataTransfer.effectAllowed = 'copy';
        setDragging(true);
        onDragType?.(block.type);
        // Broadcast so the canvas DropZones pulse across the whole page
        // and not just the zone the cursor hovers.
        window.dispatchEvent(
          new CustomEvent('pearloom-palette-drag-start', { detail: { type: block.type } })
        );
      }}
      onDragEnd={() => {
        setDragging(false);
        onDragType?.(null);
        window.dispatchEvent(new CustomEvent('pearloom-palette-drag-end'));
      }}
      onClick={onInsert}
      title={block.description}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
        padding: '12px 12px 11px',
        borderRadius: 10,
        border: `1px solid ${existing ? `${block.color}40` : 'var(--pl-chrome-border)'}`,
        background: dragging ? `${block.color}12` : 'var(--pl-chrome-surface)',
        cursor: 'grab',
        textAlign: 'left',
        transition: 'transform 0.15s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.15s, background-color 0.15s',
        transform: dragging ? 'scale(0.96)' : 'scale(1)',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (dragging) return;
        e.currentTarget.style.borderColor = block.color;
        e.currentTarget.style.background = `${block.color}0c`;
      }}
      onMouseLeave={(e) => {
        if (dragging) return;
        e.currentTarget.style.borderColor = existing ? `${block.color}40` : '#E4E4E7';
        e.currentTarget.style.background = '#FFFFFF';
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: `${block.color}20`,
          border: `1px solid ${block.color}30`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={16} color={block.color} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
        <span
          style={{
            fontSize: panelText.body,
            fontWeight: panelWeight.semibold,
            color: '#18181B',
            lineHeight: 1.25,
            flex: 1,
          }}
        >
          {block.label}
        </span>
        {existing && (
          <span
            aria-label="Already on canvas"
            title="Already on canvas"
            style={{
              fontSize: 9,
              fontWeight: panelWeight.bold,
              letterSpacing: panelTracking.widest,
              padding: '2px 6px',
              borderRadius: 10,
              background: `${block.color}18`,
              color: block.color,
              textTransform: 'uppercase',
            }}
          >
            Added
          </span>
        )}
      </div>
      <span
        style={{
          fontSize: panelText.hint,
          lineHeight: 1.4,
          color: '#71717A',
        }}
      >
        {block.description}
      </span>
    </button>
  );
}
