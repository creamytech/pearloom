'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/CanvasEditor.tsx
// Free-canvas drag-and-drop block editor
// Like Webflow / Framer — add blocks anywhere, drag to reorder,
// click to configure per-block in a floating right panel.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from 'react';
import { CustomSelect } from '@/components/ui/custom-select';
import { RangeSlider } from '@/components/ui/range-slider';
import { ColorPicker } from '@/components/ui/color-picker';
import { motion, AnimatePresence } from 'framer-motion';
import { useDragSort } from './useDragSort';
import type { DragHandleProps } from './useDragSort';
import { BlockPresetsPanel } from './BlockPresetsPanel';
import { SidebarSection } from './EditorSidebar';
import {
  Plus, Eye, EyeOff, Trash2, Copy, ChevronUp,
  ChevronDown, ChevronRight, X,
  Sparkles, LayoutTemplate,
  Music, Hash, ImageIcon, PartyPopper,
  Heart, MessageSquareQuote, Users2, Footprints,
} from 'lucide-react';
import {
  BlockHeroIcon, BlockStoryIcon, BlockEventIcon, BlockCountdownIcon,
  BlockRsvpIcon, BlockRegistryIcon, BlockTravelIcon, BlockFaqIcon,
  BlockPhotosIcon, BlockGuestbookIcon, BlockMapIcon, BlockQuoteIcon,
  BlockTextIcon, BlockVideoIcon, BlockDividerIcon, GripIcon,
} from '@/components/icons/EditorIcons';
import {
  IconReveal, IconChevronDown,
  IconRevealNone, IconRevealFade, IconRevealSlideUp,
  IconRevealSlideLeft, IconRevealZoom, IconRevealBlur,
} from './EditorIcons';
import type { StoryManifest, PageBlock, BlockType, WeddingEvent } from '@/types';

// ── Block Catalogue ────────────────────────────────────────────
type OccasionTag = 'wedding' | 'anniversary' | 'engagement' | 'birthday' | 'story';
const ALL_OCCASIONS: OccasionTag[] = ['wedding', 'anniversary', 'engagement', 'birthday', 'story'];

interface BlockDef {
  type: BlockType;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  occasions: OccasionTag[]; // which occasion types this block applies to
  defaultConfig?: Record<string, unknown>;
}

const BLOCK_CATALOGUE: BlockDef[] = [
  { type: 'hero',      label: 'Hero',              icon: BlockHeroIcon,      description: 'Full-screen hero with names & cover photo',  color: 'var(--pl-olive, #A3B18A)', occasions: ALL_OCCASIONS },
  { type: 'story',     label: 'Our Story',         icon: BlockStoryIcon,     description: 'Chapter timeline & photo narrative',          color: '#7c5cbf', occasions: ALL_OCCASIONS },
  { type: 'event',     label: 'Event Cards',       icon: BlockEventIcon,     description: 'Ceremony, reception & event details',         color: '#e8927a', occasions: ['wedding', 'engagement'] },
  { type: 'countdown', label: 'Countdown',         icon: BlockCountdownIcon, description: 'Live countdown to your big day',              color: '#4a9b8a', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'rsvp',      label: 'RSVP',              icon: BlockRsvpIcon,      description: 'Guest RSVP form with meal preferences',       color: '#e87ab8', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'registry',  label: 'Registry',          icon: BlockRegistryIcon,  description: 'Registry links & honeymoon fund',             color: '#c4774a', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'travel',    label: 'Travel & Hotels',   icon: BlockTravelIcon,    description: 'Hotels, airports & directions',               color: '#4a7a9b', occasions: ['wedding', 'engagement'] },
  { type: 'faq',       label: 'FAQ',               icon: BlockFaqIcon,       description: 'Common guest questions & answers',            color: '#8b7a4a', occasions: ['wedding', 'engagement'] },
  { type: 'photos',    label: 'Photo Wall',        icon: BlockPhotosIcon,    description: 'Guest photo gallery with uploads',            color: '#4a8b6a', occasions: ALL_OCCASIONS },
  { type: 'guestbook', label: 'Guestbook',         icon: BlockGuestbookIcon, description: 'Public guest wishes & AI highlights',         color: '#7a4a8b', occasions: ALL_OCCASIONS },
  { type: 'map',       label: 'Map',               icon: BlockMapIcon,       description: 'Embedded venue map',                          color: '#4a6a8b', occasions: ['wedding', 'engagement', 'anniversary'] },
  { type: 'quote',     label: 'Quote',             icon: BlockQuoteIcon,     description: 'Romantic quote or vow snippet',               color: '#8b4a6a', occasions: ALL_OCCASIONS },
  { type: 'text',      label: 'Text Block',        icon: BlockTextIcon,      description: 'Custom text section',                         color: '#6a8b4a', occasions: ALL_OCCASIONS },
  { type: 'video',     label: 'Video',             icon: BlockVideoIcon,     description: 'YouTube or Vimeo embed',                      color: '#4a4a8b', occasions: ALL_OCCASIONS },
  { type: 'divider',   label: 'Divider',           icon: BlockDividerIcon,   description: 'Visual section separator',                    color: '#8b8b4a', occasions: ALL_OCCASIONS },
  { type: 'vibeQuote', label: 'Vibe Quote',        icon: MessageSquareQuote, description: 'Atmospheric quote with decorative symbol',    color: '#9b6a8b', occasions: ALL_OCCASIONS },
  { type: 'welcome',   label: 'Welcome',           icon: Heart,              description: 'Personal welcome statement from the couple',  color: '#c47a7a', occasions: ALL_OCCASIONS },
  { type: 'spotify',   label: 'Spotify Playlist',  icon: Music,              description: 'Embedded Spotify playlist for your guests',   color: '#1DB954', occasions: ALL_OCCASIONS },
  { type: 'hashtag',   label: 'Hashtag',           icon: Hash,               description: 'Social media hashtag for your event',         color: '#4a7a9b', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'photoWall', label: 'Photo Wall',        icon: ImageIcon,          description: 'Full-width photo mosaic display',             color: '#7a6a4a', occasions: ALL_OCCASIONS },
  { type: 'gallery',   label: 'Gallery Grid',      icon: BlockPhotosIcon,    description: 'Photo gallery with lightbox viewing',         color: '#4a8b6a', occasions: ALL_OCCASIONS },
  { type: 'quiz',      label: 'Couple Quiz',       icon: Sparkles,           description: 'Fun quiz about the couple for guests',        color: '#b88a4a', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'weddingParty', label: 'Wedding Party',  icon: Users2,             description: 'Bridal party, groomsmen & roles',             color: '#7c5cbf', occasions: ['wedding', 'engagement'] },
  { type: 'anniversary', label: 'Anniversary',     icon: PartyPopper,        description: 'Anniversary milestones & memories',           color: '#c4774a', occasions: ['anniversary'] },
  { type: 'storymap',  label: 'Story Map',         icon: BlockMapIcon,       description: 'Interactive map of your journey together',    color: '#4a6a8b', occasions: ALL_OCCASIONS },
  { type: 'footer',    label: 'Footer',            icon: Footprints,         description: 'Site footer with credits and links',          color: '#7a7a7a', occasions: ALL_OCCASIONS },
];

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

