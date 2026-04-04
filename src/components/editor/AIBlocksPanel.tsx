'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/AIBlocksPanel.tsx
// AI-powered section generator for wedding sites
// Lets couples generate: events, venue, registry, travel, FAQs
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Calendar, MapPin, Gift, Plane, HelpCircle,
  Loader2, Check, ChevronDown, ChevronUp, Plus, Trash2, X,
} from 'lucide-react';
import type {
  StoryManifest, WeddingEvent, FaqItem, TravelInfo, HotelBlock
} from '@/types';

// ── Types ──────────────────────────────────────────────────────
type BlockType = 'events' | 'venue' | 'registry' | 'travel' | 'faqs';

interface BlockDef {
  id: BlockType;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  promptPlaceholder: string;
}

const BLOCKS: BlockDef[] = [
  {
    id: 'events',
    label: 'Event Cards',
    icon: Calendar,
    description: 'Ceremony, reception, rehearsal dinner cards with timing + location',
    color: '#7c5cbf',
    promptPlaceholder: 'Outdoor ceremony at sunset, cocktail hour on the terrace, indoor reception with dancing...',
  },
  {
    id: 'venue',
    label: 'Venue & Logistics',
    icon: MapPin,
    description: 'Date, time, venue, address, parking, and shuttle info',
    color: 'var(--eg-accent, #A3B18A)',
    promptPlaceholder: 'The ceremony is at The Rosewood Estate in Newport, RI at 5pm...',
  },
  {
    id: 'registry',
    label: 'Registry',
    icon: Gift,
    description: 'Beautiful registry cards with AI-written personal messaging',
    color: '#e8927a',
    promptPlaceholder: 'We have a Zola registry and an Amazon registry, plus a honeymoon fund for Italy...',
  },
  {
    id: 'travel',
    label: 'Travel & Hotels',
    icon: Plane,
    description: 'Hotel recommendations, airport info, and directions for guests',
    color: '#4a9b8a',
    promptPlaceholder: 'Newport, RI — nearest airports are TF Green and Providence. Two hotel blocks at the Marriott and Hampton Inn...',
  },
  {
    id: 'faqs',
    label: 'FAQs',
    icon: HelpCircle,
    description: 'Warm, personal answers to common guest questions',
    color: '#c4774a',
    promptPlaceholder: 'We want guests to know about the dress code (black tie optional), parking, kids policy...',
  },
];

// ── Shared mini styles ──────────────────────────────────────────
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.6rem', fontWeight: 800,
  letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)', marginBottom: '0.45rem',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.8rem', borderRadius: '0.5rem',
  border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.05)',
  color: '#fff', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s', boxSizing: 'border-box',
};

function MiniField({ label, value, onChange, placeholder, rows }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  if (rows) return (
    <div>
      <label style={lbl}>{label}</label>
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        rows={rows} placeholder={placeholder}
        style={{ ...inp, resize: 'vertical', lineHeight: 1.55 }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.5)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
      />
    </div>
  );
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={inp}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.5)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
      />
    </div>
  );
}

