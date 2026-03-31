'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/CanvasEditor.tsx
// Free-canvas drag-and-drop block editor
// Like Webflow / Framer — add blocks anywhere, drag to reorder,
// click to configure per-block in a floating right panel.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDragSort } from './useDragSort';
import type { DragHandleProps } from './useDragSort';
import {
  Plus, Eye, EyeOff, Trash2,
  ChevronDown, ChevronRight, X,
  Sparkles, LayoutTemplate,
} from 'lucide-react';
import {
  BlockHeroIcon, BlockStoryIcon, BlockEventIcon, BlockCountdownIcon,
  BlockRsvpIcon, BlockRegistryIcon, BlockTravelIcon, BlockFaqIcon,
  BlockPhotosIcon, BlockGuestbookIcon, BlockMapIcon, BlockQuoteIcon,
  BlockTextIcon, BlockVideoIcon, BlockDividerIcon, GripIcon,
} from '@/components/icons/EditorIcons';
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
  { type: 'hero',      label: 'Hero',              icon: BlockHeroIcon,      description: 'Full-screen hero with names & cover photo',  color: 'var(--eg-accent, #A3B18A)', occasions: ALL_OCCASIONS },
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
  color: 'rgba(255,255,255,0.35)', marginBottom: '0.4rem',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem',
  border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.05)',
  color: '#fff', fontSize: 'max(16px, 0.82rem)', outline: 'none', fontFamily: 'inherit',
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
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
      />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '36px', height: '20px', borderRadius: '100px',
          background: value ? 'var(--eg-accent, #A3B18A)' : 'rgba(255,255,255,0.12)',
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
                background: activeId === e.id ? def.color : 'rgba(255,255,255,0.07)',
                color: activeId === e.id ? '#fff' : 'rgba(255,255,255,0.5)',
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
                style={{ ...inp, color: '#fff' }}
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
                          style={{ ...inp, color: '#fff' }}
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
  block, def, isActive, onSelect, onToggle, onDelete, dragHandleProps,
}: {
  block: PageBlock;
  def: BlockDef | undefined;
  isActive: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps: DragHandleProps;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = def?.icon || LayoutTemplate;
  const color = def?.color || 'var(--eg-accent, #A3B18A)';
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
        padding: '12px 10px 12px 8px',
        minHeight: '64px',
        borderRadius: '10px',
        background: isActive ? `${color}18` : hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isActive ? `${color}50` : hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
        borderLeft: isActive ? `3px solid ${color}` : `1px solid ${hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
        cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s', position: 'relative',
        userSelect: 'none',
        boxShadow: isActive ? `0 0 0 3px ${color}10` : 'none',
      }}
    >
      {/* Drag handle — only initiates drag, does not trigger card click */}
      <div
        {...dragHandleProps}
        onClick={e => e.stopPropagation()}
        style={{
          ...dragHandleProps.style,
          color: 'rgba(255,255,255,0.25)',
          display: 'flex',
          flexShrink: 0,
          padding: '4px',
          borderRadius: '4px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}
      >
        <GripIcon size={14} />
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
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: block.visible ? '#fff' : 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
          {def?.label || block.type}
        </div>
        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              <button
                onClick={e => { e.stopPropagation(); onToggle(block.id); }}
                title={block.visible ? 'Hide section' : 'Show section'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: block.visible ? 'rgba(255,255,255,0.3)' : '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '6px', transition: 'color 0.15s', minWidth: '36px', minHeight: '36px' }}
              >
                {block.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(block.id); }}
                title="Remove block"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '6px', transition: 'color 0.15s', minWidth: '36px', minHeight: '36px' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'; }}
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
          style={{ color: isActive ? color : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', minWidth: '36px', minHeight: '36px' }}
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
    { label: 'Dark', value: 'var(--eg-dark-2, #3D3530)' },
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '4px' }}>
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
                  border: isActive ? '2px solid var(--eg-accent, #A3B18A)' : '1px solid rgba(255,255,255,0.15)',
                  background: bg.value === 'accent' ? 'linear-gradient(135deg, #A3B18A, #8FA876)' : bg.value || 'transparent',
                  cursor: 'pointer', position: 'relative', transition: 'border 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {!bg.value && <X size={10} color="rgba(255,255,255,0.3)" />}
              </button>
            );
          })}
        </div>
        {/* Custom hex input */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          <input
            type="color"
            value={config.bgColor as string || '#ffffff'}
            onChange={e => updateConfig({ bgColor: e.target.value })}
            style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent', padding: 0 }}
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
                  background: isActive ? 'rgba(163,177,138,0.25)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? 'var(--eg-accent, #A3B18A)' : 'rgba(255,255,255,0.4)',
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
                  background: isActive ? 'rgba(163,177,138,0.25)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? 'var(--eg-accent, #A3B18A)' : 'rgba(255,255,255,0.4)',
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
          {['', 'var(--eg-dark-2, #3D3530)', '#ffffff', '#8c8c8c', 'var(--eg-accent, #A3B18A)'].map(c => {
            const isActive = (config.textColor || '') === c;
            return (
              <button
                key={c || 'auto'}
                onClick={() => updateConfig({ textColor: c })}
                style={{
                  width: '28px', height: '28px', borderRadius: '6px',
                  border: isActive ? '2px solid var(--eg-accent, #A3B18A)' : '1px solid rgba(255,255,255,0.15)',
                  background: c || 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {!c && <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>A</span>}
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
    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {blockContent}
      <SectionStylePanel block={block} blocksKey={blocksKey} manifest={manifest} onChange={onChange} />
    </div>
  );
}

// ── Add Block Picker ───────────────────────────────────────────
function AddBlockPicker({ onAdd, existingTypes, occasion = 'wedding' }: { onAdd: (type: BlockType) => void; existingTypes: Set<BlockType>; occasion?: OccasionTag }) {
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
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '10px', borderRadius: '8px', border: '1px dashed rgba(163,177,138,0.3)',
          background: 'rgba(163,177,138,0.05)', color: 'var(--eg-accent, #A3B18A)', cursor: 'pointer',
          fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', transition: 'all 0.15s',
        }}
      >
        <Plus size={13} /> Add Block {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
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
              background: '#1e1d1b', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', overflow: 'hidden', marginTop: '4px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Search */}
            <div style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search blocks…"
                style={{ ...inp, fontSize: '0.78rem', padding: '6px 10px' }}
              />
            </div>

            {/* Block grid — 2 columns */}
            <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {filtered.map(b => (
                <button
                  key={b.type}
                  onClick={() => { onAdd(b.type); setOpen(false); setSearch(''); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px',
                    padding: '10px', borderRadius: '10px', border: `1px solid ${existingTypes.has(b.type) ? `${b.color}30` : 'rgba(255,255,255,0.07)'}`,
                    background: existingTypes.has(b.type) ? `${b.color}08` : 'rgba(255,255,255,0.04)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = `${b.color}15`; (e.currentTarget as HTMLElement).style.borderColor = `${b.color}50`; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = existingTypes.has(b.type) ? `${b.color}08` : 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = existingTypes.has(b.type) ? `${b.color}30` : 'rgba(255,255,255,0.07)'; }}
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
                    background: `${b.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${b.color}30`,
                  }}>
                    <b.icon size={14} color={b.color} />
                  </div>
                  <div style={{ width: '100%' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      {b.label}
                      {existingTypes.has(b.type) && (
                        <span style={{ fontSize: '0.62rem', color: b.color, background: `${b.color}15`, padding: '1px 5px', borderRadius: '4px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>added</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.65)', marginTop: '2px', lineHeight: 1.35 }}>{b.description}</div>
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
}

export function CanvasEditor({ manifest, onChange, pushToPreview }: CanvasEditorProps) {
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
  const {
    orderedItems: dragOrderedBlocks,
    getDragProps,
    getHandleProps,
    isDragging,
    dropIndex,
  } = useDragSort<PageBlock>({
    items: blocks,
    getKey: (b) => b.id,
    onReorder: (newBlocks) => commit(newBlocks),
  });

  const toggleVisible = useCallback((id: string) => {
    commit(blocks.map(b => b.id === id ? { ...b, visible: !b.visible } : b));
  }, [blocks, commit]);

  const deleteBlock = useCallback((id: string) => {
    commit(blocks.filter(b => b.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
  }, [blocks, commit, activeBlockId]);

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

  const activeBlock = blocks.find(b => b.id === activeBlockId);
  const activeDef = activeBlock ? BLOCK_CATALOGUE.find(d => d.type === activeBlock.type) : null;
  const existingTypes = new Set(blocks.map(b => b.type));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ── Block list (scrollable) ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

        {/* ── Page Selector ── */}
        <div style={{ padding: '0 0 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '4px' }}>
          <label style={{ ...lbl, marginBottom: '6px' }}>Editing Page</label>
          <select
            value={activePage}
            onChange={e => setActivePage(e.target.value)}
            style={{
              ...inp, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              background: 'rgba(163,177,138,0.1)', borderColor: 'rgba(163,177,138,0.3)',
              color: 'var(--eg-accent, #A3B18A)', padding: '8px 10px',
            }}
          >
            <option value="main" style={{ background: 'var(--eg-dark-2, #3D3530)', color: '#fff' }}>
              Main Page
            </option>
            {customPages.map(p => (
              <option key={p.id} value={p.id} style={{ background: 'var(--eg-dark-2, #3D3530)', color: '#fff' }}>
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
                background: 'rgba(163,177,138,0.06)', color: 'var(--eg-accent, #A3B18A)', cursor: 'pointer',
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
                  background: 'rgba(109,89,122,0.06)', color: 'var(--eg-plum, #6D597A)', cursor: 'pointer',
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
                        background: newPageTitle.trim() ? 'var(--eg-accent, #A3B18A)' : 'rgba(255,255,255,0.1)',
                        color: newPageTitle.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                        fontSize: '0.72rem', fontWeight: 700, cursor: newPageTitle.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >Add</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
            {isCustomPage ? `${currentCustomPage?.title || 'Page'} Sections` : 'Page Sections'}
          </span>
          <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)' }}>
            click to edit · drag to reorder
          </span>
        </div>

        {/* Empty state */}
        {blocks.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '12px', padding: '2.5rem 1rem', borderRadius: '12px',
            border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>Your canvas is empty</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>Add your first section to get started</div>
            <button
              onClick={() => addBlock('hero')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '44px', height: '44px', borderRadius: '50%',
                border: 'none', background: '#5c6b3a', color: '#fff',
                cursor: 'pointer', fontSize: '1.4rem', fontWeight: 300,
                boxShadow: '0 4px 16px rgba(92,107,58,0.4)', transition: 'all 0.2s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              +
            </button>
          </div>
        )}

        {/* ── Drag-sortable block list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', position: 'relative' }}>
          {dragOrderedBlocks.map((block, idx) => {
            const def = BLOCK_CATALOGUE.find(d => d.type === block.type);
            const dragProps = getDragProps(block);
            const handleProps = getHandleProps(block);
            const showDropLine = isDragging && dropIndex === idx;
            const showDropLineAfter = isDragging && dropIndex === dragOrderedBlocks.length - 1 && idx === dragOrderedBlocks.length - 1;

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
                  dragHandleProps={handleProps}
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
              </div>
            );
          })}
        </div>

        <AddBlockPicker onAdd={addBlock} existingTypes={existingTypes} occasion={(manifest.occasion || 'wedding') as OccasionTag} />
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
              borderTop: `2px solid ${activeDef.color}50`,
              background: `${activeDef.color}06`,
            }}
          >
            <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Panel header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                  background: `${activeDef.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${activeDef.color}30`,
                }}>
                  <activeDef.icon size={14} color={activeDef.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff' }}>{activeDef.label}</div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.65)' }}>Block settings · Section style</div>
                </div>
                <button
                  onClick={() => setActiveBlockId(null)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', padding: '5px' }}
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
    </div>
  );
}
