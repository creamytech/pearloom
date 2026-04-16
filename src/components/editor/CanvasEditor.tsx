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
import { useEditor } from '@/lib/editor-state';
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
import { GalleryPicker } from './GalleryPicker';
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
  { type: 'hero',      label: 'Hero',              icon: BlockHeroIcon,      description: 'Full-screen hero with names & cover photo',  color: 'var(--pl-chrome-text)', occasions: ALL_OCCASIONS },
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
  display: 'block', fontSize: '0.6rem', fontWeight: 800,
  letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'var(--pl-chrome-text-muted)', marginBottom: '0.4rem',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem',
  border: '1px solid var(--pl-chrome-border)', background: 'var(--pl-chrome-bg)',
  color: 'var(--pl-chrome-text)', fontSize: 'max(16px, 0.82rem)', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
};

function MiniInput({ label, value, onChange, placeholder, type = 'text', hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={inp}
        onFocus={e => { e.currentTarget.style.borderColor = '#A1A1AA'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
      />
      {hint && <p style={{ fontSize: '0.58rem', color: 'var(--pl-chrome-text-muted)', marginTop: '4px', lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--pl-chrome-text-soft)' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '36px', height: '20px', borderRadius: '8px',
          background: value ? 'var(--pl-chrome-text)' : 'rgba(255,255,255,0.3)',
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
                padding: '4px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700,
                background: activeId === e.id ? def.color : 'rgba(255,255,255,0.25)',
                color: activeId === e.id ? '#fff' : 'var(--pl-chrome-text-soft)',
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
              background: 'transparent', color: def.color, cursor: 'pointer', fontSize: '0.6rem', fontWeight: 700,
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
              <span style={{ flex: 1, fontSize: '0.65rem', fontWeight: 800, color: def.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
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
                style={{ ...inp, color: 'var(--pl-chrome-text)' }}
              >
                {Object.entries(EVENT_TYPES).map(([t, d]) => (
                  <option key={t} value={t} style={{ background: '#1a1a18' }}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Core fields */}
            <MiniInput label="Event name" value={activeEvent.name} onChange={v => upd(activeEvent.id, { name: v })} placeholder="Ceremony" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <MiniInput label="Date" value={activeEvent.date} onChange={v => upd(activeEvent.id, { date: v })} placeholder="e.g., 2026-06-14" />
              <MiniInput label="Start time" value={activeEvent.time} onChange={v => upd(activeEvent.id, { time: v })} placeholder="e.g., 4:00 PM" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <MiniInput label="End time" value={activeEvent.endTime || ''} onChange={v => upd(activeEvent.id, { endTime: v })} placeholder="6:00 PM" />
              <MiniInput label="Dress code" value={activeEvent.dressCode || ''} onChange={v => upd(activeEvent.id, { dressCode: v })} placeholder="e.g., Black Tie, Cocktail, Casual" />
            </div>
            <MiniInput label="Venue name" value={activeEvent.venue} onChange={v => upd(activeEvent.id, { venue: v })} placeholder="The Grand Pavilion" />
            <MiniInput label="Full address" value={activeEvent.address} onChange={v => upd(activeEvent.id, { address: v })} placeholder="123 Main St, Newport, RI" />

            {/* Event-specific fields */}
            {def.specificFields.length > 0 && (
              <>
                <div style={{ height: '1px', background: `${def.color}30`, margin: '4px 0' }} />
                <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: def.color }}>
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
                          style={{ ...inp, color: 'var(--pl-chrome-text)' }}
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
// ── Content summary — shows actual data in each block row ──────
function getBlockContentSummary(block: PageBlock, manifest: StoryManifest): string | null {
  const cfg = (block.config || {}) as Record<string, any>;
  switch (block.type) {
    case 'hero': {
      const names = cfg.coupleNames || (manifest as any).names?.join(' & ') || '';
      const tagline = cfg.tagline || (manifest as any).poetry?.heroTagline || '';
      return [names, tagline].filter(Boolean).join(' — ') || null;
    }
    case 'story': {
      const chapters = (manifest as any).chapters || cfg.chapters || [];
      if (!Array.isArray(chapters) || chapters.length === 0) return 'No chapters yet';
      return `${chapters.length} chapter${chapters.length !== 1 ? 's' : ''}: ${chapters.map((c: any) => c.title).filter(Boolean).slice(0, 3).join(', ')}`;
    }
    case 'event': {
      const events = (manifest as any).events || cfg.events || [];
      if (!Array.isArray(events) || events.length === 0) return 'No events yet';
      return events.map((e: any) => [e.title || e.name, e.date].filter(Boolean).join(' · ')).slice(0, 2).join(', ');
    }
    case 'countdown': {
      const date = cfg.date || (manifest as any).events?.[0]?.date || '';
      return date ? `Counting down to ${date}` : 'No date set';
    }
    case 'rsvp': {
      const deadline = cfg.deadline || (manifest as any).logistics?.rsvpDeadline || '';
      return deadline ? `Deadline: ${deadline}` : 'RSVP form active';
    }
    case 'registry': {
      const links = Array.isArray(cfg.links) ? cfg.links : [];
      return links.length > 0 ? `${links.length} registr${links.length !== 1 ? 'ies' : 'y'}` : 'No registries yet';
    }
    case 'travel': {
      const hotels = Array.isArray(cfg.hotels) ? cfg.hotels : (Array.isArray((manifest as any).logistics?.hotels) ? (manifest as any).logistics.hotels : []);
      return hotels.length > 0 ? `${hotels.length} hotel${hotels.length !== 1 ? 's' : ''}: ${hotels.map((h: any) => h.name).filter(Boolean).slice(0, 2).join(', ')}` : 'No hotels yet';
    }
    case 'faq': {
      const items = Array.isArray(cfg.items) ? cfg.items : (Array.isArray((manifest as any).faq) ? (manifest as any).faq : []);
      return items.length > 0 ? `${items.length} question${items.length !== 1 ? 's' : ''}` : 'No FAQs yet';
    }
    case 'photos': case 'gallery': case 'photoWall': {
      const photos = Array.isArray(cfg.photos) ? cfg.photos : [];
      return photos.length > 0 ? `${photos.length} photo${photos.length !== 1 ? 's' : ''}` : 'No photos yet';
    }
    case 'guestbook': {
      const msgs = Array.isArray(cfg.messages) ? cfg.messages : [];
      return msgs.length > 0 ? `${msgs.length} message${msgs.length !== 1 ? 's' : ''}` : 'Awaiting messages';
    }
    case 'quote': case 'vibeQuote':
      return cfg.text || cfg.quote || (manifest as any).poetry?.heroTagline || null;
    case 'welcome':
      return cfg.text || (manifest as any).poetry?.welcomeStatement || null;
    case 'hashtag':
      return cfg.hashtag ? `#${cfg.hashtag}` : null;
    case 'spotify':
      return cfg.url || cfg.playlistUrl || 'No playlist URL';
    case 'video':
      return cfg.url ? 'Video linked' : 'No video URL';
    case 'text':
      return cfg.content ? String(cfg.content).slice(0, 60) + (String(cfg.content).length > 60 ? '...' : '') : null;
    case 'map':
      return cfg.address || (manifest as any).logistics?.venue || 'No address set';
    default:
      return null;
  }
}

function BlockRow({
  block, def, isActive, onSelect, onToggle, onDelete, onDuplicate, onMoveUp, onMoveDown, dragHandleProps,
  isMobile, isFirst, isLast, manifest,
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
  manifest: StoryManifest;
}) {
  const Icon = def?.icon || LayoutTemplate;
  const color = def?.color || 'var(--pl-chrome-text)';
  const label = def?.label || block.type.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  const summary = getBlockContentSummary(block, manifest);

  return (
    <div>
      {/* Main row — drag handle, icon, name + content summary, chevron */}
      <motion.div
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: block.visible ? 1 : 0.4 }}
        whileHover={{ background: 'var(--pl-chrome-bg)' }}
        transition={{ duration: 0.15 }}
        onClick={() => onSelect(block.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 10px 10px 4px',
          borderRadius: isActive ? '14px 14px 0 0' : '14px',
          background: isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
          border: isActive ? `1.5px solid #18181B` : '1px solid rgba(255,255,255,0.2)',
          borderBottom: isActive ? `1px solid ${color}25` : undefined,
          cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
          userSelect: 'none',
          boxShadow: isActive ? `0 0 0 1px ${color}18` : 'none',
        }}
      >
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          onClick={e => e.stopPropagation()}
          style={{ ...dragHandleProps.style, color: 'rgba(0,0,0,0.15)', display: 'flex', flexShrink: 0, padding: '4px' }}
        >
          <GripIcon size={13} />
        </div>

        {/* Block icon */}
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
          background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} color={color} />
        </div>

        {/* Name + inline content summary */}
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <span style={{
            fontSize: '0.8rem', fontWeight: 600,
            color: block.visible ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'block',
          }}>
            {label}
          </span>
          {summary && (
            <span style={{
              fontSize: '0.65rem', color: 'var(--pl-chrome-text-muted)', lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              display: 'block', marginTop: '1px',
            }}>
              {summary}
            </span>
          )}
        </div>

        {/* Collapse/expand chevron */}
        <motion.div
          animate={{ rotate: isActive ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: isActive ? color : 'var(--pl-chrome-text-muted)', display: 'flex', padding: '4px', transition: 'color 0.15s' }}
        >
          <ChevronDown size={13} />
        </motion.div>
      </motion.div>

      {/* Expanded actions — icon strip with labels */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              display: 'flex', gap: '6px', padding: '8px 12px',
              justifyContent: 'center',
            }}>
              {[
                { icon: <ChevronUp size={14} />, tip: 'Move up', action: () => onMoveUp(block.id), disabled: isFirst },
                { icon: <ChevronDown size={14} />, tip: 'Move down', action: () => onMoveDown(block.id), disabled: isLast },
                { icon: block.visible ? <Eye size={14} /> : <EyeOff size={14} />, tip: block.visible ? 'Hide' : 'Show', action: () => onToggle(block.id) },
                { icon: <Copy size={14} />, tip: 'Duplicate', action: () => onDuplicate(block.id) },
                { icon: <Trash2 size={14} />, tip: 'Delete', action: () => onDelete(block.id), danger: true },
              ].filter(a => !a.disabled).map(a => (
                <button
                  key={a.tip}
                  onClick={e => { e.stopPropagation(); a.action(); }}
                  title={a.tip}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px', borderRadius: '8px',
                    border: '1px solid var(--pl-chrome-border)',
                    background: 'var(--pl-chrome-surface)',
                    color: (a as { danger?: boolean }).danger ? '#e87171' : 'var(--pl-chrome-text-muted)',
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.55)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.4)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
                >
                  {a.icon}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
      <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pl-chrome-text-muted)' }}>
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
                  border: isActive ? '2px solid #18181B' : '1px solid rgba(255,255,255,0.3)',
                  background: bg.value === 'accent' ? 'linear-gradient(135deg, #71717A, #8FA876)' : bg.value || 'transparent',
                  cursor: 'pointer', position: 'relative', transition: 'border 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {!bg.value && <X size={10} color="#71717A" />}
              </button>
            );
          })}
        </div>
        {/* FIX #8: Custom hex input with proper label for accessibility */}
        <div style={{ marginTop: '6px' }}>
          <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--pl-chrome-text-muted)', marginBottom: '4px' }}>Custom Color</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <ColorPicker
              value={(config.bgColor as string) || '#ffffff'}
              onChange={(c) => updateConfig({ bgColor: c })}
            />
            <input
              value={config.bgColor as string || ''}
              onChange={e => updateConfig({ bgColor: e.target.value })}
              placeholder="e.g., #71717A"
              style={{ ...inp, flex: 1, fontSize: '0.65rem', padding: '4px 8px' }}
            />
          </div>
        </div>
      </div>

      {/* Background Image */}
      <div>
        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--pl-chrome-text-muted)', marginBottom: '4px' }}>Background Image</label>
        <input
          value={(config.bgImage as string) || ''}
          onChange={e => updateConfig({ bgImage: e.target.value })}
          placeholder="Paste an image link..."
          style={{ ...inp, fontSize: '0.65rem', padding: '6px 8px' }}
        />
        {(config.bgImage as string) && (
          <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
            <button onClick={() => updateConfig({ bgImage: '' })} style={{ padding: '3px 8px', borderRadius: '6px', border: 'none', background: 'var(--pl-chrome-bg)', color: 'var(--pl-chrome-text-muted)', cursor: 'pointer', fontSize: '0.6rem' }}>Remove</button>
            <select value={(config.bgSize as string) || 'cover'} onChange={e => updateConfig({ bgSize: e.target.value })} style={{ ...inp, flex: 1, fontSize: '0.65rem', padding: '3px 6px' }}>
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="repeat">Tile</option>
            </select>
          </div>
        )}
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
                  background: isActive ? 'rgba(24,24,27,0.12)' : 'rgba(255,255,255,0.2)',
                  color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
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
                  background: isActive ? 'rgba(24,24,27,0.12)' : 'rgba(255,255,255,0.2)',
                  color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
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
          {['', 'var(--pl-ink-soft, #3D3530)', '#ffffff', '#8c8c8c', 'var(--pl-chrome-text)'].map(c => {
            const isActive = (config.textColor || '') === c;
            return (
              <button
                key={c || 'auto'}
                onClick={() => updateConfig({ textColor: c })}
                style={{
                  width: '28px', height: '28px', borderRadius: '6px',
                  border: isActive ? '2px solid #18181B' : '1px solid rgba(255,255,255,0.3)',
                  background: c || 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {!c && <span style={{ fontSize: '0.6rem', color: 'var(--pl-chrome-text-soft)', fontWeight: 700 }}>A</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Style Preset */}
      <div>
        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--pl-chrome-text-muted)', marginBottom: '4px' }}>Section Style</label>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {[
            { id: 'default', label: 'Default', style: {} },
            { id: 'rounded', label: 'Rounded', style: { borderRadius: '32px', overflow: 'hidden' } },
            { id: 'card', label: 'Card', style: { background: 'rgba(255,255,255,0.8)', borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', maxWidth: '900px', margin: '2rem auto' } },
            { id: 'dark', label: 'Dark', style: { background: '#1a1814', color: '#F5F1E8', borderRadius: '0' } },
            { id: 'accent', label: 'Accent', style: { background: 'var(--pl-chrome-text)', color: 'white', borderRadius: '0' } },
          ].map(preset => {
            const isActive = (config.sectionStyle || 'default') === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => updateConfig({ sectionStyle: preset.id, ...preset.style })}
                style={{
                  padding: '5px 10px', borderRadius: '8px', border: 'none',
                  background: isActive ? 'var(--pl-chrome-text)' : 'rgba(255,255,255,0.2)',
                  color: isActive ? 'white' : 'var(--pl-chrome-text-muted)',
                  fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {preset.label}
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

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [slideshowGalleryOpen, setSlideshowGalleryOpen] = useState(false);
  const slideshowUploadRef = useRef<HTMLInputElement>(null);

  const noConfig = (
    <p style={{ fontSize: '0.75rem', color: 'var(--pl-chrome-text-soft)', lineHeight: 1.6 }}>
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
              label="Who said this?"
              value={String(block.config?.attribution || '')}
              onChange={v => updateBlockConfig({ attribution: v })}
              placeholder="e.g., — Shakespeare"
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
            label="Video Link"
            value={String(block.config?.url || '')}
            onChange={v => updateBlockConfig({ url: v })}
            placeholder="Paste a YouTube or Vimeo link"
            hint="Copy the link from your browser when watching the video"
          />
        );

      case 'countdown':
        return (
          <MiniInput
            label="Countdown Date"
            value={String(block.config?.date || manifest.events?.[0]?.date || '')}
            onChange={v => updateBlockConfig({ date: v })}
            placeholder={manifest.events?.[0]?.date || 'e.g., 2026-06-14'}
            hint="This is when the countdown timer reaches zero"
          />
        );

      case 'map':
        return (
          <MiniInput
            label="Venue Address"
            value={String(block.config?.address || manifest.events?.[0]?.address || manifest.logistics?.venue || '')}
            onChange={v => updateBlockConfig({ address: v })}
            placeholder={manifest.events?.[0]?.address || manifest.logistics?.venue || 'e.g., 123 Main St, New York, NY'}
            hint="Just type the address and we will show it on a map"
          />
        );

      case 'spotify':
        return (
          <MiniInput
            label="Spotify Link"
            value={String(block.config?.url || '')}
            onChange={v => updateBlockConfig({ url: v })}
            placeholder="Paste your Spotify playlist link"
            hint="Open Spotify, go to your playlist, tap Share, then Copy Link"
          />
        );

      case 'hashtag':
        return (
          <MiniInput
            label="Hashtag"
            value={String(block.config?.hashtag || '')}
            onChange={v => updateBlockConfig({ hashtag: v })}
            placeholder={`${manifest.chapters?.[0]?.title || 'OurWedding'}2026`}
            hint="Your guests will use this to share photos on social media"
          />
        );

      case 'guestbook':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <MiniInput
              label="Heading"
              value={String(block.config?.heading || 'Leave Your Wishes')}
              onChange={v => updateBlockConfig({ heading: v })}
              placeholder="Leave Your Wishes"
            />
            <MiniInput
              label="Prompt text"
              value={String(block.config?.prompt || 'Share your love and well wishes')}
              onChange={v => updateBlockConfig({ prompt: v })}
              placeholder="e.g., Share a favorite memory or wish for the couple"
            />
          </div>
        );

      case 'registry':
        return noConfig; // Edited in Details → Registry

      case 'travel':
        return noConfig; // Edited in Details → Travel

      case 'faq':
        return noConfig; // Edited in Details → FAQ

      case 'rsvp':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <MiniInput
              label="RSVP deadline"
              value={String(block.config?.deadline || manifest.logistics?.rsvpDeadline || '')}
              onChange={v => updateBlockConfig({ deadline: v })}
              placeholder="e.g., June 1, 2026"
              hint="The last day guests can respond to your invitation"
            />
            <Toggle
              label="Show meal preferences"
              value={block.config?.showMeals !== false}
              onChange={v => updateBlockConfig({ showMeals: v })}
            />
          </div>
        );

      case 'hero': {
        const slideshowPhotos = (manifest.heroSlideshow || []) as string[];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <MiniInput
              label="Tagline"
              value={String(manifest.poetry?.heroTagline || '')}
              onChange={v => {
                const poetry = { ...(manifest.poetry || {}), heroTagline: v };
                onChange({ ...manifest, poetry: poetry as StoryManifest['poetry'] });
              }}
              placeholder="captured in your warmest light"
            />
            <MiniInput
              label="Cover Photo"
              value={String(manifest.coverPhoto || '')}
              onChange={v => onChange({ ...manifest, coverPhoto: v })}
              placeholder="Paste an image link or leave blank for illustrated art"
              hint="Tip: Upload a photo in the Photos section, or paste an image link"
            />
            <button
              onClick={() => setGalleryOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                width: '100%', padding: '6px 10px', borderRadius: '8px',
                border: '1.5px dashed var(--pl-chrome-border)',
                background: 'rgba(24,24,27,0.04)',
                color: 'var(--pl-chrome-text)',
                fontSize: '0.65rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
                letterSpacing: '0.04em',
              }}
            >
              <ImageIcon size={12} />
              Choose from Gallery
            </button>
            <GalleryPicker
              open={galleryOpen}
              onClose={() => setGalleryOpen(false)}
              onSelect={(url) => onChange({ ...manifest, coverPhoto: url })}
            />
            {/* Hero Slideshow */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '8px', marginTop: '4px' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--pl-chrome-text-muted)', marginBottom: '6px' }}>
                Photo Slideshow {slideshowPhotos.length > 0 && `· ${slideshowPhotos.length}`}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--pl-chrome-text-muted)', marginBottom: '8px', lineHeight: 1.4 }}>
                Add photos for an auto-rotating hero slideshow with Ken Burns transitions
              </div>

              {/* Photo thumbnail grid */}
              {slideshowPhotos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
                  {slideshowPhotos.map((url, i) => (
                    <div key={i} style={{
                      position: 'relative', aspectRatio: '1',
                      borderRadius: '8px', overflow: 'hidden',
                      background: 'rgba(24,24,27,0.06)',
                      border: '1px solid var(--pl-chrome-border)',
                    }}>
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url} alt={`Slide ${i + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--pl-chrome-text-muted)', fontSize: '0.65rem',
                        }}>
                          Empty
                        </div>
                      )}
                      <button
                        onClick={() => onChange({ ...manifest, heroSlideshow: slideshowPhotos.filter((_, j) => j !== i) })}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)', border: 'none',
                          cursor: 'pointer', color: '#fff',
                          fontSize: '0.75rem', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0,
                        }}
                        title="Remove"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add from gallery / upload buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setSlideshowGalleryOpen(true)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px',
                    border: '1.5px solid var(--pl-chrome-border)', background: 'rgba(24,24,27,0.04)',
                    color: 'var(--pl-chrome-text)', fontSize: '0.65rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  <ImageIcon size={12} />
                  Gallery
                </button>
                <button
                  onClick={() => slideshowUploadRef.current?.click()}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px',
                    border: '1.5px dashed var(--pl-chrome-border)', background: 'rgba(24,24,27,0.04)',
                    color: 'var(--pl-chrome-text)', fontSize: '0.65rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  Upload
                </button>
                <input
                  ref={slideshowUploadRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    const newUrls: string[] = [];
                    for (const file of files) {
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const res = await fetch('/api/upload', { method: 'POST', body: formData });
                        if (res.ok) {
                          const data = await res.json();
                          if (data.publicUrl) newUrls.push(data.publicUrl);
                        }
                      } catch (err) {
                        console.error('[slideshow upload]', err);
                      }
                    }
                    if (newUrls.length > 0) {
                      onChange({ ...manifest, heroSlideshow: [...slideshowPhotos, ...newUrls] });
                    }
                    if (slideshowUploadRef.current) slideshowUploadRef.current.value = '';
                  }}
                />
              </div>
            </div>
            <GalleryPicker
              open={slideshowGalleryOpen}
              onClose={() => setSlideshowGalleryOpen(false)}
              onSelect={(url) => onChange({ ...manifest, heroSlideshow: [...slideshowPhotos, url] })}
            />
          </div>
        );
      }

      case 'photos':
      case 'photoWall':
      case 'gallery':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <MiniInput
              label="Section title"
              value={String(block.config?.title || (block.type === 'photoWall' ? 'Guest Photo Wall' : 'Photo Collage'))}
              onChange={v => updateBlockConfig({ title: v })}
              placeholder="Our Photos"
            />
            <Toggle
              label="Show captions"
              value={block.config?.showCaptions !== false}
              onChange={v => updateBlockConfig({ showCaptions: v })}
            />
          </div>
        );

      case 'weddingParty':
        return (
          <p style={{ fontSize: '0.75rem', color: 'var(--pl-chrome-text-soft)', lineHeight: 1.6 }}>
            Edit wedding party members in the <strong>Chapters</strong> tab.
          </p>
        );

      case 'vibeQuote':
      case 'welcome':
        return (
          <MiniInput
            label={block.type === 'welcome' ? 'Welcome statement' : 'Quote text'}
            value={String(block.type === 'welcome' ? (manifest.poetry?.welcomeStatement || '') : (manifest.vibeSkin?.dividerQuote || manifest.vibeString || ''))}
            onChange={v => {
              if (block.type === 'welcome') {
                onChange({ ...manifest, poetry: { ...(manifest.poetry || {}), welcomeStatement: v } as StoryManifest['poetry'] });
              } else {
                onChange({ ...manifest, vibeSkin: manifest.vibeSkin ? { ...manifest.vibeSkin, dividerQuote: v } : manifest.vibeSkin });
              }
            }}
            placeholder={block.type === 'welcome' ? "e.g., We're so happy you're here to celebrate with us..." : 'A beautiful quote...'}
          />
        );

      case 'anniversary':
        return (
          <MiniInput
            label="Anniversary title"
            value={String(block.config?.title || 'Anniversary Milestones')}
            onChange={v => updateBlockConfig({ title: v })}
            placeholder="Anniversary Milestones"
          />
        );

      case 'storymap':
        return (
          <MiniInput
            label="Map title"
            value={String(block.config?.title || 'Our Journey')}
            onChange={v => updateBlockConfig({ title: v })}
            placeholder="Our Journey"
          />
        );

      case 'divider':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={lbl}>Divider Height</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[{ label: 'S', value: '40' }, { label: 'M', value: '60' }, { label: 'L', value: '80' }, { label: 'XL', value: '120' }].map(h => (
                <button
                  key={h.value}
                  onClick={() => updateBlockConfig({ height: h.value })}
                  style={{
                    flex: 1, padding: '6px', borderRadius: '8px', border: 'none',
                    background: String(block.config?.height || '60') === h.value ? 'rgba(24,24,27,0.12)' : 'rgba(255,255,255,0.2)',
                    color: String(block.config?.height || '60') === h.value ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-muted)',
                    fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'story':
        return (
          <p style={{ fontSize: '0.75rem', color: 'var(--pl-chrome-text-soft)', lineHeight: 1.6 }}>
            Edit chapters in the <strong>Chapters</strong> tab. Change story style in the story style pills above.
          </p>
        );

      case 'quiz':
        return (
          <MiniInput
            label="Quiz title"
            value={String(block.config?.title || 'How Well Do You Know Us?')}
            onChange={v => updateBlockConfig({ title: v })}
            placeholder="How Well Do You Know Us?"
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
        <span style={{ display: 'flex', alignItems: 'center', color: hasEffects ? 'var(--pl-chrome-text-soft)' : 'var(--pl-chrome-text-muted)' }}>
          <IconReveal size={14} />
        </span>
        <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, color: hasEffects ? 'var(--pl-chrome-text-soft)' : 'var(--pl-chrome-text-soft)' }}>
          Block Effects
        </span>
        {hasEffects && (
          <span style={{
            fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--pl-chrome-text)', background: 'var(--pl-chrome-bg)',
            padding: '2px 6px', borderRadius: '8px', border: '1px solid rgba(24,24,27,0.12)',
          }}>ON</span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', color: 'var(--pl-chrome-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <IconChevronDown size={14} />
        </span>
      </button>

      {open && (
        <div style={{ paddingBottom: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Scroll reveal */}
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-chrome-text-muted)', marginBottom: '6px' }}>
              Entrance Animation
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {REVEAL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate({ scrollReveal: opt.value === 'none' ? undefined : (opt.value as 'fade' | 'slide-up' | 'slide-left' | 'zoom' | 'blur-in') })}
                  style={{
                    padding: '5px 9px', borderRadius: '6px',
                    border: `1px solid ${reveal === opt.value ? 'var(--pl-chrome-text-muted)' : 'rgba(255,255,255,0.25)'}`,
                    background: reveal === opt.value ? 'rgba(24,24,27,0.14)' : 'rgba(24,24,27,0.04)',
                    color: reveal === opt.value ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
                    cursor: 'pointer', fontSize: '0.65rem', fontWeight: reveal === opt.value ? 700 : 400,
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
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-chrome-text-muted)', marginBottom: '6px' }}>
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
                    padding: '5px 9px', borderRadius: '6px',
                    border: `1px solid ${divStyle === opt.value ? 'var(--pl-chrome-text-muted)' : 'rgba(255,255,255,0.25)'}`,
                    background: divStyle === opt.value ? 'rgba(24,24,27,0.14)' : 'rgba(24,24,27,0.04)',
                    color: divStyle === opt.value ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
                    cursor: 'pointer', fontSize: '0.65rem', fontWeight: divStyle === opt.value ? 700 : 400,
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
                  <span style={{ fontSize: '0.65rem', color: 'var(--pl-chrome-text-soft)' }}>Height</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--pl-chrome-text-muted)', fontWeight: 700 }}>{divHeight}px</span>
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
          border: '1px solid rgba(24,24,27,0.12)',
          background: open ? '#F4F4F5' : '#F4F4F5',
          color: 'rgba(24,24,27,0.95)', cursor: 'pointer',
          fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em',
          transition: 'all 0.15s',
          boxShadow: open ? 'inset 0 1px 0 rgba(24,24,27,0.04)' : 'none',
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
              borderRadius: '12px', overflow: 'hidden', marginTop: '4px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.06)',
            }}
          >
            {/* Search */}
            <div style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.25)' }}>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sections…"
                style={{ ...inp, fontSize: '0.75rem', padding: '6px 10px' }}
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
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pl-chrome-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {b.label}
                      {existingTypes.has(b.type) && (
                        <span style={{ fontSize: '0.58rem', color: b.color, padding: '1px 5px', borderRadius: '4px', background: `${b.color}18`, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>added</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--pl-chrome-text-muted)', marginTop: '1px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{b.description}</div>
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
  const { state } = useEditor();

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

  // ── Sync activeBlockId from global editor state ──────────────
  // When the user clicks a block in the preview (SiteRenderer), the global
  // state.activeId is set before the canvas tab mounts. Sync it here so the
  // config panel opens immediately.
  useEffect(() => {
    if (state.activeId && blocks.some(b => b.id === state.activeId)) {
      setActiveBlockId(state.activeId);
    }
  }, [state.activeId, blocks]);

  // Auto-scroll config panel into view when a block is selected
  useEffect(() => {
    if (activeBlockId && configPanelRef.current) {
      setTimeout(() => {
        configPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300); // Wait for slide animation
    }
  }, [activeBlockId]);

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
  const configPanelRef = useRef<HTMLDivElement>(null);

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
      const { blockType, blockId } = (e as CustomEvent).detail || {};
      // Prefer exact blockId match, fall back to first of type
      if (blockId) {
        const exact = blocks.find(b => b.id === blockId);
        if (exact) { setActiveBlockId(exact.id); return; }
      }
      if (blockType) {
        const match = blocks.find(b => b.type === blockType);
        if (match) setActiveBlockId(match.id);
      }
    };
    window.addEventListener('pearloom-select-block', handler);
    return () => window.removeEventListener('pearloom-select-block', handler);
  }, [blocks]);

  const activeBlock = blocks.find(b => b.id === activeBlockId);
  const existingTypes = new Set(blocks.map(b => b.type));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ── Scrollable content ── */}
      {/* FIX: Scroll container with bottom padding to prevent cutoff */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 2px 24px' } as React.CSSProperties}>

        {/* ── Page Selector (collapsed) ── */}
        <div style={{ padding: '0 0 6px', borderBottom: '1px solid rgba(255,255,255,0.2)', marginBottom: '2px' }}>
          <label style={{ ...lbl, marginBottom: '4px', fontSize: '0.55rem' }}>Page</label>
          <select
            value={activePage}
            onChange={e => setActivePage(e.target.value)}
            style={{
              ...inp, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              background: 'rgba(24,24,27,0.06)', borderColor: 'var(--pl-chrome-border)',
              color: 'var(--pl-chrome-text)', padding: '8px 10px',
            }}
          >
            <option value="main" style={{ background: 'var(--pl-chrome-surface)', color: 'var(--pl-chrome-text)' }}>
              Main Page
            </option>
            {customPages.map(p => (
              <option key={p.id} value={p.id} style={{ background: 'var(--pl-chrome-surface)', color: 'var(--pl-chrome-text)' }}>
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
                padding: '6px', borderRadius: '6px', border: '1px dashed var(--pl-chrome-border)',
                background: 'var(--pl-chrome-bg)', color: 'var(--pl-chrome-text)', cursor: 'pointer',
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
                  padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(24,24,27,0.1)',
                  background: 'rgba(24,24,27,0.04)', color: 'var(--pl-chrome-text-muted)', cursor: 'pointer',
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
                <div style={{ background: 'rgba(24,24,27,0.04)', borderRadius: '8px', padding: '8px', border: '1px solid rgba(24,24,27,0.1)' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      value={newPageTitle}
                      onChange={e => setNewPageTitle(e.target.value)}
                      placeholder="e.g. Our Venue, Engagement"
                      style={{ ...inp, flex: 1, fontSize: '0.75rem', padding: '6px 8px' }}
                      onKeyDown={e => e.key === 'Enter' && addCustomPage()}
                      autoFocus
                    />
                    <button
                      onClick={addCustomPage}
                      disabled={!newPageTitle.trim()}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: 'none',
                        background: newPageTitle.trim() ? 'var(--pl-chrome-text)' : 'rgba(255,255,255,0.2)',
                        color: newPageTitle.trim() ? '#fff' : 'var(--pl-chrome-text-muted)',
                        fontSize: '0.65rem', fontWeight: 700, cursor: newPageTitle.trim() ? 'pointer' : 'not-allowed',
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
          textTransform: 'uppercase', color: 'var(--pl-chrome-text-muted)', padding: '4px 4px 6px',
        }}>
          Your Sections · {blocks.length}
        </div>

        {/* FIX #9: Empty state when all blocks are removed */}
        {blocks.length === 0 && (
          <div style={{
            padding: '24px 16px', textAlign: 'center',
            borderRadius: '8px',
            background: 'var(--pl-chrome-bg)',
            border: '1px dashed var(--pl-chrome-border)',
            marginBottom: '8px',
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--pl-chrome-text-soft)', marginBottom: '4px' }}>
              No sections on this page
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--pl-chrome-text-muted)', lineHeight: 1.5 }}>
              Click &ldquo;Add Section&rdquo; below or drag blocks from the catalogue to get started.
            </div>
          </div>
        )}

        {/* ── Drag-sortable block list ── */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}
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
                background: dropTargetIdx === 0 ? 'var(--pl-chrome-text)' : 'transparent',
                transition: 'all 0.15s',
                boxShadow: dropTargetIdx === 0 ? '0 0 8px #A1A1AA' : 'none',
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

            const blockDef = def;
            const blockColor = blockDef?.color || 'var(--pl-chrome-text)';
            const isBlockActive = activeBlockId === block.id;
            const inlineActiveDef = isBlockActive ? blockDef : null;

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
                    background: 'var(--pl-chrome-text-muted)',
                    borderRadius: '2px',
                    marginBottom: '4px',
                    boxShadow: '0 0 6px #A1A1AA',
                  }} />
                )}
                <BlockRow
                  block={block}
                  def={def}
                  isActive={isBlockActive}
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
                  manifest={manifest}
                />
                {/* Inline config panel — expands directly below the active block row (accordion style) */}
                {isBlockActive && activeBlock && inlineActiveDef && (
                  <div
                    ref={configPanelRef}
                    style={{
                      overflow: 'hidden',
                      maxHeight: '2000px',
                      opacity: 1,
                      transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
                      borderLeft: `2px solid ${blockColor}60`,
                      background: `${blockColor}08`,
                      borderRadius: '0 0 12px 12px',
                      marginTop: '-2px',
                    } as React.CSSProperties}
                  >
                    <div style={{ maxHeight: '65vh', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: `1px solid ${blockColor}20` }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                          background: `${blockColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: `1px solid ${blockColor}30`,
                        }}>
                          <inlineActiveDef.icon size={14} color={blockColor} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--pl-chrome-text)' }}>{inlineActiveDef.label}</div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--pl-chrome-text-soft)' }}>Section Settings</div>
                        </div>
                        <button
                          onClick={() => setActiveBlockId(null)}
                          style={{ background: 'var(--pl-chrome-bg)', border: '1px solid var(--pl-chrome-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--pl-chrome-text-soft)', display: 'flex', padding: '5px' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <BlockConfigPanel
                        block={activeBlock}
                        def={inlineActiveDef}
                        manifest={manifest}
                        blocksKey={blocksKey}
                        onChange={m => {
                          onChange(m);
                          pushToPreview(m);
                        }}
                      />
                    </div>
                  </div>
                )}
                {/* Drop indicator line — after the last item */}
                {showDropLineAfter && (
                  <div style={{
                    height: '2px',
                    background: 'var(--pl-chrome-text-muted)',
                    borderRadius: '2px',
                    marginTop: '4px',
                    boxShadow: '0 0 6px #A1A1AA',
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
                      background: dropTargetIdx === idx + 1 ? 'var(--pl-chrome-text)' : 'transparent',
                      transition: 'all 0.15s',
                      boxShadow: dropTargetIdx === idx + 1 ? '0 0 8px #A1A1AA' : 'none',
                    }}
                  />
                )}
              </div>
            );
            });
          })()}
        </div>

        {/* ── "+ Add Section" button — opens AddBlockPicker dropdown ── */}
        <div style={{ padding: '8px 2px 4px', marginTop: '4px' }}>
          <AddBlockPicker
            onAdd={addBlock}
            onDragType={setDraggingNewType}
            existingTypes={existingTypes}
            occasion={(manifest.occasion || 'wedding') as OccasionTag}
          />
        </div>
      </div>

      {/* ── Drag ghost — follows pointer via imperative DOM updates in useDragSort ── */}
      {(() => {
        const draggedBlock = dragId ? dragOrderedBlocks.find(b => b.id === dragId) : null;
        const draggedDef = draggedBlock ? BLOCK_CATALOGUE.find(d => d.type === draggedBlock.type) : null;
        const ghostColor = draggedDef?.color ?? 'var(--pl-chrome-text)';
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
              borderRadius: '10px',
              background: 'var(--pl-chrome-surface)',
              border: `1.5px solid rgba(255,255,255,0.7)`,
              borderLeft: `3px solid ${ghostColor}`,
              boxShadow: `0 16px 48px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04), 0 0 0 1px ${ghostColor}20`,
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
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pl-chrome-text)', lineHeight: 1.3 }}>
                {draggedDef?.label ?? (draggedBlock?.type || '').replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--pl-chrome-text-muted)', marginTop: '2px' }}>
                Drag to reorder
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
