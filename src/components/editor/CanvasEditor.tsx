'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/CanvasEditor.tsx
// Free-canvas drag-and-drop block editor
// Like Webflow / Framer — add blocks anywhere, drag to reorder,
// click to configure per-block in a floating right panel.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  GripVertical, Plus, Eye, EyeOff, Trash2, Settings,
  LayoutTemplate, AlignLeft, Calendar, Clock, Gift, Plane,
  HelpCircle, Camera, BookOpen, MapPin, Quote, Film,
  Minus, Heart, ChevronDown, ChevronRight, X,
  Sparkles, Users,
} from 'lucide-react';
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
  { type: 'hero',      label: 'Hero',              icon: LayoutTemplate, description: 'Full-screen hero with names & cover photo',  color: '#b8926a', occasions: ALL_OCCASIONS },
  { type: 'story',     label: 'Our Story',         icon: AlignLeft,      description: 'Chapter timeline & photo narrative',          color: '#7c5cbf', occasions: ALL_OCCASIONS },
  { type: 'event',     label: 'Event Cards',       icon: Calendar,       description: 'Ceremony, reception & event details',         color: '#e8927a', occasions: ['wedding', 'engagement'] },
  { type: 'countdown', label: 'Countdown',         icon: Clock,          description: 'Live countdown to your big day',              color: '#4a9b8a', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'rsvp',      label: 'RSVP',              icon: Heart,          description: 'Guest RSVP form with meal preferences',       color: '#e87ab8', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'registry',  label: 'Registry',          icon: Gift,           description: 'Registry links & honeymoon fund',             color: '#c4774a', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'travel',    label: 'Travel & Hotels',   icon: Plane,          description: 'Hotels, airports & directions',               color: '#4a7a9b', occasions: ['wedding', 'engagement'] },
  { type: 'faq',       label: 'FAQ',               icon: HelpCircle,     description: 'Common guest questions & answers',            color: '#8b7a4a', occasions: ['wedding', 'engagement'] },
  { type: 'photos',    label: 'Photo Wall',        icon: Camera,         description: 'Guest photo gallery with uploads',            color: '#4a8b6a', occasions: ALL_OCCASIONS },
  { type: 'guestbook', label: 'Guestbook',         icon: BookOpen,       description: 'Public guest wishes & AI highlights',         color: '#7a4a8b', occasions: ALL_OCCASIONS },
  { type: 'map',       label: 'Map',               icon: MapPin,         description: 'Embedded venue map',                          color: '#4a6a8b', occasions: ['wedding', 'engagement', 'anniversary'] },
  { type: 'quote',     label: 'Quote',             icon: Quote,          description: 'Romantic quote or vow snippet',               color: '#8b4a6a', occasions: ALL_OCCASIONS },
  { type: 'text',      label: 'Text Block',        icon: AlignLeft,      description: 'Custom text section',                         color: '#6a8b4a', occasions: ALL_OCCASIONS },
  { type: 'video',     label: 'Video',             icon: Film,           description: 'YouTube or Vimeo embed',                      color: '#4a4a8b', occasions: ALL_OCCASIONS },
  { type: 'divider',   label: 'Divider',           icon: Minus,          description: 'Visual section separator',                    color: '#8b8b4a', occasions: ALL_OCCASIONS },
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
  label: string; emoji: string; color: string;
  specificFields: Array<{ key: string; label: string; type: 'text' | 'select' | 'toggle' | 'number'; options?: string[] }>;
}> = {
  ceremony: {
    label: 'Ceremony', emoji: '💒', color: '#7c5cbf',
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
    label: 'Reception', emoji: '🥂', color: '#e8927a',
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
    label: 'Rehearsal Dinner', emoji: '🎭', color: '#4a9b8a',
    specificFields: [
      { key: 'whoIsInvited',   label: 'Who is invited',     type: 'text' },
      { key: 'dinnerFollows',  label: 'Dinner follows',     type: 'toggle' },
      { key: 'dinnerVenue',    label: 'Dinner venue',       type: 'text' },
      { key: 'dresscode',      label: 'Dress code',         type: 'text' },
    ],
  },
  brunch: {
    label: 'Farewell Brunch', emoji: '☕', color: '#c4774a',
    specificFields: [
      { key: 'foodStyle',    label: 'Food style',       type: 'text' },
      { key: 'kidsWelcome',  label: 'Kids welcome',     type: 'toggle' },
    ],
  },
  'welcome-party': {
    label: 'Welcome Party', emoji: '🎉', color: '#8b4a6a',
    specificFields: [
      { key: 'foodStyle',    label: 'Food style',       type: 'text' },
      { key: 'kidsWelcome',  label: 'Kids welcome',     type: 'toggle' },
    ],
  },
  other: {
    label: 'Custom Event', emoji: '🎊', color: '#6a8b4a',
    specificFields: [],
  },
};

