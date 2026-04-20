'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/BlockLibraryDrawer.tsx
// Editorial-chrome block palette.
//
// A persistent left drawer of draggable block cards. Fully bound
// to --pl-chrome-* tokens so it flips between light and dark.
// Keeps its original wiring:
//   • sets `pearloom/block-type` on the DataTransfer so the
//     SiteRenderer DropZones can accept it onto the live canvas
//   • broadcasts `pearloom-palette-drag-start/end` so every drop
//     zone pulses as soon as drag begins
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
  Check,
  GripVertical,
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
  filterBlocksForOccasion,
  type BlockCategory,
  type BlockDef,
  type OccasionTag,
} from '@/lib/block-catalogue';
import type { BlockType } from '@/types';
import {
  panelFont,
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
} from './panel';

// ── Iconography ──────────────────────────────────────────────
// The catalogue stays pure data; we resolve components here so
// the drawer can swap in brand-specific block icons without the
// catalogue growing a JSX dependency.
// Partial: the new event-OS block types (itinerary, costSplitter,
// tributeWall, etc.) don't have bespoke icons yet — the drawer
// falls back to a generic icon at the usage site when undefined.
// See CLAUDE-PRODUCT.md §4 for the block expansion plan.
const BLOCK_ICONS: Partial<Record<BlockType, React.ElementType>> = {
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
  open: boolean;
  onClose: () => void;
  occasion?: OccasionTag;
  existingTypes?: Set<BlockType>;
  onInsert: (type: BlockType) => void;
  /** Highlight the canvas drop zones while a card is being dragged. */
  onDragType?: (type: BlockType | null) => void;
}