// ── Event-Type-Specific Fields ────────────────────────────────
const EVENT_TYPES: Record<WeddingEvent['type'], {
  label: string; color: string;
  specificFields: Array<{ key: string; label: string; type: 'text' | 'select' | 'toggle' | 'number'; options?: string[] }>;
}> = {
  ceremony: {
    label: 'Ceremony', color: '#7c5cbf',
    specificFields: [
      { key: 'officiant',        label: 'Officiant name',      type: 'text' },
      { key: 'ceremonyLength',   label: 'Length (e.g. 30 min)', type: 'text' },
      { key: 'vowsType',         label: 'Vows type',           type: 'select', options: ['traditional', 'personal', 'mix'] },
      { key: 'unityRitual',      label: 'Unity ritual',        type: 'text' },
      { key: 'processionalSong', label: 'Processional song',   type: 'text' },
      { key: 'recessionalSong',  label: 'Recessional song',    type: 'text' },
      { key: 'seating',          label: 'Seating',             type: 'select', options: ['open', 'assigned'] },
    ],
  },
  reception: {
    label: 'Reception', color: '#e8927a',
    specificFields: [
      { key: 'cocktailHour',       label: 'Cocktail hour',          type: 'toggle' },
      { key: 'cocktailHourTime',   label: 'Cocktail hour time',     type: 'text' },
      { key: 'dinnerType',         label: 'Dinner style',           type: 'select', options: ['plated', 'buffet', 'stations', 'family-style'] },
      { key: 'openBar',            label: 'Open bar',               type: 'toggle' },
      { key: 'barClosesAt',        label: 'Bar closes at',          type: 'text' },
      { key: 'firstDanceSong',     label: 'First dance song',       type: 'text' },
      { key: 'parentDanceSong',    label: 'Parent dance song',      type: 'text' },
      { key: 'bouquetToss',        label: 'Bouquet toss',           type: 'toggle' },
      { key: 'guestSongRequests',  label: 'Guest song requests',    type: 'toggle' },
      { key: 'photoBooth',         label: 'Photo booth',            type: 'toggle' },
      { key: 'photoBoothNote',     label: 'Photo booth details',    type: 'text' },
      { key: 'tableCount',         label: 'Number of tables',       type: 'number' },
    ],
  },
  rehearsal: {
    label: 'Rehearsal Dinner', color: '#4a9b8a',
    specificFields: [
      { key: 'whoIsInvited',   label: 'Who is invited',     type: 'text' },
      { key: 'dinnerFollows',  label: 'Dinner follows',     type: 'toggle' },
      { key: 'dinnerVenue',    label: 'Dinner venue',       type: 'text' },
      { key: 'dresscode',      label: 'Dress code',         type: 'text' },
    ],
  },
  brunch: {
    label: 'Farewell Brunch', color: '#c4774a',
    specificFields: [
      { key: 'foodStyle',    label: 'Food style',       type: 'text' },
      { key: 'kidsWelcome',  label: 'Kids welcome',     type: 'toggle' },
    ],
  },
  'welcome-party': {
    label: 'Welcome Party', color: '#8b4a6a',
    specificFields: [
      { key: 'foodStyle',    label: 'Food style',       type: 'text' },
      { key: 'kidsWelcome',  label: 'Kids welcome',     type: 'toggle' },
    ],
  },
  other: {
    label: 'Custom Event', color: '#6a8b4a',
    specificFields: [],
  },
};

// ── Shared mini styles ──────────────────────────────────────────
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.62rem', fontWeight: 800,
  letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'var(--pl-muted)', marginBottom: '0.4rem',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem',
  border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(163,177,138,0.06)',
  color: 'var(--pl-ink)', fontSize: 'max(16px, 0.82rem)', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
};

function MiniInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={inp}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.5)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
      />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--pl-ink-soft)' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '36px', height: '20px', borderRadius: '100px',
          background: value ? 'var(--pl-olive, #A3B18A)' : 'rgba(255,255,255,0.3)',
          border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: '2px', left: value ? '18px' : '2px',
          width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', display: 'block',
        }} />
      </button>
    </div>
  );
}

