'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EventsPanel.tsx — Organic glass event editor
// Uses the shared editor/panel primitives for consistent chrome
// across the editor.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, ChevronDown, Calendar } from 'lucide-react';
import { CalendarHeartIcon } from '@/components/icons/PearloomIcons';
import { Field } from './editor-utils';
import { useEditor } from '@/lib/editor-state';
import {
  PanelRoot,
  PanelSection,
  PanelChip,
  eventTypeColors,
  getEventTypeColor,
  panelText,
  panelWeight,
} from './panel';
import type { StoryManifest, WeddingEvent } from '@/types';

export const EVENT_TYPE_OPTS: Array<{ type: WeddingEvent['type']; label: string; color: string }> = [
  { type: 'ceremony',      label: 'Ceremony',      color: eventTypeColors.ceremony },
  { type: 'reception',     label: 'Reception',     color: eventTypeColors.reception },
  { type: 'rehearsal',     label: 'Rehearsal',     color: eventTypeColors.rehearsal },
  { type: 'welcome-party', label: 'Welcome Party', color: eventTypeColors['welcome-party'] },
  { type: 'brunch',        label: 'Brunch',        color: eventTypeColors.brunch },
  { type: 'other',         label: 'Other',         color: eventTypeColors.other },
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
    <PanelRoot>
      <PanelSection
        title="Events"
        icon={CalendarHeartIcon}
        badge={events.length || undefined}
        hint="Ceremony, reception, rehearsal, and anything else your guests need to know about."
        card={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Empty state */}
          {events.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                textAlign: 'center', padding: '20px 16px',
                borderRadius: '12px', border: '1.5px dashed #E4E4E7',
                background: '#FAFAFA',
              }}
            >
              <CalendarHeartIcon size={22} style={{ opacity: 0.5, marginBottom: '8px', color: '#71717A' }} />
              <div style={{
                fontSize: '0.75rem', fontWeight: 600,
                color: '#3F3F46', marginBottom: '4px',
              }}>
                No events yet
              </div>
              <div style={{ fontSize: '0.65rem', color: '#71717A' }}>
                Add ceremony, reception, and more
              </div>
            </motion.div>
          )}

          {/* Event cards */}
          {events.map(evt => {
            const typeColor = getEventTypeColor(evt.type);
            const isExpanded = expandedId === evt.id;
            return (
              <motion.div
                key={evt.id}
                layout
                style={{
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  border: isExpanded ? `1.5px solid ${typeColor}` : '1px solid #E4E4E7',
                  overflow: 'hidden', transition: 'all 0.15s',
                }}
              >
                {/* Header — click to expand */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: typeColor, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#18181B',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {evt.name || 'Event'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#71717A', marginTop: '1px' }}>
                      {evt.time}{evt.venue ? ` · ${evt.venue}` : ''}
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ color: '#A1A1AA', display: 'flex' }}
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
                      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Event type — compact chip row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {EVENT_TYPE_OPTS.map(opt => {
                            const active = (evt.type || 'other') === opt.type;
                            return (
                              <PanelChip
                                key={opt.type}
                                active={active}
                                accentColor={opt.color}
                                onClick={() => updateEvent(evt.id, { type: opt.type })}
                                size="sm"
                                fullWidth={false}
                              >
                                {opt.label}
                              </PanelChip>
                            );
                          })}
                        </div>

                        {/* Essential fields */}
                        <Field label="Name" value={evt.name} onChange={v => updateEvent(evt.id, { name: v })} placeholder="Ceremony" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <DatePicker label="Date" value={evt.date || ''} onChange={d => updateEvent(evt.id, { date: d })} />
                          <Field label="Time" value={evt.time} onChange={v => updateEvent(evt.id, { time: v })} placeholder="5:00 PM" />
                        </div>
                        <Field label="Venue" value={evt.venue} onChange={v => updateEvent(evt.id, { venue: v })} placeholder="The Grand Ballroom" />

                        {/* Optional fields — collapsed by default */}
                        <details style={{ marginTop: '2px' }}>
                          <summary style={{
                            fontSize: '0.6rem', fontWeight: 600, color: '#A1A1AA',
                            cursor: 'pointer', padding: '4px 0', listStyle: 'none',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}>
                            <ChevronDown size={10} /> More details
                          </summary>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
                            <Field label="Address" value={evt.address} onChange={v => updateEvent(evt.id, { address: v })} placeholder="123 Main St" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                              <Field label="Dress Code" value={evt.dressCode || ''} onChange={v => updateEvent(evt.id, { dressCode: v })} placeholder="Black Tie" />
                              <Field label="End Time" value={evt.endTime || ''} onChange={v => updateEvent(evt.id, { endTime: v })} placeholder="11:00 PM" />
                            </div>
                            <Field label="Description" value={evt.description || ''} onChange={v => updateEvent(evt.id, { description: v })} rows={2} placeholder="Brief description…" />
                          </div>
                        </details>

                        {/* Remove */}
                        <button
                          onClick={() => removeEvent(evt.id)}
                          style={{
                            alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '5px 10px', borderRadius: '6px',
                            border: '1px solid rgba(239,68,68,0.2)',
                            background: 'rgba(239,68,68,0.05)', color: '#e87a7a',
                            cursor: 'pointer',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                          }}
                        >
                          <Trash2 size={10} /> Remove
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
            whileHover={{ y: -1, borderColor: '#A1A1AA' }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px', borderRadius: '10px',
              border: '1.5px dashed #E4E4E7',
              background: '#FAFAFA', color: '#18181B',
              cursor: 'pointer',
              fontSize: panelText.chip,
              fontWeight: panelWeight.semibold,
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
                  padding: '7px', borderRadius: '8px',
                  background: '#FAFAFA', border: '1px solid #E4E4E7',
                  color: '#3F3F46',
                  fontSize: panelText.hint,
                  fontWeight: panelWeight.semibold,
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
                  padding: '7px', borderRadius: '8px',
                  background: '#FAFAFA', border: '1px solid #E4E4E7',
                  color: '#3F3F46',
                  fontSize: panelText.hint,
                  fontWeight: panelWeight.semibold,
                  textDecoration: 'none', transition: 'background 0.12s',
                }}
              >
                <Calendar size={12} /> Google
              </a>
            </div>
          )}
        </div>
      </PanelSection>
    </PanelRoot>
  );
}
