'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { CalendarHeartIcon } from '@/components/icons/PearloomIcons';
import { Field, lbl, inp } from './editor-utils';
import type { StoryManifest, WeddingEvent, FaqItem } from '@/types';

export const EVENT_TYPE_OPTS: Array<{ type: WeddingEvent['type']; label: string; color: string }> = [
  { type: 'ceremony',      label: 'Ceremony',         color: '#7c5cbf' },
  { type: 'reception',     label: 'Reception',        color: '#e8927a' },
  { type: 'rehearsal',     label: 'Rehearsal Dinner', color: '#4a9b8a' },
  { type: 'welcome-party', label: 'Welcome Party',    color: '#8b4a6a' },
  { type: 'brunch',        label: 'Farewell Brunch',  color: '#c4774a' },
  { type: 'other',         label: 'Other',            color: '#6a8b4a' },
];

export function EventsPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const events = manifest.events || [];
  const [expandedId, setExpandedId] = useState<string | null>(events[0]?.id || null);

  const addEvent = () => {
    const newEvent: WeddingEvent = {
      id: `event-${Date.now()}`,
      name: 'New Event',
      type: 'other',
      date: new Date().toISOString().slice(0, 10),
      time: '5:00 PM',
      venue: '',
      address: '',
    };
    const next = [...events, newEvent];
    onChange({ ...manifest, events: next });
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
        <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)', whiteSpace: 'nowrap' }}>
          {manifest.occasion === 'birthday' ? 'Party Events' : manifest.occasion === 'anniversary' ? 'Anniversary Events' : 'Wedding Events'}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.2)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <CalendarHeartIcon size={24} style={{ marginBottom: '8px', opacity: 0.4 }} />
          <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>No events yet</div>
          <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Add your ceremony, reception, and more</div>
        </div>
      ) : (
        events.map((evt) => {
          const evtTypeOpt = EVENT_TYPE_OPTS.find(o => o.type === (evt.type || 'other')) || EVENT_TYPE_OPTS[EVENT_TYPE_OPTS.length - 1];
          const isExpanded = expandedId === evt.id;
          return (
            <div key={evt.id} style={{ borderRadius: '10px', border: `1px solid ${isExpanded ? `${evtTypeOpt.color}35` : 'rgba(255,255,255,0.07)'}`, background: isExpanded ? `${evtTypeOpt.color}08` : 'rgba(255,255,255,0.04)', overflow: 'hidden', transition: 'all 0.15s' }}>
              {/* Card header — click to expand */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: evtTypeOpt.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.name || 'Event'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{evt.date}{evt.time ? ` · ${evt.time}` : ''}{evt.venue ? ` · ${evt.venue}` : ''}</div>
                </div>
                <ChevronDown size={13} color="rgba(255,255,255,0.3)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
              </button>

              {/* Expanded editor */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Event type pills */}
                      <div>
                        <label style={lbl}>Event Type</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {EVENT_TYPE_OPTS.map(opt => (
                            <button
                              key={opt.type}
                              onClick={() => updateEvent(evt.id, { type: opt.type })}
                              style={{
                                padding: '5px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                                fontSize: '0.82rem', fontWeight: 700,
                                background: (evt.type || 'other') === opt.type ? opt.color : 'rgba(255,255,255,0.08)',
                                color: (evt.type || 'other') === opt.type ? '#fff' : 'rgba(255,255,255,0.55)',
                                transition: 'all 0.15s',
                              }}
                            >{opt.label}</button>
                          ))}
                        </div>
                      </div>

                      <Field label="Event Name" value={evt.name} onChange={v => updateEvent(evt.id, { name: v })} placeholder="Ceremony" />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={lbl}>Date</label>
                          <input
                            type="date"
                            value={evt.date || ''}
                            onChange={e => updateEvent(evt.id, { date: e.target.value })}
                            style={{ ...inp, colorScheme: 'dark' }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
                          />
                        </div>
                        <Field label="Time" value={evt.time} onChange={v => updateEvent(evt.id, { time: v })} placeholder="5:00 PM" />
                      </div>
                      <Field label="Venue" value={evt.venue} onChange={v => updateEvent(evt.id, { venue: v })} placeholder="The Grand Ballroom" />
                      <Field label="Address" value={evt.address} onChange={v => updateEvent(evt.id, { address: v })} placeholder="123 Main St, New York, NY" />
                      <Field label="Dress Code" value={evt.dressCode || ''} onChange={v => updateEvent(evt.id, { dressCode: v })} placeholder="Black Tie" />

                      {/* Ceremony Details sub-section — shown for ceremony-type events */}
                      {evt.type === 'ceremony' && (
                        <div style={{ marginTop: '0.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)', marginBottom: '0.6rem', opacity: 0.7 }}>
                            Ceremony Details
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Field label="Officiant" value={evt.ceremony?.officiant || ''} onChange={v => updateEvent(evt.id, { ceremony: { ...evt.ceremony, officiant: v } })} placeholder="Pastor Smith" />
                            <Field label="Processional Song" value={evt.ceremony?.processionalSong || ''} onChange={v => updateEvent(evt.id, { ceremony: { ...evt.ceremony, processionalSong: v } })} placeholder="Canon in D" />
                            <Field label="Recessional Song" value={evt.ceremony?.recessionalSong || ''} onChange={v => updateEvent(evt.id, { ceremony: { ...evt.ceremony, recessionalSong: v } })} placeholder="Signed, Sealed, Delivered" />
                            <Field label="Unity Ritual" value={evt.ceremony?.unityRitual || ''} onChange={v => updateEvent(evt.id, { ceremony: { ...evt.ceremony, unityRitual: v } })} placeholder="Unity candle" />
                          </div>
                        </div>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={() => removeEvent(evt.id)}
                        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(109,89,122,0.2)', background: 'rgba(109,89,122,0.06)', color: 'var(--eg-plum, #6D597A)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
                      >
                        <Trash2 size={11} /> Remove Event
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })
      )}

      {/* Add event button */}
      <button
        onClick={addEvent}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', border: '1px dashed rgba(163,177,138,0.4)', background: 'transparent', color: 'var(--eg-accent, #A3B18A)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.15s' }}
        onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.08)'; }}
        onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <Plus size={13} /> Add Event
      </button>
    </div>
  );
}
