'use client';

import React, { useState, useCallback } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, ChevronDown, Calendar } from 'lucide-react';
import { CalendarHeartIcon } from '@/components/icons/PearloomIcons';
import { Field, lbl, inp } from './editor-utils';
import { useEditor } from '@/lib/editor-state';
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
  const { state } = useEditor();
  const subdomain = state.subdomain;
  const events = manifest.events || [];
  const [expandedId, setExpandedId] = useState<string | null>(events[0]?.id || null);

  // Build Google Calendar URL from first event
  const buildGoogleCalendarUrl = useCallback(() => {
    const evt = events[0];
    if (!evt?.date) return null;

    const formatDateTime = (dateStr: string, timeStr: string) => {
      // Simple approach: strip separators and append time
      const datePart = dateStr.replace(/-/g, '');
      const parseTime = (t: string) => {
        const normalized = t.trim().toUpperCase();
        const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
        if (match) {
          let h = parseInt(match[1], 10);
          const m = match[2] ? parseInt(match[2], 10) : 0;
          if (match[3] === 'PM' && h !== 12) h += 12;
          if (match[3] === 'AM' && h === 12) h = 0;
          return `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
        }
        const m24 = normalized.match(/^(\d{1,2}):(\d{2})$/);
        if (m24) return `${String(parseInt(m24[1], 10)).padStart(2, '0')}${m24[2]}00`;
        return '120000';
      };
      return `${datePart}T${parseTime(timeStr)}Z`;
    };

    const start = formatDateTime(evt.date, evt.time || '12:00 PM');
    const endTime = evt.endTime || '';
    const end = endTime ? formatDateTime(evt.date, endTime) : formatDateTime(evt.date, '');
    const location = [evt.venue, evt.address].filter(Boolean).join(', ');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: evt.name || 'Event',
      dates: `${start}/${end || start}`,
      location,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [events]);

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
      <div style={{ padding: '0 4px', marginBottom: '4px' }}>
        <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)' }}>
          {manifest.occasion === 'birthday' ? 'Party Events' : manifest.occasion === 'anniversary' ? 'Anniversary Events' : 'Events'} · {events.length}
        </div>
      </div>

      {events.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--pl-muted)', borderRadius: '16px', border: '1.5px dashed rgba(163,177,138,0.25)', background: 'rgba(255,255,255,0.15)' }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            style={{ marginBottom: '10px' }}
          >
            <CalendarHeartIcon size={28} />
          </motion.div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, fontStyle: 'italic', fontFamily: 'var(--pl-font-heading, "Playfair Display", serif)', color: 'var(--pl-muted)' }}>No events yet</div>
          <div style={{ fontSize: '0.78rem', marginTop: '5px', color: 'var(--pl-muted)' }}>Add your ceremony, reception, and more</div>
        </motion.div>
      ) : (
        events.map((evt) => {
          const evtTypeOpt = EVENT_TYPE_OPTS.find(o => o.type === (evt.type || 'other')) || EVENT_TYPE_OPTS[EVENT_TYPE_OPTS.length - 1];
          const isExpanded = expandedId === evt.id;
          return (
            <div key={evt.id} style={{ borderRadius: '12px', border: `1px solid ${isExpanded ? `${evtTypeOpt.color}30` : 'rgba(0,0,0,0.05)'}`, background: isExpanded ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', overflow: 'hidden', transition: 'all 0.15s', boxShadow: isExpanded ? '0 2px 8px rgba(43,30,20,0.04)' : 'none' } as React.CSSProperties}>
              {/* Card header — click to expand */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: evtTypeOpt.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.name || 'Event'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pl-ink-soft)', marginTop: '2px' }}>{evt.date}{evt.time ? ` · ${evt.time}` : ''}{evt.venue ? ` · ${evt.venue}` : ''}</div>
                </div>
                <ChevronDown size={13} color="var(--pl-muted)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
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
                                background: (evt.type || 'other') === opt.type ? opt.color : 'rgba(255,255,255,0.3)',
                                color: (evt.type || 'other') === opt.type ? '#fff' : 'var(--pl-ink-soft)',
                                backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
                                transition: 'all 0.15s',
                              }}
                            >{opt.label}</button>
                          ))}
                        </div>
                      </div>

                      <Field label="Event Name" value={evt.name} onChange={v => updateEvent(evt.id, { name: v })} placeholder="Ceremony" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div>
                          <DatePicker
                            label="Date"
                            value={evt.date || ''}
                            onChange={(d) => updateEvent(evt.id, { date: d })}
                          />
                        </div>
                        <Field label="Time" value={evt.time} onChange={v => updateEvent(evt.id, { time: v })} placeholder="5:00 PM" />
                      </div>
                      <Field label="Venue" value={evt.venue} onChange={v => updateEvent(evt.id, { venue: v })} placeholder="The Grand Ballroom" />
                      <Field label="Address" value={evt.address} onChange={v => updateEvent(evt.id, { address: v })} placeholder="123 Main St, New York, NY" />
                      <Field label="Dress Code" value={evt.dressCode || ''} onChange={v => updateEvent(evt.id, { dressCode: v })} placeholder="Black Tie" />
                      <Field label="End Time" value={evt.endTime || ''} onChange={v => updateEvent(evt.id, { endTime: v })} placeholder="11:00 PM" />
                      <Field label="Description" value={evt.description || ''} onChange={v => updateEvent(evt.id, { description: v })} placeholder="Brief description of this event…" />

                      {/* Ceremony Details sub-section — shown for ceremony-type events */}
                      {evt.type === 'ceremony' && (
                        <div style={{ marginTop: '0.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted, #9A9488)', marginBottom: '0.6rem', opacity: 0.7 }}>
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
                        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(109,89,122,0.2)', background: 'rgba(109,89,122,0.06)', color: 'var(--pl-plum, #6D597A)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
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
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '14px', border: '1.5px dashed rgba(163,177,138,0.3)', background: 'transparent', color: 'var(--pl-olive)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s' }}
        onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.08)'; }}
        onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <Plus size={13} /> Add Event
      </button>

      {/* Add to Calendar */}
      {events.length > 0 && subdomain && (
        <div style={{
          marginTop: '8px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255,255,255,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{
            fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--pl-muted)',
            display: 'flex', alignItems: 'center', gap: '6px',
            marginBottom: '2px',
          }}>
            <Calendar size={11} />
            Add to Calendar
          </div>

          {/* Download .ics */}
          <a
            href={`/api/calendar/${subdomain}`}
            download="event.ics"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              padding: '10px 14px', borderRadius: '8px',
              border: '1px solid rgba(163,177,138,0.35)',
              background: 'rgba(163,177,138,0.10)',
              color: 'var(--pl-olive, #A3B18A)',
              fontSize: '0.84rem', fontWeight: 700,
              letterSpacing: '0.03em',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.20)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.10)'; }}
          >
            <Calendar size={13} />
            Download .ics (Apple / Outlook)
          </a>

          {/* Google Calendar */}
          {buildGoogleCalendarUrl() && (
            <a
              href={buildGoogleCalendarUrl()!}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                padding: '10px 14px', borderRadius: '8px',
                border: '1px solid rgba(109,89,122,0.35)',
                background: 'rgba(109,89,122,0.10)',
                color: 'var(--pl-plum, #6D597A)',
                fontSize: '0.84rem', fontWeight: 700,
                letterSpacing: '0.03em',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(109,89,122,0.20)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(109,89,122,0.10)'; }}
            >
              <Calendar size={13} />
              Add to Google Calendar
            </a>
          )}
        </div>
      )}
    </div>
  );
}
