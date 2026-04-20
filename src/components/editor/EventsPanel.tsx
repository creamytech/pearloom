'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EventsPanel.tsx — Organic glass event editor
// Uses the shared editor/panel primitives for consistent chrome
// across the editor.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, ChevronDown, Calendar, Copy } from 'lucide-react';
import { CalendarHeartIcon } from '@/components/icons/PearloomIcons';
import { Field } from './editor-utils';
import { useEditor } from '@/lib/editor-state';
import { makeId } from '@/lib/editor-ids';
import {
  PanelRoot,
  PanelSection,
  PanelChip,
  eventTypeColors,
  getEventTypeColor,
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
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

// ── Time helpers (Item #59) ───────────────────────────────────
// Parses human-friendly times ("5:00 PM", "17:00") into minutes-from-midnight.
// Returns null when the string is empty or unparseable so callers can no-op.
function parseTimeToMinutes(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim();
  // 12-hour form: "5:00 PM", "5 pm", "12:30 am"
  const twelve = /^(\d{1,2})(?::(\d{2}))?\s*([apAP])\.?\s*[mM]?\.?$/;
  const m12 = s.match(twelve);
  if (m12) {
    let hr = parseInt(m12[1], 10);
    const min = m12[2] ? parseInt(m12[2], 10) : 0;
    const pm = m12[3].toLowerCase() === 'p';
    if (hr === 12) hr = 0;
    if (pm) hr += 12;
    if (hr >= 24 || min >= 60) return null;
    return hr * 60 + min;
  }
  // 24-hour form: "17:00"
  const twentyFour = /^(\d{1,2}):(\d{2})$/;
  const m24 = s.match(twentyFour);
  if (m24) {
    const hr = parseInt(m24[1], 10);
    const min = parseInt(m24[2], 10);
    if (hr >= 24 || min >= 60) return null;
    return hr * 60 + min;
  }
  return null;
}

// Kept for future clamp-to-start+60 fallback behavior described in Item #59.
export function formatMinutesTo12h(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const min = mins % 60;
  const pm = h24 >= 12;
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(min).padStart(2, '0')} ${pm ? 'PM' : 'AM'}`;
}

export function EventsPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const { state } = useEditor();
  const subdomain = state.subdomain;
  const events = manifest.events || [];
  const [expandedId, setExpandedId] = useState<string | null>(events[0]?.id || null);
  // Item #59: track per-event end-time error state for inline feedback
  const [endTimeErrors, setEndTimeErrors] = useState<Record<string, string>>({});

  const addEvent = () => {
    const newEvent: WeddingEvent = {
      id: makeId('event'), name: 'New Event', type: 'other',
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

  // Item #60: duplicate an event; place copy immediately after original.
  const duplicateEvent = (id: string) => {
    const idx = events.findIndex(e => e.id === id);
    if (idx < 0) return;
    const original = events[idx];
    const copy: WeddingEvent = {
      ...original,
      id: makeId('event'),
      name: `${original.name || 'Event'} (Copy)`,
    };
    const next = [...events];
    next.splice(idx + 1, 0, copy);
    onChange({ ...manifest, events: next });
    setExpandedId(copy.id);
  };

  // Item #59: commit end time only if it's after start; otherwise surface error.
  const commitEndTime = (evt: WeddingEvent, raw: string) => {
    // Empty clears error + saves
    if (!raw) {
      updateEvent(evt.id, { endTime: '' });
      setEndTimeErrors(prev => { const n = { ...prev }; delete n[evt.id]; return n; });
      return;
    }
    const end = parseTimeToMinutes(raw);
    const start = parseTimeToMinutes(evt.time || '');
    if (end == null) {
      // Unparseable end time — allow free-form text (many users type "11 PM onward")
      // but clear any previous ordering error since we can't compare.
      updateEvent(evt.id, { endTime: raw });
      setEndTimeErrors(prev => { const n = { ...prev }; delete n[evt.id]; return n; });
      return;
    }
    if (start != null && end <= start) {
      // Block commit and show inline error
      setEndTimeErrors(prev => ({ ...prev, [evt.id]: 'End time must be after start time (use 5:00 PM or 17:00).' }));
      return;
    }
    setEndTimeErrors(prev => { const n = { ...prev }; delete n[evt.id]; return n; });
    updateEvent(evt.id, { endTime: raw });
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
                fontSize: panelText.itemTitle,
                fontWeight: panelWeight.bold,
                color: '#18181B',
                fontFamily: 'inherit',
                marginBottom: '4px',
                lineHeight: panelLineHeight.tight,
              }}>
                No events yet
              </div>
              <div style={{
                fontSize: panelText.hint,
                color: '#71717A',
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.snug,
                marginBottom: '12px',
              }}>
                Add ceremony, reception, and more
              </div>
              {/* Item 89: explicit CTA */}
              <motion.button
                onClick={addEvent}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '8px',
                  background: '#18181B', color: '#FAFAFA',
                  border: 'none', cursor: 'pointer',
                  fontSize: panelText.body,
                  fontWeight: panelWeight.semibold,
                  fontFamily: 'inherit',
                }}
              >
                <Plus size={13} /> Add your first event
              </motion.button>
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
                  overflow: 'hidden', transition: 'all var(--pl-dur-instant)',
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
                      fontSize: panelText.itemTitle,
                      fontWeight: panelWeight.semibold,
                      color: '#18181B',
                      fontFamily: 'inherit',
                      lineHeight: panelLineHeight.tight,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {evt.name || 'Event'}
                    </div>
                    <div style={{
                      fontSize: panelText.hint,
                      color: '#71717A',
                      fontFamily: 'inherit',
                      marginTop: '2px',
                      lineHeight: panelLineHeight.tight,
                    }}>
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
                          <Field label="Time" value={evt.time} onChange={v => updateEvent(evt.id, { time: v })} placeholder="5:00 PM or 17:00" />
                        </div>
                        <Field label="Venue" value={evt.venue} onChange={v => updateEvent(evt.id, { venue: v })} placeholder="The Grand Ballroom" />

                        {/* Optional fields — collapsed by default */}
                        <details style={{ marginTop: '2px' }}>
                          <summary style={{
                            fontSize: panelText.label,
                            fontWeight: panelWeight.bold,
                            letterSpacing: panelTracking.wider,
                            textTransform: 'uppercase',
                            color: '#71717A',
                            fontFamily: 'inherit',
                            lineHeight: panelLineHeight.tight,
                            cursor: 'pointer', padding: '6px 0', listStyle: 'none',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}>
                            <ChevronDown size={10} /> More details
                          </summary>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
                            <Field label="Address" value={evt.address} onChange={v => updateEvent(evt.id, { address: v })} placeholder="123 Main St" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                              <Field label="Dress Code" value={evt.dressCode || ''} onChange={v => updateEvent(evt.id, { dressCode: v })} placeholder="Black Tie" />
                              <div>
                                <Field
                                  label="End Time"
                                  value={evt.endTime || ''}
                                  onChange={v => {
                                    // Let users type freely; validate on blur.
                                    updateEvent(evt.id, { endTime: v });
                                  }}
                                  onBlur={() => commitEndTime(evt, evt.endTime || '')}
                                  placeholder="11:00 PM or 23:00"
                                />
                                {endTimeErrors[evt.id] && (
                                  <div
                                    role="alert"
                                    style={{
                                      marginTop: '4px',
                                      fontSize: panelText.hint,
                                      color: '#ef4444',
                                      fontFamily: 'inherit',
                                      lineHeight: panelLineHeight.tight,
                                    }}
                                  >
                                    {endTimeErrors[evt.id]}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Field label="Description" value={evt.description || ''} onChange={v => updateEvent(evt.id, { description: v })} rows={2} placeholder="Brief description…" />
                          </div>
                        </details>

                        {/* Actions row: Duplicate + Remove (Items #60 + existing) */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => duplicateEvent(evt.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '5px 10px', borderRadius: '6px',
                              border: '1px solid #E4E4E7',
                              background: '#F4F4F5',
                              color: '#18181B',
                              cursor: 'pointer',
                              fontSize: panelText.hint,
                              fontWeight: panelWeight.semibold,
                              fontFamily: 'inherit',
                              lineHeight: panelLineHeight.tight,
                            }}
                          >
                            <Copy size={10} /> Duplicate
                          </button>
                          <button
                            onClick={() => removeEvent(evt.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '5px 10px', borderRadius: '6px',
                              border: '1px solid rgba(239,68,68,0.25)',
                              background: 'rgba(239,68,68,0.06)',
                              color: '#e87a7a',
                              cursor: 'pointer',
                              fontSize: panelText.hint,
                              fontWeight: panelWeight.semibold,
                              fontFamily: 'inherit',
                              lineHeight: panelLineHeight.tight,
                            }}
                          >
                            <Trash2 size={10} /> Remove
                          </button>
                        </div>
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
            whileHover={{ y: -1, borderColor: '#18181B' }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px', borderRadius: '10px',
              border: '1.5px dashed #E4E4E7',
              background: '#FAFAFA', color: '#18181B',
              cursor: 'pointer',
              fontSize: panelText.body,
              fontWeight: panelWeight.bold,
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
              transition: 'all var(--pl-dur-instant)',
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
                  padding: '8px', borderRadius: '8px',
                  background: '#F4F4F5', border: '1px solid #E4E4E7',
                  color: '#18181B',
                  fontSize: panelText.body,
                  fontWeight: panelWeight.bold,
                  fontFamily: 'inherit',
                  lineHeight: panelLineHeight.tight,
                  textDecoration: 'none', transition: 'background var(--pl-dur-instant)',
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
                  textDecoration: 'none', transition: 'background var(--pl-dur-instant)',
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
