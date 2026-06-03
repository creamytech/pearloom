'use client';

/* eslint-disable no-restricted-syntax */
/* SchedulePanel — host-editable timeline with MULTI-DAY support.
   For single-day events the panel reads like a flat list; once
   the host turns on multi-day mode (or the manifest has any
   event with day>1), the rows group under "Day N" headers with
   per-day add buttons.

   Writes WeddingEvent[] where each entry carries optional
   day: number (1-indexed). The canvas renders the same grouping
   when 2+ days are present. */

import type { StoryManifest, WeddingEvent } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, FSuggest, PearChip, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';
import { scheduleEventSuggestions } from './_suggestions';

const TONE_BY_INDEX: Array<'peach' | 'lavender' | 'sage'> = ['peach', 'lavender', 'sage', 'peach', 'lavender', 'sage'];

const DEFAULT_EVENTS: WeddingEvent[] = [
  { id: 'e-ceremony', name: 'Ceremony', type: 'ceremony', date: '', time: '4:30 pm', venue: 'Clifftop', address: '' },
  { id: 'e-cocktails', name: 'Cocktails', type: 'other', date: '', time: '5:30 pm', venue: 'Caldera terrace', address: '' },
  { id: 'e-dinner', name: 'Dinner', type: 'reception', date: '', time: '7:00 pm', venue: 'Long table', address: '' },
  { id: 'e-dancing', name: 'Dancing', type: 'other', date: '', time: '9:00 pm', venue: 'Until late', address: '' },
];

