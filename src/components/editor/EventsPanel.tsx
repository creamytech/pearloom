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
                textAlign: 'center', padding: '2rem 1rem',
                borderRadius: '10px', border: '1.5px dashed #E4E4E7',
                background: '#FFFFFF',
              }}
            >
              <CalendarHeartIcon size={24} style={{ opacity: 0.7, marginBottom: '8px', color: '#18181B' }} />
              <div style={{
                fontSize: '0.85rem', fontWeight: panelWeight.semibold, 
                fontFamily: 'inherit', color: '#71717A',
              }}>
                No events yet
              </div>
              <div style={{ fontSize: panelText.chip, color: '#71717A', marginTop: '4px' }}>
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
                  borderRadius: '10px',
                  background: isExpanded ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
                  border: isExpanded ? `1.5px solid ${typeColor}40` : '1px solid rgba(255,255,255,0.2)',
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
                    background: typeColor, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: panelText.body,
                      fontWeight: panelWeight.semibold,
                      color: '#18181B',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {evt.name || 'Event'}
                    </div>
                    <div style={{ fontSize: panelText.hint, color: '#71717A', marginTop: '1px' }}>
                      {evt.time}{evt.venue ? ` · ${evt.venue}` : ''}
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ color: '#71717A', display: 'flex' }}
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
                      <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Event type chips — uses the shared PanelChip so every
                            picker across the editor speaks the same visual language. */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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
                            padding: '5px 12px', borderRadius: '8px', border: 'none',
                            background: 'rgba(220,80,80,0.08)', color: '#d05050',
                            cursor: 'pointer',
                            fontSize: panelText.hint,
                            fontWeight: panelWeight.semibold,
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
            whileHover={{ y: -1, borderColor: '#E4E4E7' }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px', borderRadius: '8px',
              border: '1.5px dashed #E4E4E7',
              background: 'transparent', color: '#18181B',
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
                  padding: '8px', borderRadius: '10px',
                  background: '#FAFAFA', border: '1px solid #E4E4E7',
                  color: '#18181B',
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
                  padding: '8px', borderRadius: '10px',
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