// ── Events Editor ───────────────────────────────────────────────
function EventsEditor({ events, onChange }: { events: WeddingEvent[]; onChange: (e: WeddingEvent[]) => void }) {
  const [expanded, setExpanded] = useState<string | null>(events[0]?.id || null);
  const upd = (id: string, data: Partial<WeddingEvent>) =>
    onChange(events.map(e => e.id === id ? { ...e, ...data } : e));
  const remove = (id: string) => onChange(events.filter(e => e.id !== id));
  const add = () => {
    const id = `event-${Date.now()}`;
    onChange([...events, { id, name: 'New Event', type: 'other' as const, date: '', time: '', venue: '', address: '' }]);
    setExpanded(id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {events.map(evt => (
        <div key={evt.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <button
            onClick={() => setExpanded(expanded === evt.id ? null : evt.id)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', gap: '8px' }}
          >
            <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 700, textAlign: 'left' }}>{evt.name || 'Event'}</span>
            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>{evt.time}</span>
            {expanded === evt.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <AnimatePresence>
            {expanded === evt.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <MiniField label="Event Name" value={evt.name} onChange={v => upd(evt.id, { name: v })} placeholder="Ceremony" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <MiniField label="Date" value={evt.date} onChange={v => upd(evt.id, { date: v })} placeholder="2025-06-14" />
                    <MiniField label="Time" value={evt.time} onChange={v => upd(evt.id, { time: v })} placeholder="5:00 PM" />
                  </div>
                  <MiniField label="Venue" value={evt.venue} onChange={v => upd(evt.id, { venue: v })} />
                  <MiniField label="Address" value={evt.address} onChange={v => upd(evt.id, { address: v })} />
                  <MiniField label="Dress Code" value={evt.dressCode || ''} onChange={v => upd(evt.id, { dressCode: v })} placeholder="Black Tie Optional" />
                  <MiniField label="Description" value={evt.description || ''} onChange={v => upd(evt.id, { description: v })} rows={2} />
                  <button
                    onClick={() => remove(evt.id)}
                    style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '5px', border: '1px solid rgba(109,89,122,0.2)', background: 'rgba(109,89,122,0.08)', color: 'var(--eg-plum, #6D597A)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
                  >
                    <Trash2 size={10} /> Remove
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
      <button onClick={add} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
        <Plus size={11} /> Add Event
      </button>
    </div>
  );
}

// ── FAQ Editor ──────────────────────────────────────────────────
function FaqEditor({ faqs, onChange }: { faqs: FaqItem[]; onChange: (f: FaqItem[]) => void }) {
  const upd = (id: string, data: Partial<FaqItem>) =>
    onChange(faqs.map(f => f.id === id ? { ...f, ...data } : f));
  const remove = (id: string) => onChange(faqs.filter(f => f.id !== id));
  const add = () => {
    const id = `faq-${Date.now()}`;
    onChange([...faqs, { id, question: '', answer: '', order: faqs.length }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {faqs.map((faq, i) => (
        <div key={faq.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.1em' }}>FAQ {i + 1}</span>
          <MiniField label="Question" value={faq.question} onChange={v => upd(faq.id, { question: v })} placeholder="What is the dress code?" />
          <MiniField label="Answer" value={faq.answer} onChange={v => upd(faq.id, { answer: v })} rows={2} placeholder="We'd love for you to..." />
          <button onClick={() => remove(faq.id)} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 6px', borderRadius: '4px', border: 'none', background: 'rgba(109,89,122,0.08)', color: 'var(--eg-plum, #6D597A)', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 700 }}>
            <X size={9} /> Remove
          </button>
        </div>
      ))}
      <button onClick={add} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
        <Plus size={11} /> Add FAQ
      </button>
    </div>
  );
}

// ── Travel Editor ───────────────────────────────────────────────
function TravelEditor({ travel, onChange }: { travel: TravelInfo; onChange: (t: TravelInfo) => void }) {
  const addHotel = () => {
    const h: HotelBlock = { name: '', address: '', bookingUrl: '', groupRate: '', notes: '' };
    onChange({ ...travel, hotels: [...(travel.hotels || []), h] });
  };
  const updHotel = (i: number, data: Partial<HotelBlock>) =>
    onChange({ ...travel, hotels: travel.hotels.map((h, idx) => idx === i ? { ...h, ...data } : h) });
  const removeHotel = (i: number) =>
    onChange({ ...travel, hotels: travel.hotels.filter((_, idx) => idx !== i) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <MiniField label="Directions" value={travel.directions || ''} onChange={v => onChange({ ...travel, directions: v })} rows={2} placeholder="Take I-95 North to Exit 12..." />
      <MiniField label="Parking Info" value={travel.parkingInfo || ''} onChange={v => onChange({ ...travel, parkingInfo: v })} placeholder="Complimentary valet available" />

      <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(163,177,138,0.8)', marginTop: '4px' }}>Hotels</div>
      {(travel.hotels || []).map((h, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.1em' }}>Hotel {i + 1}</span>
          <MiniField label="Hotel Name" value={h.name} onChange={v => updHotel(i, { name: v })} placeholder="The Marriott Newport" />
          <MiniField label="Address" value={h.address} onChange={v => updHotel(i, { address: v })} />
          <MiniField label="Group Rate" value={h.groupRate || ''} onChange={v => updHotel(i, { groupRate: v })} placeholder="$179/night with code SMITH2025" />
          <MiniField label="Booking URL" value={h.bookingUrl || ''} onChange={v => updHotel(i, { bookingUrl: v })} placeholder="https://..." />
          <MiniField label="Notes" value={h.notes || ''} onChange={v => updHotel(i, { notes: v })} placeholder="Our recommended hotel, 10 min from venue" />
          <button onClick={() => removeHotel(i)} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 6px', borderRadius: '4px', border: 'none', background: 'rgba(109,89,122,0.08)', color: 'var(--eg-plum, #6D597A)', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 700 }}>
            <X size={9} /> Remove
          </button>
        </div>
      ))}
      <button onClick={addHotel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
        <Plus size={11} /> Add Hotel
      </button>
    </div>
  );
}

// ── Registry Editor ─────────────────────────────────────────────
function RegistryEditor({ registry, onChange }: {
  registry: NonNullable<StoryManifest['registry']>;
  onChange: (r: NonNullable<StoryManifest['registry']>) => void;
}) {
  const entries = registry.entries || [];
  const addEntry = () => onChange({ ...registry, entries: [...entries, { name: '', url: '', note: '' }] });
  const updEntry = (i: number, data: Partial<typeof entries[0]>) =>
    onChange({ ...registry, entries: entries.map((e, idx) => idx === i ? { ...e, ...data } : e) });
  const removeEntry = (i: number) =>
    onChange({ ...registry, entries: entries.filter((_, idx) => idx !== i) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <MiniField label="Message" value={registry.message || ''} onChange={v => onChange({ ...registry, message: v })} rows={2} placeholder="Your presence is the greatest gift..." />
      <MiniField label="Cash Fund URL (Honeyfund, etc.)" value={registry.cashFundUrl || ''} onChange={v => onChange({ ...registry, cashFundUrl: v })} placeholder="https://www.honeyfund.com/..." />
      <MiniField label="Cash Fund Message" value={registry.cashFundMessage || ''} onChange={v => onChange({ ...registry, cashFundMessage: v })} placeholder="Contribute to our honeymoon in Italy" />

      <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(163,177,138,0.8)', marginTop: '4px' }}>Registry Links</div>
      {entries.map((entry, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <MiniField label="Store Name" value={entry.name} onChange={v => updEntry(i, { name: v })} placeholder="Zola" />
          <MiniField label="Registry URL" value={entry.url} onChange={v => updEntry(i, { url: v })} placeholder="https://www.zola.com/registry/..." />
          <MiniField label="Note" value={entry.note || ''} onChange={v => updEntry(i, { note: v })} placeholder="Our main registry..." />
          <button onClick={() => removeEntry(i)} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 6px', borderRadius: '4px', border: 'none', background: 'rgba(109,89,122,0.08)', color: 'var(--eg-plum, #6D597A)', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 700 }}>
            <X size={9} /> Remove
          </button>
        </div>
      ))}
      <button onClick={addEntry} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
        <Plus size={11} /> Add Registry
      </button>
    </div>
  );
}

// ── Venue Editor ────────────────────────────────────────────────
function VenueEditor({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const logistics = manifest.logistics || {};
  const upd = (data: Partial<typeof logistics>) =>
    onChange({ ...manifest, logistics: { ...logistics, ...data } });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <MiniField label="Venue Name" value={logistics.venue || ''} onChange={v => upd({ venue: v })} placeholder="The Rosewood Estate" />
      <MiniField label="Wedding Date" value={logistics.date || ''} onChange={v => upd({ date: v })} placeholder="June 14, 2025" />
      <MiniField label="Ceremony Time" value={logistics.time || ''} onChange={v => upd({ time: v })} placeholder="5:00 PM" />
      <MiniField label="RSVP Deadline" value={logistics.rsvpDeadline || ''} onChange={v => upd({ rsvpDeadline: v })} placeholder="May 1, 2025" />
    </div>
  );
}

// ── Block Card ──────────────────────────────────────────────────
function BlockCard({
  block, manifest, onGenerate, onApply, isGenerating, isApplied,
}: {
  block: BlockDef;
  manifest: StoryManifest;
  onGenerate: (blockType: BlockType, prompt: string) => Promise<void>;
  onApply: () => void;
  isGenerating: boolean;
  isApplied: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');

  const Icon = block.icon;

  return (
    <motion.div
      layout
      style={{
        background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
        border: `1px solid ${isApplied ? `${block.color}50` : 'rgba(255,255,255,0.07)'}`,
        overflow: 'hidden',
        boxShadow: isApplied ? `0 0 0 1px ${block.color}30` : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', padding: '10px 12px',
          background: 'none', border: 'none', cursor: 'pointer', gap: '10px', textAlign: 'left',
        }}
      >
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
          background: `${block.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={block.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{block.label}</span>
            {isApplied && (
              <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: block.color, background: `${block.color}15`, padding: '2px 6px', borderRadius: '4px' }}>
                Active
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.4, marginTop: '2px' }}>
            {block.description}
          </div>
        </div>
        {expanded ? <ChevronUp size={13} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={13} color="rgba(255,255,255,0.3)" />}
      </button>

      {/* Expanded: AI prompt + Generate */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* AI prompt field */}
              <div>
                <label style={{ ...lbl, color: `${block.color}cc` }}>Describe your {block.label}</label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows={3}
                  placeholder={block.promptPlaceholder}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.55, fontSize: '0.78rem' }}
                  onFocus={e => { e.currentTarget.style.borderColor = `${block.color}60`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
                />
              </div>

              {/* Generate button */}
              <motion.button
                onClick={() => onGenerate(block.id, prompt)}
                disabled={isGenerating}
                whileHover={{ scale: isGenerating ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px', borderRadius: '8px', border: 'none',
                  background: isGenerating
                    ? 'rgba(255,255,255,0.06)'
                    : `linear-gradient(135deg, ${block.color}, ${block.color}cc)`,
                  color: isGenerating ? 'rgba(255,255,255,0.4)' : '#fff',
                  fontSize: '0.78rem', fontWeight: 700, cursor: isGenerating ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                {isGenerating
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                  : <><Sparkles size={13} /> Generate with AI</>}
              </motion.button>

              {isApplied && (
                <button
                  onClick={onApply}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '8px', borderRadius: '8px',
                    border: `1px solid ${block.color}40`, background: 'transparent',
                    color: block.color, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <Check size={11} /> Re-apply / Edit
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Skeleton card ───────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.07)', padding: '12px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      animation: 'skeletonPulse 1.4s ease-in-out infinite',
    }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ height: '11px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', width: '55%' }} />
          <div style={{ height: '9px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', width: '80%' }} />
        </div>
      </div>
    </div>
  );
}

// ── Main AIBlocksPanel ──────────────────────────────────────────
interface AIBlocksPanelProps {
  manifest: StoryManifest;
  coupleNames: [string, string];
  onChange: (m: StoryManifest) => void;
}

export function AIBlocksPanel({ manifest, coupleNames, onChange }: AIBlocksPanelProps) {
  const [generatingBlock, setGeneratingBlock] = useState<BlockType | null>(null);
  const [activeEdit, setActiveEdit] = useState<BlockType | null>(null);
  const [generated, setGenerated] = useState<Partial<Record<BlockType, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<BlockType | 'all'>('all');

  const handleGenerate = useCallback(async (blockType: BlockType, prompt: string) => {
    setGeneratingBlock(blockType);
    setError(null);
    try {
      const res = await fetch('/api/ai-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockType,
          prompt,
          context: {
            names: coupleNames,
            vibe: manifest.vibeString,
            venue: manifest.logistics?.venue,
            date: manifest.logistics?.date,
          },
        }),
      });

      if (!res.ok) {
        const { error: err } = await res.json();
        throw new Error(err || 'Generation failed');
      }

      const { data } = await res.json();

      // Merge generated data into manifest by block type
      let updated = { ...manifest };
      switch (blockType) {
        case 'events':
          updated.events = data as WeddingEvent[];
          break;
        case 'venue':
          updated.logistics = { ...manifest.logistics, ...(data as typeof manifest.logistics) };
          break;
        case 'registry':
          updated.registry = data as typeof manifest.registry;
          break;
        case 'travel':
          updated.travelInfo = data as TravelInfo;
          break;
        case 'faqs':
          updated.faqs = data as FaqItem[];
          break;
      }

      onChange(updated);
      setGenerated(prev => ({ ...prev, [blockType]: true }));
      setActiveEdit(blockType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGeneratingBlock(null);
    }
  }, [manifest, coupleNames, onChange]);

  const handleRegenerate = useCallback(() => {
    setGenerated({});
    setActiveEdit(null);
    setError(null);
  }, []);

  // Apply edited data back into manifest for the active sub-editor
  const handleSubEdit = useCallback((blockType: BlockType, updated: StoryManifest) => {
    onChange(updated);
  }, [onChange]);

  const displayedBlocks = activeCategory === 'all' ? BLOCKS : BLOCKS.filter(b => b.id === activeCategory);
  const generatedCount = Object.values(generated).filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header with Regenerate button */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(163,177,138,0.8)', marginBottom: '0.3rem' }}>
            Auto-Fill Sections
          </div>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, margin: 0 }}>
            Tell AI about your events, venue, registry, or travel — it generates polished content for each section of your site.
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
            padding: '6px 10px', borderRadius: '7px',
            border: '1px solid rgba(163,177,138,0.25)',
            background: 'rgba(163,177,138,0.1)',
            color: 'var(--eg-accent, #A3B18A)',
            fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
        >
          <Sparkles size={10} /> Reset
        </button>
      </div>

      {/* Category pill tabs with count badges */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveCategory('all')}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 10px', borderRadius: '100px', border: 'none', cursor: 'pointer',
            background: activeCategory === 'all' ? '#5c6b3a' : 'rgba(255,255,255,0.07)',
            color: activeCategory === 'all' ? '#fff' : 'rgba(255,255,255,0.45)',
            fontSize: '0.65rem', fontWeight: 700, transition: 'all 0.15s',
          }}
        >
          All
          <span style={{ background: activeCategory === 'all' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '8px', fontSize: '0.62rem', fontWeight: 800 }}>
            {BLOCKS.length}
          </span>
        </button>
        {BLOCKS.map(block => {
          const Icon = block.icon;
          const isActive = activeCategory === block.id;
          const isDone = !!generated[block.id];
          return (
            <button
              key={block.id}
              onClick={() => setActiveCategory(isActive ? 'all' : block.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px 9px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                background: isActive ? block.color : 'rgba(255,255,255,0.07)',
                color: isActive ? '#fff' : isDone ? block.color : 'rgba(255,255,255,0.4)',
                fontSize: '0.62rem', fontWeight: 700, transition: 'all 0.15s',
              }}
            >
              <Icon size={10} color={isActive ? '#fff' : isDone ? block.color : 'rgba(255,255,255,0.4)'} />
              {block.label}
              {isDone && (
                <span style={{ background: isActive ? 'rgba(255,255,255,0.25)' : `${block.color}25`, padding: '1px 4px', borderRadius: '6px', fontSize: '0.62rem', fontWeight: 800 }}>
                  <Check size={7} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ background: 'rgba(109,89,122,0.1)', border: '1px solid rgba(109,89,122,0.2)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.75rem', color: 'var(--eg-plum, #6D597A)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <X size={12} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--eg-plum, #6D597A)' }}><X size={10} /></button>
        </div>
      )}

      {/* Block library */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {displayedBlocks.map(block => (
          <BlockCard
            key={block.id}
            block={block}
            manifest={manifest}
            onGenerate={handleGenerate}
            onApply={() => setActiveEdit(activeEdit === block.id ? null : block.id)}
            isGenerating={generatingBlock === block.id}
            isApplied={!!generated[block.id]}
          />
        ))}
      </div>

      {/* Applied count badge */}
      {generatedCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 12px', borderRadius: '8px',
          background: 'rgba(163,177,138,0.08)', border: '1px solid rgba(163,177,138,0.15)',
        }}>
          <Check size={12} color="#4ade80" />
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--eg-accent, #A3B18A)' }}>
            {generatedCount} section{generatedCount > 1 ? 's' : ''} generated and added to your site
          </span>
        </div>
      )}

      {/* Inline sub-editor for the active block */}
      <AnimatePresence mode="wait">
        {activeEdit && (
          <motion.div
            key={activeEdit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)', padding: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: BLOCKS.find(b => b.id === activeEdit)?.color }}>
                Edit {BLOCKS.find(b => b.id === activeEdit)?.label}
              </span>
              <button onClick={() => setActiveEdit(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                <X size={13} />
              </button>
            </div>

            {activeEdit === 'events' && (
              <EventsEditor
                events={manifest.events || []}
                onChange={events => handleSubEdit('events', { ...manifest, events })}
              />
            )}
            {activeEdit === 'venue' && (
              <VenueEditor
                manifest={manifest}
                onChange={updated => handleSubEdit('venue', updated)}
              />
            )}
            {activeEdit === 'registry' && (
              <RegistryEditor
                registry={manifest.registry || { enabled: true }}
                onChange={registry => handleSubEdit('registry', { ...manifest, registry })}
              />
            )}
            {activeEdit === 'travel' && (
              <TravelEditor
                travel={manifest.travelInfo || { airports: [], hotels: [] }}
                onChange={travelInfo => handleSubEdit('travel', { ...manifest, travelInfo })}
              />
            )}
            {activeEdit === 'faqs' && (
              <FaqEditor
                faqs={manifest.faqs || []}
                onChange={faqs => handleSubEdit('faqs', { ...manifest, faqs })}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}