export function SchedulePanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'schedule');
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const eventNameSet = scheduleEventSuggestions(occasion);
  const events = manifest.events && manifest.events.length > 0 ? manifest.events : DEFAULT_EVENTS;
  const [scheduleEyebrow, setScheduleEyebrow] = useCopyOverride(manifest, onChange, 'scheduleEyebrow');

  /* Multi-day mode flips on automatically when any event has
     day > 1. Toggling it on assigns every existing event to day 1
     so the grouping shows immediately; toggling off clears all
     day fields. */
  const maxDay = events.reduce((m, e) => Math.max(m, e.day ?? 1), 1);
  const multiDay = maxDay > 1;

  const writeEvents = (next: WeddingEvent[]) => onChange({ ...manifest, events: next } as StoryManifest);
  const patchEventByIndex = (i: number, patch: Partial<WeddingEvent>) => {
    const next = events.map((e, idx) => idx === i ? { ...e, ...patch } : e);
    writeEvents(next);
  };
  const removeEventByIndex = (i: number) => writeEvents(events.filter((_, idx) => idx !== i));
  const addEvent = (day?: number) => writeEvents([
    ...events,
    {
      id: `e-${Date.now()}`,
      name: 'New moment',
      type: 'other',
      date: '',
      time: '',
      venue: '',
      address: '',
      day: day ?? (multiDay ? maxDay : undefined),
    },
  ]);
  const addNewDay = () => {
    /* Adding "Day N+1" — seed with one starter row so the new
       section isn't an empty stub. */
    const nextDay = maxDay + 1;
    writeEvents([
      ...events.map((e) => ({ ...e, day: e.day ?? 1 })),
      {
        id: `e-${Date.now()}`,
        name: 'First moment',
        type: 'other',
        date: '',
        time: '',
        venue: '',
        address: '',
        day: nextDay,
      },
    ]);
  };
  const removeDay = (d: number) => {
    /* Removes all events on a day + shifts higher-day numbers
       down so we don't leave gaps. */
    const kept = events.filter((e) => (e.day ?? 1) !== d);
    const shifted = kept.map((e) => {
      const day = e.day ?? 1;
      return day > d ? { ...e, day: day - 1 } : e;
    });
    writeEvents(shifted);
  };
  const flipMultiDayOff = () => writeEvents(events.map((e) => {
    const { day: _drop, ...rest } = e;
    void _drop;
    return rest;
  }));

  /* Build a stable mapping from each event back to its original
     index in events[] so the per-row controls can patch the
     right entry after we sort by day. */
  const indexed = events.map((e, i) => ({ e, i }));
  const byDay = new Map<number, { e: WeddingEvent; i: number }[]>();
  for (const item of indexed) {
    const d = item.e.day ?? 1;
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(item);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => a - b);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
          <FInput value={scheduleEyebrow} onChange={setScheduleEyebrow} placeholder="The day" />
        </FGroup>

        {/* Multi-day toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 10,
          background: 'var(--cream-2)', border: '1px solid var(--line-soft)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
              Multi-day event
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>
              {multiDay ? `${maxDay} days set up` : 'Groups your timeline by day — for weekends and trips.'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => multiDay ? flipMultiDayOff() : addNewDay()}
            aria-pressed={multiDay}
            style={{
              width: 38, height: 22, borderRadius: 999,
              background: multiDay ? 'var(--sage-deep)' : 'var(--cream-3)',
              position: 'relative', flexShrink: 0,
              transition: 'background 160ms ease', cursor: 'pointer', border: 'none',
            }}
          >
            <span style={{
              position: 'absolute', top: 2.5,
              left: multiDay ? 18.5 : 2.5,
              width: 17, height: 17, borderRadius: '50%',
              background: '#fff',
              transition: 'left 160ms cubic-bezier(0.16,1,0.3,1)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>

        {!multiDay && (
          <FGroup label={`Timeline · ${events.length} moments`} action={<PearChip>Build from notes</PearChip>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map((e, i) => <ScheduleRow
                key={e.id ?? i}
                event={e}
                tone={TONE_BY_INDEX[i % TONE_BY_INDEX.length]}
                eventNames={eventNameSet.options}
                onPatch={(p) => patchEventByIndex(i, p)}
                onRemove={() => removeEventByIndex(i)}
              />)}
              <AddCard label="Add a moment" onClick={() => addEvent()} />
            </div>
          </FGroup>
        )}

        {multiDay && days.map((d) => {
          const rows = byDay.get(d) ?? [];
          return (
            <FGroup
              key={d}
              label={`Day ${d} · ${rows.length} moment${rows.length === 1 ? '' : 's'}`}
              action={(
                <button
                  type="button"
                  onClick={() => removeDay(d)}
                  aria-label={`Remove day ${d}`}
                  style={{
                    fontSize: 11, fontWeight: 600,
                    color: 'var(--ink-muted)',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', padding: '2px 6px',
                  }}
                >
                  Remove day
                </button>
              )}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rows.map((item, j) => (
                  <ScheduleRow
                    key={item.e.id ?? item.i}
                    event={item.e}
                    tone={TONE_BY_INDEX[j % TONE_BY_INDEX.length]}
                    eventNames={eventNameSet.options}
                    onPatch={(p) => patchEventByIndex(item.i, p)}
                    onRemove={() => removeEventByIndex(item.i)}
                  />
                ))}
                <AddCard label={`Add to day ${d}`} onClick={() => addEvent(d)} />
              </div>
            </FGroup>
          );
        })}

        {multiDay && (
          <button
            type="button"
            onClick={addNewDay}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1.5px dashed var(--peach-ink)',
              background: 'var(--peach-bg)',
              fontSize: 12, fontWeight: 600,
              color: 'var(--peach-ink)',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Icon name="plus" size={13} color="var(--peach-ink)" />
            Add day {maxDay + 1}
          </button>
        )}

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Schedule" />
      </div>
    </SectionPanelShell>
  );
}

/* Single row — name + time + venue + remove. */
function ScheduleRow({
  event: e, tone, eventNames, onPatch, onRemove,
}: {
  event: WeddingEvent;
  tone: 'peach' | 'lavender' | 'sage';
  eventNames: string[];
  onPatch: (p: Partial<WeddingEvent>) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
      <span style={{ width: 32, height: 32, borderRadius: 8, background: `var(--${tone}-2)`, display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 4 }}>
        <Icon name="clock" size={14} color="#3D4A1F" />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <FSuggest
          value={e.name ?? ''}
          onChange={(v) => onPatch({ name: v })}
          placeholder="Ceremony"
          options={eventNames}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: 6 }}>
          <FInput value={e.time ?? ''} onChange={(v) => onPatch({ time: v })} placeholder="4:30 pm" />
          <FInput value={e.venue ?? ''} onChange={(v) => onPatch({ venue: v })} placeholder="Olive grove" />
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${e.name}`}
        style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', marginTop: 6 }}
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  );
}

export default SchedulePanel;