const DRAWER_WIDTH = 'min(440px, 92vw)';
const ACCENT_TINT = (pct: number) =>
  `color-mix(in srgb, var(--pl-chrome-accent) ${pct}%, transparent)`;

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
    const byOccasion = filterBlocksForOccasion(occasion);
    const byCat = activeCat === 'all' ? byOccasion : byOccasion.filter((b) => b.category === activeCat);
    const q = search.trim().toLowerCase();
    if (!q) return byCat;
    return byCat.filter((b) =>
      b.label.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.type.toLowerCase().includes(q),
    );
  }, [occasion, activeCat, search]);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const cat of BLOCK_CATEGORIES) counts[cat.id] = 0;
    for (const b of filterBlocksForOccasion(occasion)) {
      counts.all += 1;
      counts[b.category] = (counts[b.category] || 0) + 1;
    }
    return counts;
  }, [occasion]);

  return (
    <AnimatePresence>
      {open && (
        <>
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
              background:
                'color-mix(in srgb, var(--pl-chrome-ink, #09090B) 38%, transparent)',
              zIndex: 200,
              backdropFilter: 'blur(4px) saturate(120%)',
              WebkitBackdropFilter: 'blur(4px) saturate(120%)',
            }}
          />

          <motion.aside
            key="drawer"
            initial={{ x: -440, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -440, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            role="dialog"
            aria-label="Block library"
            style={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 0,
              width: DRAWER_WIDTH,
              zIndex: 201,
              background: 'var(--pl-chrome-bg)',
              borderRight: '1px solid var(--pl-chrome-border)',
              boxShadow:
                '24px 0 64px -24px color-mix(in srgb, var(--pl-chrome-ink, #09090B) 32%, transparent)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              color: 'var(--pl-chrome-text)',
            }}
          >
            {/* ── Header ──────────────────────────────────────── */}
            <header
              style={{
                padding: '18px 20px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                borderBottom: '1px solid var(--pl-chrome-border)',
                background:
                  'linear-gradient(180deg, ' +
                  ACCENT_TINT(5) +
                  ', transparent)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontFamily: panelFont.mono,
                    fontSize: panelText.meta,
                    fontWeight: panelWeight.bold,
                    letterSpacing: panelTracking.widest,
                    textTransform: 'uppercase',
                    color: 'var(--pl-chrome-text-faint)',
                  }}
                >
                  <LayoutGrid size={11} strokeWidth={1.75} color="var(--pl-chrome-accent)" />
                  Block library
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close block library"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '1px solid var(--pl-chrome-border)',
                    background: 'var(--pl-chrome-surface)',
                    color: 'var(--pl-chrome-text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all var(--pl-dur-fast) var(--pl-ease-out)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--pl-chrome-text)';
                    e.currentTarget.style.borderColor = 'var(--pl-chrome-accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--pl-chrome-text-muted)';
                    e.currentTarget.style.borderColor = 'var(--pl-chrome-border)';
                  }}
                >
                  <X size={13} strokeWidth={1.75} />
                </button>
              </div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: panelFont.display,
                  fontStyle: 'italic',
                  fontWeight: panelWeight.regular,
                  fontSize: '1.45rem',
                  letterSpacing: '-0.018em',
                  lineHeight: panelLineHeight.tight,
                  color: 'var(--pl-chrome-text)',
                }}
              >
                Add a section
              </h2>
              <p
                style={{
                  margin: 0,
                  fontFamily: panelFont.body,
                  fontSize: panelText.hint,
                  color: 'var(--pl-chrome-text-muted)',
                  lineHeight: panelLineHeight.snug,
                  maxWidth: 340,
                }}
              >
                Drag any block onto your site, or press{' '}
                <kbd style={kbdStyle}>Enter</kbd> with a card focused to add it to the bottom.
              </p>
            </header>

            {/* ── Search ──────────────────────────────────────── */}
            <div
              style={{
                padding: '14px 18px 10px',
                borderBottom: '1px solid var(--pl-chrome-border-soft, var(--pl-chrome-border))',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 'var(--pl-radius-lg)',
                  border: '1px solid var(--pl-chrome-border)',
                  background: 'var(--pl-chrome-surface)',
                  transition: 'border-color 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--pl-chrome-accent)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--pl-chrome-border)';
                }}
              >
                <Search size={12} strokeWidth={1.75} color="var(--pl-chrome-text-faint)" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search blocks — hero, RSVP, map…"
                  style={{
                    flex: 1,
                    padding: 0,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontFamily: panelFont.body,
                    fontSize: 'max(16px, 0.82rem)',
                    color: 'var(--pl-chrome-text)',
                    lineHeight: 1.4,
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--pl-chrome-text-muted)',
                      cursor: 'pointer',
                      padding: 2,
                      lineHeight: 0,
                    }}
                  >
                    <X size={11} strokeWidth={1.75} />
                  </button>
                )}
              </label>
            </div>

            {/* ── Category tabs ───────────────────────────────── */}
            <div
              role="tablist"
              aria-label="Block categories"
              style={{
                display: 'flex',
                gap: 4,
                padding: '10px 14px',
                borderBottom: '1px solid var(--pl-chrome-border-soft, var(--pl-chrome-border))',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              <CategoryTab
                active={activeCat === 'all'}
                onClick={() => setActiveCat('all')}
                label="All"
                count={catCounts.all}
              />
              {BLOCK_CATEGORIES.map((c) => (
                <CategoryTab
                  key={c.id}
                  active={activeCat === c.id}
                  onClick={() => setActiveCat(c.id)}
                  label={c.label}
                  count={catCounts[c.id] || 0}
                />
              ))}
            </div>

            {/* ── Grid ────────────────────────────────────────── */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 14px 18px',
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: 6,
                alignContent: 'start',
                background: 'var(--pl-chrome-bg)',
              }}
            >
              {filtered.length === 0 ? (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    padding: '36px 18px',
                    textAlign: 'center',
                    borderRadius: 'var(--pl-radius-lg)',
                    border: '1px dashed ' + ACCENT_TINT(22),
                    background: ACCENT_TINT(3),
                  }}
                >
                  <div
                    style={{
                      fontFamily: panelFont.display,
                      fontStyle: 'italic',
                      fontSize: panelText.itemTitle,
                      color: 'var(--pl-chrome-text)',
                      marginBottom: 6,
                      letterSpacing: '-0.012em',
                    }}
                  >
                    No blocks match &ldquo;{search}&rdquo;
                  </div>
                  <div
                    style={{
                      fontFamily: panelFont.body,
                      fontSize: panelText.hint,
                      color: 'var(--pl-chrome-text-muted)',
                    }}
                  >
                    Try a different keyword or switch category.
                  </div>
                </div>
              ) : (
                filtered.map((b, i) => (
                  <BlockCard
                    key={b.type}
                    index={i}
                    block={b}
                    existing={!!existingTypes?.has(b.type)}
                    onInsert={() => {
                      onInsert(b.type);
                      onClose();
                    }}
                    onDragType={onDragType}
                  />
                ))
              )}
            </div>

            {/* ── Footer ──────────────────────────────────────── */}
            <footer
              style={{
                padding: '12px 18px',
                borderTop: '1px solid var(--pl-chrome-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                fontFamily: panelFont.mono,
                fontSize: panelText.meta,
                letterSpacing: panelTracking.widest,
                textTransform: 'uppercase',
                color: 'var(--pl-chrome-text-faint)',
                background: ACCENT_TINT(3),
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <GripVertical size={10} strokeWidth={1.75} color="var(--pl-chrome-accent)" />
                Drag to canvas
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <kbd style={kbdStyle}>Esc</kbd>
                close
              </span>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ────────────────────────────────────────────

const kbdStyle: React.CSSProperties = {
  padding: '2px 6px',
  borderRadius: 'var(--pl-radius-xs)',
  background: 'var(--pl-chrome-surface)',
  border: '1px solid var(--pl-chrome-border)',
  color: 'var(--pl-chrome-text-muted)',
  fontFamily: panelFont.mono,
  fontSize: 10,
  letterSpacing: panelTracking.wider,
};

function CategoryTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        padding: '7px 12px',
        borderRadius: 'var(--pl-radius-full)',
        border: active ? '1px solid var(--pl-chrome-accent)' : '1px solid var(--pl-chrome-border)',
        background: active ? 'var(--pl-chrome-accent)' : 'transparent',
        color: active ? 'var(--pl-chrome-accent-ink)' : 'var(--pl-chrome-text-soft)',
        fontFamily: panelFont.mono,
        fontSize: panelText.meta,
        fontWeight: panelWeight.bold,
        letterSpacing: panelTracking.widest,
        textTransform: 'uppercase',
        cursor: 'pointer',
        lineHeight: 1,
        transition: 'all var(--pl-dur-fast) var(--pl-ease-out)',
      }}
      onMouseEnter={(e) => {
        if (active) return;
        e.currentTarget.style.borderColor = 'var(--pl-chrome-accent)';
        e.currentTarget.style.color = 'var(--pl-chrome-text)';
      }}
      onMouseLeave={(e) => {
        if (active) return;
        e.currentTarget.style.borderColor = 'var(--pl-chrome-border)';
        e.currentTarget.style.color = 'var(--pl-chrome-text-soft)';
      }}
    >
      {label}
      <span
        style={{
          fontSize: 9,
          padding: '1px 6px',
          borderRadius: 'var(--pl-radius-full)',
          background: active
            ? 'color-mix(in srgb, var(--pl-chrome-accent-ink) 16%, transparent)'
            : 'var(--pl-chrome-surface)',
          color: active ? 'var(--pl-chrome-accent-ink)' : 'var(--pl-chrome-text-muted)',
          fontWeight: panelWeight.bold,
          letterSpacing: panelTracking.wider,
          lineHeight: 1,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function BlockCard({
  block,
  index,
  existing,
  onInsert,
  onDragType,
}: {
  block: BlockDef;
  index: number;
  existing: boolean;
  onInsert: () => void;
  onDragType?: (type: BlockType | null) => void;
}) {
  // Fallback to the text-block icon when a new event-OS block
  // type doesn't have its own icon yet.
  const Icon = BLOCK_ICONS[block.type] ?? BlockTextIcon;
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  const accent = block.color;
  const baseBorder = existing
    ? `color-mix(in srgb, ${accent} 38%, transparent)`
    : 'var(--pl-chrome-border)';

  return (
    <motion.button
      type="button"
      draggable
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.018, ease: [0.22, 1, 0.36, 1] }}
      onDragStart={(e) => {
        const dt = (e as unknown as DragEvent).dataTransfer;
        if (dt) {
          dt.setData('pearloom/block-type', block.type);
          dt.setData('text/plain', block.type);
          dt.effectAllowed = 'copy';
        }
        setDragging(true);
        onDragType?.(block.type);
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={block.description}
      style={{
        // Horizontal card layout — icon-tile on the left, label + hint
        // on the right. Eliminates the 'narrow column truncates everything'
        // bug in the ALL tab where 25 cards squeezed labels off-screen.
        display: 'grid',
        gridTemplateColumns: '40px 1fr auto',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 'var(--pl-radius-lg)',
        border: `1px solid ${hovered || dragging ? accent : baseBorder}`,
        background: dragging
          ? `color-mix(in srgb, ${accent} 14%, var(--pl-chrome-surface))`
          : hovered
          ? `color-mix(in srgb, ${accent} 6%, var(--pl-chrome-surface))`
          : 'var(--pl-chrome-surface)',
        cursor: dragging ? 'grabbing' : 'grab',
        textAlign: 'left',
        transition: 'transform 0.15s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.15s, background-color 0.15s',
        transform: dragging ? 'scale(0.97)' : hovered ? 'translateY(-1px)' : 'translateY(0)',
        position: 'relative',
        overflow: 'hidden',
        color: 'var(--pl-chrome-text)',
        boxShadow: hovered
          ? `0 10px 24px -16px color-mix(in srgb, ${accent} 50%, transparent)`
          : 'none',
        width: '100%',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 'var(--pl-radius-md)',
          background: `color-mix(in srgb, ${accent} 18%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accent} 32%, transparent)`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={17} color={accent} />
      </div>

      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <div
          style={{
            fontFamily: panelFont.display,
            fontStyle: 'italic',
            fontSize: '0.98rem',
            fontWeight: panelWeight.regular,
            color: 'var(--pl-chrome-text)',
            letterSpacing: '-0.012em',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {block.label}
        </div>
        <div
          style={{
            fontFamily: panelFont.body,
            fontSize: '0.68rem',
            lineHeight: 1.3,
            color: 'var(--pl-chrome-text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginTop: 2,
          }}
        >
          {block.description}
        </div>
      </div>

      {/* Gold index — right column of the grid */}
      <span
        style={{
          fontFamily: panelFont.mono,
          fontSize: 9,
          fontWeight: panelWeight.bold,
          letterSpacing: panelTracking.widest,
          color: 'var(--pl-chrome-text-faint)',
          lineHeight: 1,
          alignSelf: 'start',
          paddingTop: 2,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      {existing && (
        <span
          aria-label="Already on canvas"
          title="Already on canvas"
          style={{
            marginTop: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: panelFont.mono,
            fontSize: 9,
            fontWeight: panelWeight.bold,
            letterSpacing: panelTracking.widest,
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 'var(--pl-radius-full)',
            background: `color-mix(in srgb, ${accent} 16%, transparent)`,
            color: accent,
            lineHeight: 1,
          }}
        >
          <Check size={9} strokeWidth={2.25} /> Added
        </span>
      )}

      {/* Hairline at bottom only visible on hover */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 10,
          height: 1,
          background: `color-mix(in srgb, ${accent} ${hovered ? 42 : 0}%, transparent)`,
          transition: 'background 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </motion.button>
  );
}