// ── Shared mini styles ──────────────────────────────────────────
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.58rem', fontWeight: 800,
  letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)', marginBottom: '0.4rem',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem',
  border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.05)',
  color: '#fff', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit',
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
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(184,146,106,0.5)'; }}
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
          background: value ? '#b8926a' : 'rgba(255,255,255,0.12)',
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
              {def.emoji} {e.name}
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
            + {def.emoji}
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
              <span style={{ fontSize: '1rem' }}>{def.emoji}</span>
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
                  <option key={t} value={t} style={{ background: '#1a1a18' }}>{d.emoji} {d.label}</option>
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
                <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: def.color }}>
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
  block, def, isActive, onSelect, onToggle, onDelete,
}: {
  block: PageBlock;
  def: BlockDef | undefined;
  isActive: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = def?.icon || LayoutTemplate;
  const color = def?.color || '#b8926a';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: block.visible ? 1 : 0.38 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 10px 10px 8px',
        borderRadius: '10px',
        background: isActive ? `${color}18` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isActive ? `${color}50` : 'rgba(255,255,255,0.07)'}`,
        cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Drag handle */}
      <div style={{ cursor: 'grab', color: 'rgba(255,255,255,0.2)', display: 'flex', flexShrink: 0 }}>
        <GripVertical size={14} />
      </div>

      {/* Icon */}
      <div
        style={{
          width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
          background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={() => onSelect(block.id)}
      >
        <Icon size={13} color={color} />
      </div>

      {/* Label */}
      <div style={{ flex: 1 }} onClick={() => onSelect(block.id)}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: block.visible ? '#fff' : 'rgba(255,255,255,0.4)' }}>
          {def?.label || block.type}
        </div>
        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginTop: '1px' }}>
          {def?.description}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
        <button
          onClick={e => { e.stopPropagation(); onToggle(block.id); }}
          title={block.visible ? 'Hide' : 'Show'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', display: 'flex', padding: '4px', borderRadius: '4px' }}
        >
          {block.visible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(block.id); }}
          title="Remove block"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', display: 'flex', padding: '4px', borderRadius: '4px' }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: '3px', height: '60%', borderRadius: '0 2px 2px 0', background: color,
        }} />
      )}
    </motion.div>
  );
}

// ── Block Config Panel ──────────────────────────────────────────
function BlockConfigPanel({
  block, def, manifest, onChange,
}: {
  block: PageBlock;
  def: BlockDef | undefined;
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const color = def?.color || '#b8926a';

  const noConfig = (
    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
      This block uses your site-wide content. Edit it from the Story, Events, or Details tabs.
    </p>
  );

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
            onChange={v => onChange({
              ...manifest,
              blocks: (manifest.blocks || []).map(b => b.id === block.id ? { ...b, config: { ...b.config, text: v } } : b),
            })}
            placeholder='"Two souls, one heart."'
          />
          <MiniInput
            label="Attribution (optional)"
            value={String(block.config?.attribution || '')}
            onChange={v => onChange({
              ...manifest,
              blocks: (manifest.blocks || []).map(b => b.id === block.id ? { ...b, config: { ...b.config, attribution: v } } : b),
            })}
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
            onChange={e => onChange({
              ...manifest,
              blocks: (manifest.blocks || []).map(b => b.id === block.id ? { ...b, config: { ...b.config, text: e.target.value } } : b),
            })}
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
          onChange={v => onChange({
            ...manifest,
            blocks: (manifest.blocks || []).map(b => b.id === block.id ? { ...b, config: { ...b.config, url: v } } : b),
          })}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      );

    case 'countdown':
      return (
        <MiniInput
          label="Target date (YYYY-MM-DD)"
          value={String(block.config?.date || manifest.events?.[0]?.date || '')}
          onChange={v => onChange({
            ...manifest,
            blocks: (manifest.blocks || []).map(b => b.id === block.id ? { ...b, config: { ...b.config, date: v } } : b),
          })}
          placeholder={manifest.events?.[0]?.date || '2025-06-14'}
        />
      );

    default:
      return noConfig;
  }
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
          padding: '10px', borderRadius: '8px', border: '1px dashed rgba(184,146,106,0.3)',
          background: 'rgba(184,146,106,0.05)', color: '#b8926a', cursor: 'pointer',
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

            {/* Block list */}
            <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '6px' }}>
              {filtered.map(b => (
                <button
                  key={b.type}
                  onClick={() => { onAdd(b.type); setOpen(false); setSearch(''); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '8px', border: 'none',
                    background: 'transparent', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
                    background: `${b.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <b.icon size={13} color={b.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
                      {b.label}
                      {existingTypes.has(b.type) && (
                        <span style={{ marginLeft: '6px', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)' }}>already added</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{b.description}</div>
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
  const [blocks, setBlocks] = useState<PageBlock[]>(() => {
    if (manifest.blocks && manifest.blocks.length > 0) return manifest.blocks;
    return DEFAULT_BLOCKS;
  });
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const commit = useCallback((newBlocks: PageBlock[]) => {
    const sorted = newBlocks.map((b, i) => ({ ...b, order: i }));
    setBlocks(sorted);
    const updated = { ...manifest, blocks: sorted };
    onChange(updated);
    pushToPreview(updated);
  }, [manifest, onChange, pushToPreview]);

  const handleReorder = (newBlocks: PageBlock[]) => commit(newBlocks);

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

  const activeBlock = blocks.find(b => b.id === activeBlockId);
  const activeDef = activeBlock ? BLOCK_CATALOGUE.find(d => d.type === activeBlock.type) : null;
  const existingTypes = new Set(blocks.map(b => b.type));

  return (
    <div style={{ display: 'flex', gap: '0', height: '100%', overflow: 'hidden' }}>
      {/* ── Left: Block list ──────────────────────────────── */}
      <div style={{ width: activeBlock ? '50%' : '100%', display: 'flex', flexDirection: 'column', gap: '6px', transition: 'width 0.2s', overflowY: 'auto' }}>
        <div style={{ padding: '2px 0 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
            Page sections · drag to reorder
          </span>
        </div>

        <Reorder.Group
          axis="y"
          values={blocks}
          onReorder={handleReorder}
          as="div"
          style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}
        >
          {blocks.map(block => {
            const def = BLOCK_CATALOGUE.find(d => d.type === block.type);
            return (
              <Reorder.Item key={block.id} value={block} as="div">
                <BlockRow
                  block={block}
                  def={def}
                  isActive={activeBlockId === block.id}
                  onSelect={id => setActiveBlockId(activeBlockId === id ? null : id)}
                  onToggle={toggleVisible}
                  onDelete={deleteBlock}
                />
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        <AddBlockPicker onAdd={addBlock} existingTypes={existingTypes} occasion={(manifest.occasion || 'wedding') as OccasionTag} />
      </div>

      {/* ── Right: Config panel ───────────────────────────── */}
      <AnimatePresence>
        {activeBlock && activeDef && (
          <motion.div
            initial={{ opacity: 0, x: 12, width: 0 }}
            animate={{ opacity: 1, x: 0, width: '50%' }}
            exit={{ opacity: 0, x: 12, width: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              paddingLeft: '10px', borderLeft: `1px solid ${activeDef.color}30`,
              overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px',
            }}
          >
            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
                background: `${activeDef.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <activeDef.icon size={13} color={activeDef.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fff' }}>{activeDef.label}</div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>Block settings</div>
              </div>
              <button
                onClick={() => setActiveBlockId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', padding: '4px' }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Config content */}
            <BlockConfigPanel
              block={activeBlock}
              def={activeDef}
              manifest={manifest}
              onChange={m => {
                onChange(m);
                pushToPreview(m);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