// ── Event Block Config Panel ───────────────────────────────────
function EventBlockConfig({ events, onChange }: {
  events: WeddingEvent[];
  onChange: (events: WeddingEvent[]) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(events[0]?.id || null);

  const upd = (id: string, data: Partial<WeddingEvent>) =>
    onChange(events.map(e => e.id === id ? { ...e, ...data } : e));

  const updSpecific = (id: string, section: 'ceremony' | 'reception' | 'rehearsal' | 'social', data: Record<string, unknown>) =>
    onChange(events.map(e => e.id === id ? { ...e, [section]: { ...(e[section] as Record<string, unknown> || {}), ...data } } : e));

  const addEvent = (type: WeddingEvent['type']) => {
    const def = EVENT_TYPES[type];
    const id = `evt-${Date.now()}`;
    const newEv: WeddingEvent = {
      id, name: def.label, type,
      date: '', time: '', venue: '', address: '',
    };
    onChange([...events, newEv]);
    setActiveId(id);
  };

  const remove = (id: string) => {
    onChange(events.filter(e => e.id !== id));
    if (activeId === id) setActiveId(events[0]?.id || null);
  };

  const activeEvent = events.find(e => e.id === activeId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Event tab strip */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {events.map(e => {
          const def = EVENT_TYPES[e.type || 'other'];
          return (
            <button
              key={e.id}
              onClick={() => setActiveId(e.id)}
              style={{
                padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700,
                background: activeId === e.id ? def.color : 'rgba(255,255,255,0.25)',
                color: activeId === e.id ? '#fff' : 'var(--pl-ink-soft)',
                transition: 'all 0.15s',
              }}
            >
              {e.name}
            </button>
          );
        })}
      </div>

      {/* Add event dropdown */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {Object.entries(EVENT_TYPES).map(([type, def]) => (
          <button
            key={type}
            onClick={() => addEvent(type as WeddingEvent['type'])}
            style={{
              padding: '3px 8px', borderRadius: '6px', border: `1px dashed ${def.color}50`,
              background: 'transparent', color: def.color, cursor: 'pointer', fontSize: '0.62rem', fontWeight: 700,
              transition: 'all 0.15s',
            }}
            title={`Add ${def.label}`}
          >
            + {def.label}
          </button>
        ))}
      </div>

      {/* Active event editor */}
      {activeEvent && (() => {
        const def = EVENT_TYPES[activeEvent.type || 'other'];
        const sectionKey = activeEvent.type === 'ceremony' ? 'ceremony'
          : activeEvent.type === 'reception' ? 'reception'
          : activeEvent.type === 'rehearsal' ? 'rehearsal'
          : 'social';

        const sectionData = (activeEvent[sectionKey as keyof WeddingEvent] as Record<string, unknown>) || {};

        return (
          <div style={{ background: `${def.color}10`, borderRadius: '12px', border: `1px solid ${def.color}30`, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Event type badge + name + delete */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ flex: 1, fontSize: '0.72rem', fontWeight: 800, color: def.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {def.label}
              </span>
              <button onClick={() => remove(activeEvent.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', padding: '2px' }}>
                <Trash2 size={12} />
              </button>
            </div>

            {/* Type selector */}
            <div>
              <label style={lbl}>Event type</label>
              <select
                value={activeEvent.type}
                onChange={e => upd(activeEvent.id, { type: e.target.value as WeddingEvent['type'] })}
                style={{ ...inp, color: 'var(--pl-ink)' }}
              >
                {Object.entries(EVENT_TYPES).map(([t, d]) => (
                  <option key={t} value={t} style={{ background: '#1a1a18' }}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Core fields */}
            <MiniInput label="Event name" value={activeEvent.name} onChange={v => upd(activeEvent.id, { name: v })} placeholder="Ceremony" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <MiniInput label="Date (YYYY-MM-DD)" value={activeEvent.date} onChange={v => upd(activeEvent.id, { date: v })} placeholder="2025-06-14" />
              <MiniInput label="Start time" value={activeEvent.time} onChange={v => upd(activeEvent.id, { time: v })} placeholder="5:00 PM" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <MiniInput label="End time" value={activeEvent.endTime || ''} onChange={v => upd(activeEvent.id, { endTime: v })} placeholder="6:00 PM" />
              <MiniInput label="Dress code" value={activeEvent.dressCode || ''} onChange={v => upd(activeEvent.id, { dressCode: v })} placeholder="Black Tie" />
            </div>
            <MiniInput label="Venue name" value={activeEvent.venue} onChange={v => upd(activeEvent.id, { venue: v })} placeholder="The Grand Pavilion" />
            <MiniInput label="Full address" value={activeEvent.address} onChange={v => upd(activeEvent.id, { address: v })} placeholder="123 Main St, Newport, RI" />

            {/* Event-specific fields */}
            {def.specificFields.length > 0 && (
              <>
                <div style={{ height: '1px', background: `${def.color}30`, margin: '4px 0' }} />
                <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: def.color }}>
                  {def.label} specifics
                </div>
                {def.specificFields.map(field => (
                  field.type === 'toggle'
                    ? <Toggle
                        key={field.key}
                        label={field.label}
                        value={!!(sectionData[field.key])}
                        onChange={v => updSpecific(activeEvent.id, sectionKey as 'ceremony', { [field.key]: v })}
                      />
                    : field.type === 'select'
                    ? (
                      <div key={field.key}>
                        <label style={lbl}>{field.label}</label>
                        <select
                          value={String(sectionData[field.key] || '')}
                          onChange={e => updSpecific(activeEvent.id, sectionKey as 'ceremony', { [field.key]: e.target.value })}
                          style={{ ...inp, color: 'var(--pl-ink)' }}
                        >
                          <option value="" style={{ background: '#1a1a18' }}>Select…</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt} style={{ background: '#1a1a18' }}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    )
                    : (
                      <MiniInput
                        key={field.key}
                        label={field.label}
                        value={String(sectionData[field.key] || '')}
                        onChange={v => updSpecific(activeEvent.id, sectionKey as 'ceremony', { [field.key]: v })}
                        type={field.type === 'number' ? 'number' : 'text'}
                      />
                    )
                ))}
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ── Block Row ──────────────────────────────────────────────────
function BlockRow({
  block, def, isActive, onSelect, onToggle, onDelete, onDuplicate, onMoveUp, onMoveDown, dragHandleProps,
  isMobile, isFirst, isLast,
}: {
  block: PageBlock;
  def: BlockDef | undefined;
  isActive: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  dragHandleProps: DragHandleProps;
  isMobile?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = def?.icon || LayoutTemplate;
  const color = def?.color || 'var(--pl-olive, #A3B18A)';
  const showActions = isActive || hovered;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: block.visible ? 1 : 0.38 }}
      whileHover={{ y: isActive ? 0 : -1 }}
      transition={{ duration: 0.15 }}
      onClick={() => onSelect(block.id)}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '13px 10px 13px 8px',
        minHeight: '68px',
        borderRadius: '10px',
        background: isActive ? `rgba(255,255,255,0.8)` : hovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: `1px solid ${isActive ? `${color}40` : hovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)'}`,
        borderLeft: isActive ? `3px solid ${color}` : `1px solid ${hovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)'}`,
        cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
        userSelect: 'none',
        boxShadow: isActive ? `0 2px 12px ${color}18, 0 0 0 1px ${color}08` : hovered ? '0 2px 8px rgba(43,30,20,0.04)' : 'none',
      }}
    >
      {/* Drag handle — unified for mobile and desktop */}
      <div
        {...dragHandleProps}
        onClick={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        aria-label="Hold and drag to reorder"
        style={{
          ...dragHandleProps.style,
          color: 'var(--pl-muted)',
          display: 'flex',
          flexShrink: 0,
          padding: isMobile ? '8px 10px' : '4px',
          borderRadius: '4px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-ink-soft)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)'; }}
      >
        <GripIcon size={isMobile ? 16 : 14} />
      </div>

      {/* Icon */}
      <div style={{
        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
        background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${color}30`,
      }}>
        <Icon size={15} color={color} />
      </div>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: block.visible ? 'var(--pl-ink)' : 'var(--pl-muted)', lineHeight: 1.3 }}>
          {def?.label || block.type.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--pl-ink-soft)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {def?.description}
        </div>
      </div>

      {/* Actions — reveal on hover or active */}
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', gap: '2px', alignItems: 'center' }}
            >
              {!isFirst && (
                <button
                  onClick={e => { e.stopPropagation(); onMoveUp(block.id); }}
                  title="Move up"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px', transition: 'color 0.15s', minWidth: '28px', minHeight: '28px' }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-ink)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)'; }}
                >
                  <ChevronUp size={13} />
                </button>
              )}
              {!isLast && (
                <button
                  onClick={e => { e.stopPropagation(); onMoveDown(block.id); }}
                  title="Move down"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px', transition: 'color 0.15s', minWidth: '28px', minHeight: '28px' }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-ink)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)'; }}
                >
                  <ChevronDown size={13} />
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); onToggle(block.id); }}
                title={block.visible ? 'Hide section' : 'Show section'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: block.visible ? 'var(--pl-muted)' : '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '6px', transition: 'color 0.15s', minWidth: '36px', minHeight: '36px' }}
              >
                {block.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDuplicate(block.id); }}
                title="Duplicate block"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '6px', transition: 'color 0.15s', minWidth: '36px', minHeight: '36px' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-olive)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)'; }}
              >
                <Copy size={14} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(block.id); }}
                title="Remove block"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '6px', transition: 'color 0.15s', minWidth: '36px', minHeight: '36px' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)'; }}
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Expand chevron — always visible */}
        <motion.div
          animate={{ rotate: isActive ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: isActive ? color : 'var(--pl-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', minWidth: '36px', minHeight: '36px' }}
        >
          <ChevronDown size={14} />
        </motion.div>
      </div>

      {/* Active indicator bar */}
      {isActive && (
        <div style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: '3px', height: '65%', borderRadius: '0 3px 3px 0', background: color,
        }} />
      )}
    </motion.div>
  );
}

// ── Section Styling Controls ────────────────────────────────────
function SectionStylePanel({
  block, blocksKey, manifest, onChange,
}: {
  block: PageBlock;
  blocksKey: 'blocks' | { customPageId: string };
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const config = block.config || {};

  const updateConfig = (patch: Record<string, unknown>) => {
    if (typeof blocksKey === 'string') {
      // Main page blocks
      onChange({
        ...manifest,
        blocks: (manifest.blocks || []).map(b =>
          b.id === block.id ? { ...b, config: { ...b.config, ...patch } } : b
        ),
      });
    } else {
      // Custom page blocks
      onChange({
        ...manifest,
        customPages: (manifest.customPages || []).map(p =>
          p.id === blocksKey.customPageId
            ? { ...p, blocks: p.blocks.map(b => b.id === block.id ? { ...b, config: { ...b.config, ...patch } } : b) }
            : p
        ),
      });
    }
  };

  const PRESET_BG_COLORS = [
    { label: 'None', value: '' },
    { label: 'Light', value: '#ffffff' },
    { label: 'Cream', value: '#faf8f4' },
    { label: 'Warm', value: '#f5efe6' },
    { label: 'Blush', value: '#fdf0f3' },
    { label: 'Sage', value: '#eef2ed' },
    { label: 'Slate', value: '#f0f2f5' },
    { label: 'Dark', value: 'var(--pl-ink-soft, #3D3530)' },
    { label: 'Navy', value: '#1a2332' },
    { label: 'Mocha', value: '#2c2420' },
    { label: 'Accent', value: 'accent' },
  ];

  const PADDING_OPTS = [
    { label: 'S', value: '2rem' },
    { label: 'M', value: '4rem' },
    { label: 'L', value: '6rem' },
    { label: 'XL', value: '8rem' },
  ];

  const ALIGN_OPTS = ['left', 'center', 'right'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '12px', marginTop: '4px' }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(163,177,138,0.7)' }}>
        Section Style
      </div>

      {/* Background color */}
      <div>
        <label style={lbl}>Background</label>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {PRESET_BG_COLORS.map(bg => {
            const isActive = (config.bgColor || '') === bg.value;
            return (
              <button
                key={bg.value}
                title={bg.label}
                onClick={() => updateConfig({ bgColor: bg.value })}
                style={{
                  width: '24px', height: '24px', borderRadius: '6px',
                  border: isActive ? '2px solid var(--pl-olive, #A3B18A)' : '1px solid rgba(255,255,255,0.3)',
                  background: bg.value === 'accent' ? 'linear-gradient(135deg, #A3B18A, #8FA876)' : bg.value || 'transparent',
                  cursor: 'pointer', position: 'relative', transition: 'border 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {!bg.value && <X size={10} color="var(--pl-muted)" />}
              </button>
            );
          })}
        </div>
        {/* Custom hex input */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          <ColorPicker
            value={(config.bgColor as string) || '#ffffff'}
            onChange={(c) => updateConfig({ bgColor: c })}
          />
          <input
            value={config.bgColor as string || ''}
            onChange={e => updateConfig({ bgColor: e.target.value })}
            placeholder="Custom #hex"
            style={{ ...inp, flex: 1, fontSize: '0.72rem', padding: '4px 8px' }}
          />
        </div>
      </div>

      {/* Padding */}
      <div>
        <label style={lbl}>Vertical Padding</label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {PADDING_OPTS.map(p => {
            const isActive = (config.verticalPadding || '4rem') === p.value;
            return (
              <button
                key={p.value}
                onClick={() => updateConfig({ verticalPadding: p.value })}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: '6px', border: 'none',
                  background: isActive ? 'rgba(163,177,138,0.25)' : 'rgba(255,255,255,0.2)',
                  color: isActive ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-ink-soft)',
                  fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Text alignment */}
      <div>
        <label style={lbl}>Text Align</label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {ALIGN_OPTS.map(a => {
            const isActive = (config.textAlign || 'center') === a;
            return (
              <button
                key={a}
                onClick={() => updateConfig({ textAlign: a })}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: '6px', border: 'none',
                  background: isActive ? 'rgba(163,177,138,0.25)' : 'rgba(255,255,255,0.2)',
                  color: isActive ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-ink-soft)',
                  fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>

      {/* Text color override */}
      <div>
        <label style={lbl}>Text Color</label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['', 'var(--pl-ink-soft, #3D3530)', '#ffffff', '#8c8c8c', 'var(--pl-olive, #A3B18A)'].map(c => {
            const isActive = (config.textColor || '') === c;
            return (
              <button
                key={c || 'auto'}
                onClick={() => updateConfig({ textColor: c })}
                style={{
                  width: '28px', height: '28px', borderRadius: '6px',
                  border: isActive ? '2px solid var(--pl-olive, #A3B18A)' : '1px solid rgba(255,255,255,0.3)',
                  background: c || 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {!c && <span style={{ fontSize: '0.62rem', color: 'var(--pl-ink-soft)', fontWeight: 700 }}>A</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Block Config Panel ──────────────────────────────────────────
function BlockConfigPanel({
  block, def, manifest, onChange, blocksKey,
}: {
  block: PageBlock;
  def: BlockDef | undefined;
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  blocksKey: 'blocks' | { customPageId: string };
}) {
  const updateBlockConfig = (patch: Record<string, unknown>) => {
    if (typeof blocksKey === 'string') {
      onChange({
        ...manifest,
        blocks: (manifest.blocks || []).map(b =>
          b.id === block.id ? { ...b, config: { ...b.config, ...patch } } : b
        ),
      });
    } else {
      onChange({
        ...manifest,
        customPages: (manifest.customPages || []).map(p =>
          p.id === blocksKey.customPageId
            ? { ...p, blocks: p.blocks.map(b => b.id === block.id ? { ...b, config: { ...b.config, ...patch } } : b) }
            : p
        ),
      });
    }
  };

  const noConfig = (
    <p style={{ fontSize: '0.75rem', color: 'var(--pl-ink-soft)', lineHeight: 1.6 }}>
      This block uses your site-wide content. Edit it from the Story, Events, or Details tabs.
    </p>
  );

  const blockContent = (() => {
    switch (block.type) {
      case 'event':
        return (
          <EventBlockConfig
            events={manifest.events || []}
            onChange={events => onChange({ ...manifest, events })}
          />
        );

      case 'quote':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <MiniInput
              label="Quote text"
              value={String(block.config?.text || '')}
              onChange={v => updateBlockConfig({ text: v })}
              placeholder='"Two souls, one heart."'
            />
            <MiniInput
              label="Attribution (optional)"
              value={String(block.config?.attribution || '')}
              onChange={v => updateBlockConfig({ attribution: v })}
              placeholder="— Pablo Neruda"
            />
          </div>
        );

      case 'text':
        return (
          <div>
            <label style={lbl}>Content</label>
            <textarea
              value={String(block.config?.text || '')}
              onChange={e => updateBlockConfig({ text: e.target.value })}
              rows={5}
              placeholder="Write anything here — a welcome message, a story, a note to guests..."
              style={{ ...inp, resize: 'vertical', lineHeight: 1.65 }}
            />
          </div>
        );

      case 'video':
        return (
          <MiniInput
            label="YouTube or Vimeo URL"
            value={String(block.config?.url || '')}
            onChange={v => updateBlockConfig({ url: v })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        );

      case 'countdown':
        return (
          <MiniInput
            label="Target date (YYYY-MM-DD)"
            value={String(block.config?.date || manifest.events?.[0]?.date || '')}
            onChange={v => updateBlockConfig({ date: v })}
            placeholder={manifest.events?.[0]?.date || '2025-06-14'}
          />
        );

      case 'map':
        return (
          <MiniInput
            label="Address or venue name"
            value={String(block.config?.address || manifest.events?.[0]?.address || manifest.logistics?.venue || '')}
            onChange={v => updateBlockConfig({ address: v })}
            placeholder={manifest.events?.[0]?.address || manifest.logistics?.venue || 'The Grand Ballroom, New York'}
          />
        );

      default:
        return noConfig;
    }
  })();

  // ── updateBlockEffects — writes to block.blockEffects ───────
  const updateBlockEffects = (patch: Partial<NonNullable<PageBlock['blockEffects']>>) => {
    const next = { ...block.blockEffects, ...patch };
    if (typeof blocksKey === 'string') {
      onChange({
        ...manifest,
        blocks: (manifest.blocks || []).map(b =>
          b.id === block.id ? { ...b, blockEffects: next } : b
        ),
      });
    } else {
      onChange({
        ...manifest,
        customPages: (manifest.customPages || []).map(p =>
          p.id === blocksKey.customPageId
            ? { ...p, blocks: p.blocks.map(b => b.id === block.id ? { ...b, blockEffects: next } : b) }
            : p
        ),
      });
    }
  };

  const handleApplyPreset = (config: Record<string, unknown>, blockEffects?: PageBlock['blockEffects']) => {
    if (typeof blocksKey === 'string') {
      onChange({
        ...manifest,
        blocks: (manifest.blocks || []).map(b =>
          b.id === block.id ? { ...b, config: { ...b.config, ...config }, ...(blockEffects !== undefined ? { blockEffects } : {}) } : b
        ),
      });
    } else {
      onChange({
        ...manifest,
        customPages: (manifest.customPages || []).map(p =>
          p.id === (blocksKey as { customPageId: string }).customPageId
            ? { ...p, blocks: (p.blocks || []).map(b => b.id === block.id ? { ...b, config: { ...b.config, ...config }, ...(blockEffects !== undefined ? { blockEffects } : {}) } : b) }
            : p
        ),
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {blockContent}
      <SectionStylePanel block={block} blocksKey={blocksKey} manifest={manifest} onChange={onChange} />
      <BlockEffectsEditor blockEffects={block.blockEffects ?? {}} onUpdate={updateBlockEffects} />
      <SidebarSection title="Block Presets" defaultOpen={false}>
        <BlockPresetsPanel block={block} onApply={handleApplyPreset} />
      </SidebarSection>
    </div>
  );
}

// ── BlockEffectsEditor — per-block FX controls ────────────────
const REVEAL_OPTIONS: Array<{ value: string; label: string; icon: React.ReactNode }> = [
  { value: 'none',       label: 'None',     icon: <IconRevealNone size={12} /> },
  { value: 'fade',       label: 'Fade',     icon: <IconRevealFade size={12} /> },
  { value: 'slide-up',   label: 'Slide Up', icon: <IconRevealSlideUp size={12} /> },
  { value: 'slide-left', label: 'Slide In', icon: <IconRevealSlideLeft size={12} /> },
  { value: 'zoom',       label: 'Zoom',     icon: <IconRevealZoom size={12} /> },
  { value: 'blur-in',    label: 'Blur',     icon: <IconRevealBlur size={12} /> },
];

const DIVIDER_OPTIONS: Array<{ value: string | null; label: string; preview: string }> = [
  { value: null,       label: 'Default', preview: '─' },
  { value: 'wave',     label: 'Wave',    preview: '∿' },
  { value: 'wave2',    label: 'Wave 2',  preview: '∿∿' },
  { value: 'diagonal', label: 'Diagonal',preview: '╱' },
  { value: 'zigzag',   label: 'Zigzag',  preview: '/\\' },
  { value: 'torn',     label: 'Torn',    preview: 'ᵥᵥ' },
  { value: 'chevron',  label: 'Chevron', preview: '∧' },
  { value: 'arc',      label: 'Arc',     preview: '⌢' },
];

function BlockEffectsEditor({
  blockEffects,
  onUpdate,
}: {
  blockEffects: NonNullable<PageBlock['blockEffects']>;
  onUpdate: (patch: Partial<NonNullable<PageBlock['blockEffects']>>) => void;
}) {
  const [open, setOpen] = useState(false);

  const reveal = blockEffects.scrollReveal ?? 'none';
  const divStyle = blockEffects.dividerAbove?.style ?? null;
  const divHeight = blockEffects.dividerAbove?.height ?? 80;
  const hasEffects = reveal !== 'none' || divStyle !== null;

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.25)', marginTop: '6px', paddingTop: '6px' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '6px',
          padding: '7px 0', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', color: hasEffects ? 'rgba(214,198,168,0.9)' : 'var(--pl-muted)' }}>
          <IconReveal size={14} />
        </span>
        <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, color: hasEffects ? 'rgba(214,198,168,0.95)' : 'var(--pl-ink-soft)' }}>
          Block Effects
        </span>
        {hasEffects && (
          <span style={{
            fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'rgba(163,177,138,0.9)', background: 'rgba(163,177,138,0.12)',
            padding: '2px 6px', borderRadius: '100px', border: '1px solid rgba(163,177,138,0.25)',
          }}>ON</span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', color: 'var(--pl-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <IconChevronDown size={14} />
        </span>
      </button>

      {open && (
        <div style={{ paddingBottom: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Scroll reveal */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '6px' }}>
              Entrance Animation
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {REVEAL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate({ scrollReveal: opt.value === 'none' ? undefined : (opt.value as 'fade' | 'slide-up' | 'slide-left' | 'zoom' | 'blur-in') })}
                  style={{
                    padding: '5px 9px', borderRadius: '7px',
                    border: `1px solid ${reveal === opt.value ? 'rgba(163,177,138,0.6)' : 'rgba(255,255,255,0.25)'}`,
                    background: reveal === opt.value ? 'rgba(163,177,138,0.14)' : 'rgba(163,177,138,0.05)',
                    color: reveal === opt.value ? 'rgba(163,177,138,1)' : 'var(--pl-ink-soft)',
                    cursor: 'pointer', fontSize: '0.72rem', fontWeight: reveal === opt.value ? 700 : 400,
                    display: 'flex', alignItems: 'center', gap: '4px',
                    transition: 'all 0.12s',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider above */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '6px' }}>
              Divider Shape Above
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {DIVIDER_OPTIONS.map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => {
                    if (opt.value === null) {
                      onUpdate({ dividerAbove: undefined });
                    } else {
                      onUpdate({ dividerAbove: { style: opt.value as 'wave' | 'wave2' | 'diagonal' | 'zigzag' | 'torn' | 'chevron' | 'arc', height: divHeight } });
                    }
                  }}
                  style={{
                    padding: '5px 9px', borderRadius: '7px',
                    border: `1px solid ${divStyle === opt.value ? 'rgba(163,177,138,0.6)' : 'rgba(255,255,255,0.25)'}`,
                    background: divStyle === opt.value ? 'rgba(163,177,138,0.14)' : 'rgba(163,177,138,0.05)',
                    color: divStyle === opt.value ? 'rgba(163,177,138,1)' : 'var(--pl-ink-soft)',
                    cursor: 'pointer', fontSize: '0.72rem', fontWeight: divStyle === opt.value ? 700 : 400,
                    display: 'flex', alignItems: 'center', gap: '4px',
                    transition: 'all 0.12s',
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', opacity: 0.7 }}>{opt.preview}</span>
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Height slider — shown only when a custom divider is active */}
            {divStyle !== null && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--pl-ink-soft)' }}>Height</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', fontWeight: 700 }}>{divHeight}px</span>
                </div>
                <RangeSlider min={30} max={200} value={divHeight} suffix="px"
                  onChange={v => onUpdate({ dividerAbove: { style: divStyle, height: v } })}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Block Picker ───────────────────────────────────────────
function AddBlockPicker({ onAdd, onDragType, existingTypes, occasion = 'wedding' }: { onAdd: (type: BlockType) => void; onDragType?: (type: BlockType | null) => void; existingTypes: Set<BlockType>; occasion?: OccasionTag }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = BLOCK_CATALOGUE
    .filter(b => b.occasions.includes(occasion))
    .filter(b =>
      b.label.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          padding: '11px 14px', borderRadius: '8px',
          border: '1px solid rgba(163,177,138,0.22)',
          background: open ? 'rgba(163,177,138,0.12)' : 'rgba(163,177,138,0.06)',
          color: 'rgba(163,177,138,0.95)', cursor: 'pointer',
          fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em',
          transition: 'all 0.15s',
          boxShadow: open ? 'inset 0 1px 0 rgba(163,177,138,0.05)' : 'none',
        }}
      >
        <Sparkles size={13} />
        <span>Add Section</span>
        {open ? <ChevronDown size={12} style={{ opacity: 0.6 }} /> : <ChevronRight size={12} style={{ opacity: 0.6 }} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 100,
              background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '12px', overflow: 'hidden', marginTop: '4px',
              boxShadow: '0 20px 60px rgba(43,30,20,0.1)',
            }}
          >
            {/* Search */}
            <div style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.25)' }}>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search blocks…"
                style={{ ...inp, fontSize: '0.78rem', padding: '6px 10px' }}
              />
            </div>

            {/* Block list */}
            <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {filtered.map(b => (
                <button
                  key={b.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('pearloom/block-type', b.type);
                    e.dataTransfer.effectAllowed = 'copy';
                    onDragType?.(b.type);
                  }}
                  onDragEnd={() => onDragType?.(null)}
                  onClick={() => { onAdd(b.type); setOpen(false); setSearch(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 10px', borderRadius: '8px',
                    border: `1px solid ${existingTypes.has(b.type) ? `${b.color}28` : 'transparent'}`,
                    background: existingTypes.has(b.type) ? `${b.color}08` : 'transparent',
                    borderLeft: `2px solid ${existingTypes.has(b.type) ? b.color : 'transparent'}`,
                    cursor: 'grab', textAlign: 'left', transition: 'all 0.12s',
                  }}
                  onMouseOver={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = `${b.color}12`;
                    el.style.borderColor = `${b.color}35`;
                    el.style.borderLeftColor = b.color;
                  }}
                  onMouseOut={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = existingTypes.has(b.type) ? `${b.color}08` : 'transparent';
                    el.style.borderColor = existingTypes.has(b.type) ? `${b.color}28` : 'transparent';
                    el.style.borderLeftColor = existingTypes.has(b.type) ? b.color : 'transparent';
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                    background: `${b.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${b.color}28`,
                  }}>
                    <b.icon size={15} color={b.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--pl-ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {b.label}
                      {existingTypes.has(b.type) && (
                        <span style={{ fontSize: '0.58rem', color: b.color, padding: '1px 5px', borderRadius: '4px', background: `${b.color}18`, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>added</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--pl-muted)', marginTop: '1px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{b.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main CanvasEditor ──────────────────────────────────────────
interface CanvasEditorProps {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  pushToPreview: (m: StoryManifest) => void;
  onDragStateChange?: (dragging: boolean) => void;
}

export function CanvasEditor({ manifest, onChange, pushToPreview, onDragStateChange }: CanvasEditorProps) {
  // 'main' = main page, otherwise a custom page ID
  const [activePage, setActivePage] = useState<string>('main');
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');

  const customPages = manifest.customPages || [];
  const isCustomPage = activePage !== 'main';
  const currentCustomPage = isCustomPage ? customPages.find(p => p.id === activePage) : null;

  // Resolve current blocks based on which page is selected
  const currentBlocks = isCustomPage
    ? (currentCustomPage?.blocks || [])
    : (manifest.blocks && manifest.blocks.length > 0 ? manifest.blocks : DEFAULT_BLOCKS);

  const [blocks, setBlocks] = useState<PageBlock[]>(currentBlocks);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Sync blocks when page changes
  useEffect(() => {
    const newBlocks = isCustomPage
      ? (currentCustomPage?.blocks || [])
      : (manifest.blocks && manifest.blocks.length > 0 ? manifest.blocks : DEFAULT_BLOCKS);
    setBlocks(newBlocks);
    setActiveBlockId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, manifest.blocks]);

  const blocksKey: 'blocks' | { customPageId: string } = isCustomPage
    ? { customPageId: activePage }
    : 'blocks';

  const commit = useCallback((newBlocks: PageBlock[]) => {
    const sorted = newBlocks.map((b, i) => ({ ...b, order: i }));
    setBlocks(sorted);

    let updated: StoryManifest;
    if (isCustomPage && currentCustomPage) {
      updated = {
        ...manifest,
        customPages: (manifest.customPages || []).map(p =>
          p.id === activePage ? { ...p, blocks: sorted } : p
        ),
      };
    } else {
      updated = { ...manifest, blocks: sorted };
    }
    onChange(updated);
    pushToPreview(updated);
  }, [manifest, onChange, pushToPreview, isCustomPage, currentCustomPage, activePage]);

  // ── Drag-and-drop reordering via useDragSort ──────────────────
  const ghostRef = useRef<HTMLDivElement>(null);
  const ghostOffsetRef = useRef({ x: 0, y: 0 });

  const {
    orderedItems: dragOrderedBlocks,
    getDragProps,
    getHandleProps,
    isDragging,
    dropIndex,
    dragId,
  } = useDragSort<PageBlock>({
    items: blocks,
    getKey: (b) => b.id,
    onReorder: (newBlocks) => commit(newBlocks),
    ghostRef: ghostRef as unknown as { current: HTMLElement | null },
    ghostOffsetRef,
  });

  // Notify parent when drag state changes (used to lock sheet dragging)
  useEffect(() => {
    onDragStateChange?.(isDragging);
  }, [isDragging, onDragStateChange]);

  const toggleVisible = useCallback((id: string) => {
    commit(blocks.map(b => b.id === id ? { ...b, visible: !b.visible } : b));
  }, [blocks, commit]);

  const deleteBlock = useCallback((id: string) => {
    commit(blocks.filter(b => b.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
  }, [blocks, commit, activeBlockId]);

  const moveBlockUp = useCallback((id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx <= 0) return;
    const updated = [...blocks];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    commit(updated);
  }, [blocks, commit]);

  const moveBlockDown = useCallback((id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0 || idx >= blocks.length - 1) return;
    const updated = [...blocks];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    commit(updated);
  }, [blocks, commit]);

  const duplicateBlock = useCallback((id: string) => {
    const source = blocks.find(b => b.id === id);
    if (!source) return;
    const idx = blocks.findIndex(b => b.id === id);
    const newId = `${source.type}-dup-${Date.now()}`;
    const dup: PageBlock = { ...source, id: newId, config: source.config ? { ...source.config } : undefined };
    const updated = [...blocks];
    updated.splice(idx + 1, 0, dup);
    commit(updated);
    setActiveBlockId(newId);
  }, [blocks, commit]);

  const addBlock = useCallback((type: BlockType) => {
    const id = `block-${type}-${Date.now()}`;
    const newBlock: PageBlock = { id, type, order: blocks.length, visible: true };
    const updated = [...blocks, newBlock];
    commit(updated);
    setActiveBlockId(id);

    // If adding event block and no events yet, seed a ceremony
    if (type === 'event' && (!manifest.events || manifest.events.length === 0)) {
      const updatedManifest = {
        ...manifest,
        blocks: updated,
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
      onChange(updatedManifest);
      pushToPreview(updatedManifest);
    }
  }, [blocks, commit, manifest, onChange, pushToPreview]);

  const addCustomPage = () => {
    if (!newPageTitle.trim()) return;
    const slug = newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newPage = {
      id: `page-${Date.now()}`,
      slug,
      title: newPageTitle.trim(),
      icon: '',
      blocks: [
        { id: `b-text-${Date.now()}`, type: 'text' as BlockType, order: 0, visible: true },
      ],
      visible: true,
      order: customPages.length,
    };
    const updated = { ...manifest, customPages: [...customPages, newPage] };
    onChange(updated);
    pushToPreview(updated);
    setNewPageTitle('');
    setShowAddPage(false);
    // Auto-switch to the new page
    setActivePage(newPage.id);
  };

  const deleteCustomPage = (id: string) => {
    const updated = { ...manifest, customPages: customPages.filter(p => p.id !== id) };
    onChange(updated);
    pushToPreview(updated);
    if (activePage === id) setActivePage('main');
  };

  // ── External drag: new block being dragged from picker ──────────
  const [draggingNewType, setDraggingNewType] = useState<BlockType | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  const insertBlockAt = useCallback((type: BlockType, position: number) => {
    const id = `block-${type}-${Date.now()}`;
    const newBlock: PageBlock = { id, type, order: position, visible: true };
    const updated = [...blocks];
    updated.splice(position, 0, newBlock);
    commit(updated);
    setActiveBlockId(id);
  }, [blocks, commit]);

  const handleExternalDrop = useCallback((e: React.DragEvent, position: number) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData('pearloom/block-type') as BlockType;
    if (blockType) {
      insertBlockAt(blockType, position);
    }
    setDropTargetIdx(null);
    setDraggingNewType(null);
  }, [insertBlockAt]);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    if (e.dataTransfer.types.includes('pearloom/block-type')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDropTargetIdx(idx);
    }
  }, []);

  // ── Listen for section-click events from preview ──────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const blockType = (e as CustomEvent).detail?.blockType;
      if (!blockType) return;
      const match = blocks.find(b => b.type === blockType);
      if (match) setActiveBlockId(match.id);
    };
    window.addEventListener('pearloom-select-block', handler);
    return () => window.removeEventListener('pearloom-select-block', handler);
  }, [blocks]);

  const activeBlock = blocks.find(b => b.id === activeBlockId);
  const activeDef = activeBlock ? BLOCK_CATALOGUE.find(d => d.type === activeBlock.type) : null;
  const existingTypes = new Set(blocks.map(b => b.type));

  // Available block types not yet added
  const availableBlocks = BLOCK_CATALOGUE
    .filter(b => b.occasions.includes((manifest.occasion || 'wedding') as OccasionTag))
    .filter(b => !existingTypes.has(b.type));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 2px' } as React.CSSProperties}>

        {/* ── Page Selector (collapsed) ── */}
        <div style={{ padding: '0 0 6px', borderBottom: '1px solid rgba(255,255,255,0.2)', marginBottom: '2px' }}>
          <label style={{ ...lbl, marginBottom: '4px', fontSize: '0.55rem' }}>Page</label>
          <select
            value={activePage}
            onChange={e => setActivePage(e.target.value)}
            style={{
              ...inp, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              background: 'rgba(163,177,138,0.1)', borderColor: 'rgba(163,177,138,0.3)',
              color: 'var(--pl-olive, #A3B18A)', padding: '8px 10px',
            }}
          >
            <option value="main" style={{ background: 'var(--pl-ink-soft)', color: '#fff' }}>
              Main Page
            </option>
            {customPages.map(p => (
              <option key={p.id} value={p.id} style={{ background: 'var(--pl-ink-soft)', color: '#fff' }}>
                {p.title}
              </option>
            ))}
          </select>

          {/* Add page + delete custom page */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            <button
              onClick={() => setShowAddPage(s => !s)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                padding: '6px', borderRadius: '6px', border: '1px dashed rgba(163,177,138,0.4)',
                background: 'rgba(163,177,138,0.06)', color: 'var(--pl-olive, #A3B18A)', cursor: 'pointer',
                fontSize: '0.7rem', fontWeight: 700, transition: 'all 0.15s',
              }}
            >
              <Plus size={11} /> Add Page
            </button>
            {isCustomPage && currentCustomPage && (
              <button
                onClick={() => deleteCustomPage(activePage)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(109,89,122,0.2)',
                  background: 'rgba(109,89,122,0.06)', color: 'var(--pl-plum, #6D597A)', cursor: 'pointer',
                  fontSize: '0.65rem', fontWeight: 700, transition: 'all 0.15s',
                }}
              >
                <Trash2 size={10} /> Delete Page
              </button>
            )}
          </div>

          {/* Add page form inline */}
          <AnimatePresence>
            {showAddPage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginTop: '6px' }}
              >
                <div style={{ background: 'rgba(163,177,138,0.08)', borderRadius: '8px', padding: '8px', border: '1px solid rgba(163,177,138,0.2)' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      value={newPageTitle}
                      onChange={e => setNewPageTitle(e.target.value)}
                      placeholder="e.g. Our Venue, Engagement"
                      style={{ ...inp, flex: 1, fontSize: '0.78rem', padding: '6px 8px' }}
                      onKeyDown={e => e.key === 'Enter' && addCustomPage()}
                      autoFocus
                    />
                    <button
                      onClick={addCustomPage}
                      disabled={!newPageTitle.trim()}
                      style={{
                        padding: '6px 12px', borderRadius: '5px', border: 'none',
                        background: newPageTitle.trim() ? 'var(--pl-olive)' : 'rgba(255,255,255,0.2)',
                        color: newPageTitle.trim() ? '#fff' : 'var(--pl-muted)',
                        fontSize: '0.72rem', fontWeight: 700, cursor: newPageTitle.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >Add</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── ACTIVE SECTIONS — reorderable ── */}
        <div style={{
          fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--pl-muted)', padding: '4px 4px 6px',
        }}>
          Active · {blocks.length}
        </div>

        {/* ── Drag-sortable block list ── */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '5px', position: 'relative' }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('pearloom/block-type')) {
              e.preventDefault();
              // If over the container but not a specific zone, target end
              setDropTargetIdx(blocks.length);
            }
          }}
          onDragLeave={() => setDropTargetIdx(null)}
          onDrop={(e) => {
            if (e.dataTransfer.types.includes('pearloom/block-type')) {
              handleExternalDrop(e, dropTargetIdx ?? blocks.length);
            }
          }}
        >
          {/* Drop zone at top */}
          {draggingNewType && (
            <div
              onDragOver={(e) => handleDragOver(e, 0)}
              onDrop={(e) => handleExternalDrop(e, 0)}
              style={{
                height: dropTargetIdx === 0 ? '4px' : '12px',
                borderRadius: '2px',
                background: dropTargetIdx === 0 ? 'var(--pl-olive)' : 'transparent',
                transition: 'all 0.15s',
                boxShadow: dropTargetIdx === 0 ? '0 0 8px rgba(163,177,138,0.5)' : 'none',
              }}
            />
          )}
          {(() => {
            // Convert the hook's final-array dropIndex to the visual list position
            // where the indicator line should appear.
            //
            // dropIndex = where item will land after removing it from the list (0..N-1).
            // draggedIdx = current visual position of the dragged item (0..N-1).
            //
            // When dragging an item BEFORE itself (dropIndex < draggedIdx): the visual
            //   slot to highlight is exactly dropIndex (no offset needed).
            // When dragging an item AFTER itself (dropIndex >= draggedIdx): every item
            //   above the drop target visually shifts up by 1 because the ghost is still
            //   occupying draggedIdx, so visualIdx = dropIndex + 1.
            // When dropIndex === N-1 (end of list): show line AFTER the last item.
            // When dropIndex === draggedIdx: no-op, suppress the indicator.
            const N = dragOrderedBlocks.length;
            const draggedIdx = dragId ? dragOrderedBlocks.findIndex(b => b.id === dragId) : -1;
            type VisualLine = 'none' | 'after-last' | number;
            const visualDropLine: VisualLine = (() => {
              if (!isDragging || dropIndex === null || draggedIdx === -1) return 'none';
              if (dropIndex === draggedIdx) return 'none';
              if (dropIndex === N - 1 && dropIndex !== draggedIdx - 1) return 'after-last';
              return dropIndex >= draggedIdx ? dropIndex + 1 : dropIndex;
            })();

            return dragOrderedBlocks.map((block, idx) => {
            const def = BLOCK_CATALOGUE.find(d => d.type === block.type);
            const dragProps = getDragProps(block);
            const handleProps = getHandleProps(block);
            const showDropLine = typeof visualDropLine === 'number' && visualDropLine === idx;
            const showDropLineAfter = visualDropLine === 'after-last' && idx === N - 1;

            return (
              <div
                key={block.id}
                ref={dragProps.ref}
                data-drag-id={dragProps['data-drag-id']}
                style={dragProps.style}
              >
                {/* Drop indicator line — before this item */}
                {showDropLine && (
                  <div style={{
                    height: '2px',
                    background: '#A3B18A',
                    borderRadius: '2px',
                    marginBottom: '4px',
                    boxShadow: '0 0 6px rgba(163,177,138,0.5)',
                  }} />
                )}
                <BlockRow
                  block={block}
                  def={def}
                  isActive={activeBlockId === block.id}
                  onSelect={id => setActiveBlockId(activeBlockId === id ? null : id)}
                  onToggle={toggleVisible}
                  onDelete={deleteBlock}
                  onDuplicate={duplicateBlock}
                  onMoveUp={moveBlockUp}
                  onMoveDown={moveBlockDown}
                  dragHandleProps={handleProps}
                  isMobile={isMobile}
                  isFirst={idx === 0}
                  isLast={idx === N - 1}
                />
                {/* Drop indicator line — after the last item */}
                {showDropLineAfter && (
                  <div style={{
                    height: '2px',
                    background: '#A3B18A',
                    borderRadius: '2px',
                    marginTop: '4px',
                    boxShadow: '0 0 6px rgba(163,177,138,0.5)',
                  }} />
                )}
                {/* External drag drop zone — between blocks */}
                {draggingNewType && (
                  <div
                    onDragOver={(e) => handleDragOver(e, idx + 1)}
                    onDrop={(e) => handleExternalDrop(e, idx + 1)}
                    style={{
                      height: dropTargetIdx === idx + 1 ? '4px' : '8px',
                      borderRadius: '2px',
                      background: dropTargetIdx === idx + 1 ? 'var(--pl-olive)' : 'transparent',
                      transition: 'all 0.15s',
                      boxShadow: dropTargetIdx === idx + 1 ? '0 0 8px rgba(163,177,138,0.5)' : 'none',
                    }}
                  />
                )}
              </div>
            );
            });
          })()}
        </div>

        {/* ── AVAILABLE SECTIONS — click to add ── */}
        {availableBlocks.length > 0 && (
          <>
            <div style={{
              fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--pl-muted)', padding: '12px 4px 6px',
              borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '4px',
            }}>
              Add Sections
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {availableBlocks.map(b => (
                <motion.button
                  key={b.type}
                  onClick={() => addBlock(b.type)}
                  draggable
                  onDragStart={(e) => {
                    (e as unknown as React.DragEvent).dataTransfer?.setData('pearloom/block-type', b.type);
                    setDraggingNewType(b.type);
                  }}
                  onDragEnd={() => setDraggingNewType(null)}
                  whileHover={{ y: -1, background: 'rgba(255,255,255,0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 10px', borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(255,255,255,0.15)',
                    cursor: 'grab', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                    background: `${b.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${b.color}25`,
                  }}>
                    <b.icon size={15} color={b.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--pl-ink)' }}>{b.label}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--pl-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.description}</div>
                  </div>
                  <Plus size={14} style={{ color: 'var(--pl-olive)', flexShrink: 0, opacity: 0.5 }} />
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Config panel (slides up from bottom) ── */}
      <AnimatePresence>
        {activeBlock && activeDef && (
          <motion.div
            key={activeBlock.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              overflow: 'hidden', flexShrink: 0,
              borderTop: `2px solid ${activeDef.color}40`,
              background: `rgba(255,255,255,0.6)`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            } as React.CSSProperties}
          >
            <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Panel header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                  background: `${activeDef.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${activeDef.color}30`,
                }}>
                  <activeDef.icon size={14} color={activeDef.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--pl-ink)' }}>{activeDef.label}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--pl-ink-soft)' }}>Block settings · Section style</div>
                </div>
                <button
                  onClick={() => setActiveBlockId(null)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '6px', cursor: 'pointer', color: 'var(--pl-ink-soft)', display: 'flex', padding: '5px' }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Config content */}
              <BlockConfigPanel
                block={activeBlock}
                def={activeDef}
                manifest={manifest}
                blocksKey={blocksKey}
                onChange={m => {
                  onChange(m);
                  pushToPreview(m);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Drag ghost — follows pointer via imperative DOM updates in useDragSort ── */}
      {(() => {
        const draggedBlock = dragId ? dragOrderedBlocks.find(b => b.id === dragId) : null;
        const draggedDef = draggedBlock ? BLOCK_CATALOGUE.find(d => d.type === draggedBlock.type) : null;
        const ghostColor = draggedDef?.color ?? 'rgba(163,177,138,1)';
        const GhostIcon = draggedDef?.icon ?? LayoutTemplate;
        return (
          <div
            ref={ghostRef}
            style={{
              display: isDragging ? 'flex' : 'none',
              position: 'fixed',
              pointerEvents: 'none',
              zIndex: 9999,
              alignItems: 'center',
              gap: '10px',
              padding: '14px 12px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(20px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
              border: `1.5px solid rgba(255,255,255,0.7)`,
              borderLeft: `3px solid ${ghostColor}`,
              boxShadow: `0 16px 48px rgba(43,30,20,0.12), 0 4px 12px rgba(43,30,20,0.06), 0 0 0 1px ${ghostColor}20`,
              transform: 'rotate(1deg) scale(1.04)',
              opacity: 0.97,
              cursor: 'grabbing',
              transition: 'box-shadow 150ms ease, transform 150ms ease',
            }}
          >
            <div style={{
              width: '8px', height: '14px', display: 'flex', flexDirection: 'column',
              justifyContent: 'center', gap: '3px', flexShrink: 0,
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: '8px', height: '2px', borderRadius: '1px', background: `${ghostColor}80` }} />
              ))}
            </div>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              background: `${ghostColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${ghostColor}40`,
            }}>
              <GhostIcon size={15} color={ghostColor} />
            </div>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--pl-ink)', lineHeight: 1.3 }}>
                {draggedDef?.label ?? (draggedBlock?.type || '').replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--pl-muted)', marginTop: '2px' }}>
                Drag to reorder
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
