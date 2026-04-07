'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EventsPanel.tsx — Organic glass event editor
// Clean event cards with expand/collapse
// ─────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, ChevronDown, Calendar } from 'lucide-react';
import { CalendarHeartIcon } from '@/components/icons/PearloomIcons';
import { Field, lbl, inp } from './editor-utils';
import { useEditor } from '@/lib/editor-state';
import type { StoryManifest, WeddingEvent } from '@/types';

export const EVENT_TYPE_OPTS: Array<{ type: WeddingEvent['type']; label: string; color: string }> = [
  { type: 'ceremony',      label: 'Ceremony',        color: '#7c5cbf' },
  { type: 'reception',     label: 'Reception',       color: '#e8927a' },
  { type: 'rehearsal',     label: 'Rehearsal',       color: '#4a9b8a' },
  { type: 'welcome-party', label: 'Welcome Party',   color: '#8b4a6a' },
  { type: 'brunch',        label: 'Brunch',          color: '#c4774a' },
  { type: 'other',         label: 'Other',           color: '#6a8b4a' },
];

export function EventsPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const { state } = useEditor();
  const subdomain = state.subdomain;
  const events = manifest.events || [];
  const [expandedId, setExpandedId] = useState<string | null>(events[0]?.id || null);

  const addEvent = () => {
    const newEvent: WeddingEvent = {
      id: `event-${Date.now()}`, name: 'New Event', type: 'other',
      date: new Date().toISOString().slice(0, 10), time: '5:00 PM', venue: '', address: '',
    };
    onChange({ ...manifest, events: [...events, newEvent] });
    setExpandedId(newEvent.id);
  };

  const updateEvent = (id: string, data: Partial<WeddingEvent>) => {
    onChange({ ...manifest, events: events.map(e => e.id === id ? { ...e, ...data } : e) });
  };

  const removeEvent = (id: string) => {
    onChange({ ...manifest, events: events.filter(e => e.id !== id) });
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Count */}
      <div style={{
        fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--pl-muted)', padding: '0 4px',
      }}>
        Events · {events.length}
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center', padding: '2rem 1rem',
            borderRadius: '16px', border: '1.5px dashed rgba(163,177,138,0.25)',
            background: 'rgba(255,255,255,0.1)',
          }}
        >
          <CalendarHeartIcon size={24} style={{ opacity: 0.4, marginBottom: '8px' }} />
          <div style={{ fontSize: '0.85rem', fontWeight: 600, fontStyle: 'italic', fontFamily: 'var(--pl-font-heading)', color: 'var(--pl-muted)' }}>
            No events yet
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', marginTop: '4px' }}>
            Add ceremony, reception, and more
          </div>
        </motion.div>
      )}

      {/* Event cards */}
      {events.map(evt => {
        const typeOpt = EVENT_TYPE_OPTS.find(o => o.type === (evt.type || 'other')) || EVENT_TYPE_OPTS[5];
        const isExpanded = expandedId === evt.id;
        return (
          <motion.div
            key={evt.id}
            layout
            style={{
              borderRadius: '16px',
              background: isExpanded ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
              border: isExpanded ? `1.5px solid ${typeOpt.color}25` : '1px solid rgba(255,255,255,0.2)',
              overflow: 'hidden', transition: 'all 0.15s',
            }}
          >
            {/* Header — click to expand */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : evt.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '11px 12px', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: typeOpt.color, flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {evt.name || 'Event'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--pl-muted)', marginTop: '1px' }}>
                  {evt.time}{evt.venue ? ` · ${evt.venue}` : ''}
                </div>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                style={{ color: 'var(--pl-muted)', display: 'flex' }}
              >
                <ChevronDown size={13} />
              </motion.div>
            </button>

            {/* Expanded form */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Event type pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {EVENT_TYPE_OPTS.map(opt => (
                        <button
                          key={opt.type}
                          onClick={() => updateEvent(evt.id, { type: opt.type })}
                          style={{
                            padding: '4px 10px', borderRadius: '100px', border: 'none',
                            cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600,
                            background: (evt.type || 'other') === opt.type ? opt.color : 'rgba(255,255,255,0.25)',
                            color: (evt.type || 'other') === opt.type ? '#fff' : 'var(--pl-ink-soft)',
                            transition: 'all 0.12s',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <Field label="Name" value={evt.name} onChange={v => updateEvent(evt.id, { name: v })} placeholder="Ceremony" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <DatePicker label="Date" value={evt.date || ''} onChange={d => updateEvent(evt.id, { date: d })} />
                      <Field label="Time" value={evt.time} onChange={v => updateEvent(evt.id, { time: v })} placeholder="5:00 PM" />
                    </div>
                    <Field label="Venue" value={evt.venue} onChange={v => updateEvent(evt.id, { venue: v })} placeholder="The Grand Ballroom" />
                    <Field label="Address" value={evt.address} onChange={v => updateEvent(evt.id, { address: v })} placeholder="123 Main St" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <Field label="Dress Code" value={evt.dressCode || ''} onChange={v => updateEvent(evt.id, { dressCode: v })} placeholder="Black Tie" />
                      <Field label="End Time" value={evt.endTime || ''} onChange={v => updateEvent(evt.id, { endTime: v })} placeholder="11:00 PM" />
                    </div>
                    <Field label="Description" value={evt.description || ''} onChange={v => updateEvent(evt.id, { description: v })} placeholder="Brief description…" />

                    {/* Remove */}
                    <button
                      onClick={() => removeEvent(evt.id)}
                      style={{
                        alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '5px 12px', borderRadius: '100px', border: 'none',
                        background: 'rgba(220,80,80,0.08)', color: '#d05050',
                        cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600,
                      }}
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Add event */}
      <motion.button
        onClick={addEvent}
        whileHover={{ y: -1, borderColor: 'rgba(163,177,138,0.4)' }}
        whileTap={{ scale: 0.98 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '10px', borderRadius: '14px',
          border: '1.5px dashed rgba(163,177,138,0.25)',
          background: 'transparent', color: 'var(--pl-olive)',
          cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
          transition: 'all 0.15s',
        }}
      >
        <Plus size={13} /> Add Event
      </motion.button>

      {/* Calendar links */}
      {events.length > 0 && subdomain && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <a
            href={`/api/calendar/${subdomain}`}
            download="event.ics"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '8px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)',
              color: 'var(--pl-olive)', fontSize: '0.68rem', fontWeight: 600,
              textDecoration: 'none', transition: 'background 0.12s',
            }}
          >
            <Calendar size={12} /> .ics
          </a>
          <a
            href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(events[0]?.name || 'Event')}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '8px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)',
              color: 'var(--pl-ink-soft)', fontSize: '0.68rem', fontWeight: 600,
              textDecoration: 'none', transition: 'background 0.12s',
            }}
          >
            <Calendar size={12} /> Google
          </a>
        </div>
      )}
    </div>
  );
}
