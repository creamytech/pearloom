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

import { useMemo, useState, type ReactNode } from 'react';
import type { StoryManifest, WeddingEvent } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, FSuggest, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';
import { moveItem, ReorderHandle, swapItems } from './_reorder';
import { scheduleEventSuggestions, typicalTimeFor } from './_suggestions';
import { DraftedBadge } from './_drafted-badge';
import { clearDraftedPath } from '@/lib/first-pressing/clear-on-edit';
import { pearErrorMessage } from '../../redesign/PearAssist';
import { occasionCopyFor } from '../../redesign/occasion-copy';

const TONE_BY_INDEX: Array<'peach' | 'lavender' | 'sage'> = ['peach', 'lavender', 'sage', 'peach', 'lavender', 'sage'];

/* Starter rows match the canvas's editor demo timeline exactly —
   both sides read occasionCopyFor(occasion).scheduleDemo (the
   panel used to say 'Clifftop' while the canvas previewed 'Olive
   grove' — two competing fictions; and a memorial no longer opens
   on a wedding ceremony). */
function defaultEventsFor(occasion?: string): WeddingEvent[] {
  return occasionCopyFor(occasion).scheduleDemo.map((row, i): WeddingEvent => ({
    id: `e-demo-${i}`,
    name: row.l,
    /* 'ceremony' only when the row IS the ceremony — everything
       else stays the generic type the schema allows. */
    type: /^(ceremony|service|mass)$/i.test(row.l) ? 'ceremony' : 'other',
    date: '',
    time: row.t,
    venue: row.s,
    address: '',
  }));
}

/* ─── Occasion timeline templates ─────────────────────────────
   One-tap starting timelines keyed by template family. Shown only
   while the schedule is empty or still exactly the untouched
   occasion-demo seed — once the host edits anything, the affordance
   disappears. Occasion ids come from EVENT_TYPES
   (src/lib/event-os/event-types.ts); aliases below map related
   occasions onto the same template. */

type TimelineSeed = { name: string; time: string; type: WeddingEvent['type'] };

const TIMELINE_TEMPLATES: Record<string, { label: string; seeds: TimelineSeed[] }> = {
  wedding: {
    label: 'Wedding day',
    seeds: [
      { name: 'Ceremony', time: '4:00 pm', type: 'ceremony' },
      { name: 'Cocktail hour', time: '5:00 pm', type: 'other' },
      { name: 'Dinner', time: '6:30 pm', type: 'reception' },
      { name: 'Dancing', time: '8:30 pm', type: 'other' },
      { name: 'Send-off', time: '11:00 pm', type: 'other' },
    ],
  },
  birthday: {
    label: 'Birthday',
    seeds: [
      { name: 'Arrivals', time: '6:00 pm', type: 'other' },
      { name: 'Toasts', time: '7:00 pm', type: 'other' },
      { name: 'Cake', time: '8:00 pm', type: 'other' },
      { name: 'Dancing', time: '8:30 pm', type: 'other' },
    ],
  },
  memorial: {
    label: 'Memorial',
    seeds: [
      { name: 'Gathering', time: '10:00 am', type: 'other' },
      { name: 'Service', time: '11:00 am', type: 'ceremony' },
      { name: 'Reception', time: '12:30 pm', type: 'reception' },
    ],
  },
  reunion: {
    label: 'Reunion',
    seeds: [
      { name: 'Arrivals', time: '4:00 pm', type: 'other' },
      { name: 'Dinner', time: '6:00 pm', type: 'reception' },
      { name: 'Stories', time: '8:00 pm', type: 'other' },
      { name: 'Group photo', time: '9:00 pm', type: 'other' },
    ],
  },
  shower: {
    label: 'Shower',
    seeds: [
      { name: 'Arrivals', time: '1:00 pm', type: 'other' },
      { name: 'Games', time: '1:45 pm', type: 'other' },
      { name: 'Gifts', time: '2:30 pm', type: 'other' },
      { name: 'Cake', time: '3:30 pm', type: 'other' },
    ],
  },
};

/* manifest.occasion → template key. Related occasions share a
   template; anything unlisted just gets the full menu with no
   highlighted match. */
const OCCASION_TEMPLATE_KEY: Record<string, string> = {
  'wedding': 'wedding',
  'vow-renewal': 'wedding',
  'engagement': 'wedding',
  'birthday': 'birthday',
  'milestone-birthday': 'birthday',
  'first-birthday': 'birthday',
  'sweet-sixteen': 'birthday',
  'memorial': 'memorial',
  'funeral': 'memorial',
  'reunion': 'reunion',
  'baby-shower': 'shower',
  'bridal-shower': 'shower',
};

/* True while the host hasn't touched the timeline — either no
   events saved yet, or the saved rows still exactly match the
   untouched occasion-demo seed. */
function isUntouchedSchedule(saved: WeddingEvent[] | undefined, defaults: WeddingEvent[]): boolean {
  if (!saved || saved.length === 0) return true;
  if (saved.length !== defaults.length) return false;
  return saved.every((e, i) => {
    const d = defaults[i];
    return e.id === d.id && e.name === d.name && e.time === d.time && e.venue === d.venue && (e.day ?? 1) === 1;
  });
}

/* Pure id mint — next numeric suffix above every existing `e-N`
   row. A pure function of the rows keeps the React Compiler's
   render-purity analysis happy where `Date.now()` ids would not
   (it can't always prove these callbacks are event handlers). */
function mintEventId(existing: WeddingEvent[]): string {
  let max = 0;
  for (const e of existing) {
    const m = /^e-(\d+)$/.exec(e.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `e-${max + 1}`;
}

export function SchedulePanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'schedule');
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const eventNameSet = scheduleEventSuggestions(occasion);
  /* Memoized — occasionCopyFor reads getter-backed packs, which
     the React Compiler flags as impure when called bare in render;
     useMemo keeps the seed stable and the component compilable. */
  const defaultEvents = useMemo(() => defaultEventsFor(occasion), [occasion]);
  const events = manifest.events && manifest.events.length > 0 ? manifest.events : defaultEvents;
  const [scheduleEyebrow, setScheduleEyebrow] = useCopyOverride(manifest, onChange, 'scheduleEyebrow');

  /* Multi-day mode flips on automatically when any event has
     day > 1. Toggling it on assigns every existing event to day 1
     so the grouping shows immediately; toggling off clears all
     day fields. */
  const maxDay = events.reduce((m, e) => Math.max(m, e.day ?? 1), 1);
  const multiDay = maxDay > 1;

  const writeEvents = (next: WeddingEvent[]) => onChange({ ...manifest, events: next } as StoryManifest);
  /* Template affordance — only while the timeline is pristine.
     One tap replaces the seed with the picked template via the
     same events write path as every other edit. */
  const showTemplates = isUntouchedSchedule(manifest.events, defaultEvents);
  const applyTemplate = (key: string) => {
    const tpl = TIMELINE_TEMPLATES[key];
    if (!tpl) return;
    writeEvents(tpl.seeds.map((s, i) => ({
      id: `e-tpl-${Date.now().toString(36)}-${i}`,
      name: s.name,
      type: s.type,
      date: '',
      time: s.time,
      venue: '',
      address: '',
    })));
  };
  const patchEventByIndex = (i: number, patch: Partial<WeddingEvent>) => {
    const next = events.map((e, idx) => idx === i ? { ...e, ...patch } : e);
    let m = { ...manifest, events: next } as StoryManifest;
    /* Editing the blurb Pear drafted makes it the host's — drop the
       badge for this moment. */
    if ('description' in patch) m = clearDraftedPath(m, `events.${i}.description`);
    onChange(m);
  };
  const removeEventByIndex = (i: number) => writeEvents(events.filter((_, idx) => idx !== i));
  const addEvent = (day?: number) => writeEvents([
    ...events,
    {
      id: mintEventId(events),
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
        id: mintEventId(events),
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

  /* "Pear drafted this" badge for a moment's blurb, by flat index —
     shared by the single-day and multi-day rows. Clear empties the
     blurb + drops the badge (one undoable onChange). */
  const descBadge = (flatIndex: number) => (
    <DraftedBadge
      manifest={manifest}
      onChange={onChange}
      paths={`events.${flatIndex}.description`}
      onClear={(m) => {
        const cur = (m.events && m.events.length > 0 ? m.events : events);
        return { ...(m as StoryManifest), events: cur.map((ev, idx) => idx === flatIndex ? { ...ev, description: '' } : ev) } as StoryManifest;
      }}
    />
  );

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* ── Zip ScheduleEditor layout (section-fields.jsx L208-230):
              a single "Timeline · N moments" group — drag-handle +
              clock-tone row with "time · sublocation", an "Add a
              moment" card, and the Pear action in the group header.
              Multi-day grouping is the production superset; when the
              host turns it on (in "More" below) the same machinery
              swaps the flat list for per-day sections. The eyebrow,
              the multi-day toggle, and the visibility footer are all
              production-only, tucked under "More". */}
        {!multiDay && showTemplates && (
          <TemplateStrip occasion={occasion} onPick={applyTemplate} />
        )}

        {!multiDay && (
          <FGroup label={`Timeline · ${events.length} moments`} action={<BuildFromNotesButton onAppend={(drafted) => writeEvents([...events, ...drafted])} />}>
            <MiniTimeline events={events} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map((e, i) => <ScheduleRow
                key={e.id ?? i}
                event={e}
                tone={TONE_BY_INDEX[i % TONE_BY_INDEX.length]}
                eventNames={eventNameSet.options}
                onPatch={(p) => patchEventByIndex(i, p)}
                onRemove={() => removeEventByIndex(i)}
                badge={descBadge(i)}
                reorder={(
                  /* Reorder never mints ids — rows travel with the
                     id mintEventId gave them. */
                  <ReorderHandle
                    index={i}
                    count={events.length}
                    label={e.name || 'moment'}
                    onMove={(from, to) => writeEvents(moveItem(events, from, to))}
                  />
                )}
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
                    badge={descBadge(item.i)}
                    reorder={(
                      /* Within-day move — the neighbors in this day
                         group may not be adjacent in the flat
                         events[] array, so this SWAPS the two flat
                         positions (each row keeps its own `day`). */
                      <ReorderHandle
                        index={j}
                        count={rows.length}
                        label={item.e.name || 'moment'}
                        onMove={(fromJ, toJ) => {
                          const other = rows[toJ];
                          if (!other) return;
                          writeEvents(swapItems(events, item.i, other.i));
                        }}
                      />
                    )}
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

        <details className="pl-panel-more">
          <summary
            style={{
              cursor: 'pointer', listStyle: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em',
              textTransform: 'uppercase', color: 'var(--ink-muted)',
            }}
          >
            <Icon name="chev-down" size={12} /> More, eyebrow, multi-day, visibility
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
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
                  {multiDay ? `${maxDay} days set up` : 'Groups your timeline by day, for weekends and trips.'}
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
          </div>
        </details>

        {/* Outside the More disclosure — the other seven section
            panels keep the hide-this-section affordance always
            visible; burying it here made Schedule the odd one out. */}
        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Schedule" />
      </div>
    </SectionPanelShell>
  );
}

/* ─── TemplateStrip ───────────────────────────────────────────
   "Start from a template" — a quiet card of one-tap timeline
   starters shown only while the schedule is pristine. The
   occasion-matched template sorts first and gets the filled
   peach treatment; the rest render as outline pills. */
function TemplateStrip({ occasion, onPick }: { occasion?: string; onPick: (key: string) => void }) {
  const matchKey = occasion ? OCCASION_TEMPLATE_KEY[occasion] : undefined;
  const keys = Object.keys(TIMELINE_TEMPLATES)
    .sort((a, b) => (a === matchKey ? -1 : 0) - (b === matchKey ? -1 : 0));
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 10,
      background: 'var(--cream-2)', border: '1px solid var(--line-soft)',
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
        Start from a template
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1, marginBottom: 8 }}>
        One tap drops in a starting timeline, every moment stays editable.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {keys.map((key) => {
          const isMatch = key === matchKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 999,
                background: isMatch ? 'var(--peach-ink)' : 'var(--peach-bg)',
                color: isMatch ? '#fff' : 'var(--peach-ink)',
                border: isMatch ? '1px solid var(--peach-ink)' : '1px solid rgba(198,112,61,0.22)',
                fontSize: 11, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isMatch && <Icon name="sparkles" size={11} color="#fff" />}
              {TIMELINE_TEMPLATES[key].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Single row — name + time + venue + remove. */
function ScheduleRow({
  event: e, tone, eventNames, onPatch, onRemove, reorder, badge,
}: {
  event: WeddingEvent;
  tone: 'peach' | 'lavender' | 'sage';
  eventNames: string[];
  onPatch: (p: Partial<WeddingEvent>) => void;
  onRemove: () => void;
  /** Shared ReorderHandle from the parent (it owns the list write). */
  reorder?: ReactNode;
  /** "Pear drafted this" badge for the blurb — parent builds it with
   *  the moment's flat index. */
  badge?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 4 }}>
        <span style={{ width: 32, height: 32, borderRadius: 8, background: `var(--${tone}-2)`, display: 'grid', placeItems: 'center' }}>
          <Icon name="clock" size={14} color="#3D4A1F" />
        </span>
        {reorder}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <FSuggest
          value={e.name ?? ''}
          onChange={(v) => onPatch({ name: v })}
          onPick={(opt) => {
            /* Picking a suggested moment pre-fills a typical time
               when the time field is still empty — one tap fills
               the row, the host just nudges the clock. */
            const t = typicalTimeFor(opt);
            if (t && !(e.time ?? '').trim()) onPatch({ name: opt, time: t });
            else onPatch({ name: opt });
          }}
          placeholder="Ceremony"
          options={eventNames}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: 6 }}>
          <FInput value={e.time ?? ''} onChange={(v) => onPatch({ time: v })} placeholder="4:30 pm" />
          <FInput value={e.venue ?? ''} onChange={(v) => onPatch({ venue: v })} placeholder="Olive grove" />
        </div>
        {/* Optional quiet note rendered under the time/venue line on
            the canvas (WeddingEvent.description). */}
        <FInput
          value={e.description ?? ''}
          onChange={(v) => onPatch({ description: v })}
          placeholder="A note for guests, “unplugged ceremony”, “cash bar”… (optional)"
        />
        {badge}
        {/* Street address → a "Directions" link on the published
            row. Venue above is the display name; this is the part
            Maps can route to. */}
        <FInput
          value={e.address ?? ''}
          onChange={(v) => onPatch({ address: v })}
          placeholder="Address, adds a Directions link (optional)"
        />
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

/* ─── BuildFromNotesButton ────────────────────────────────────
   "Build from notes" chip that opens a small textarea inline.
   Host pastes a paragraph; Pear extracts a chronological
   timeline via /api/schedule/from-notes. */

function BuildFromNotesButton({ onAppend }: { onAppend: (events: WeddingEvent[]) => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function draft() {
    if (!notes.trim() || busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/schedule/from-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[schedule] from-notes failed:', res.status);
        throw new Error((j as { error?: string }).error ?? 'Pear couldn’t draft that one, try again?');
      }
      const data = await res.json() as { events?: Array<{ name: string; time: string; venue?: string }> };
      const drafted: WeddingEvent[] = (data.events ?? []).map((e, i) => ({
        id: `e-ai-${Date.now().toString(36)}-${i}`,
        name: e.name,
        type: 'other',
        date: '',
        time: e.time,
        venue: e.venue ?? '',
        address: '',
      }));
      if (drafted.length === 0) {
        setErr('Pear couldn’t pull moments out of that. Try a bit more detail.');
      } else {
        onAppend(drafted);
        setNotes('');
        setOpen(false);
      }
    } catch (e) {
      console.error('[schedule] from-notes error:', e);
      setErr(pearErrorMessage(e, 'Pear couldn’t draft that one, try again?'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 999,
          background: open ? 'var(--peach-ink)' : 'var(--peach-bg)',
          color: open ? '#fff' : 'var(--peach-ink)',
          border: open ? '1px solid var(--peach-ink)' : '1px solid rgba(198,112,61,0.22)',
          fontSize: 11, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Icon name="sparkles" size={11} color={open ? '#fff' : 'var(--peach-ink)'} />
        Build from notes
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 320, padding: 12, zIndex: 30,
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          boxShadow: '0 14px 38px rgba(40,28,12,0.16)',
        }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--peach-ink)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        Build from notes
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 8, lineHeight: 1.4 }}>
        Paste your run-of-show, an email from your planner, or your own notes. Pear will pull out the moments.
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
        placeholder="Ceremony at 4:30 in the olive grove. Cocktails after on the terrace, then long-table dinner around 7, dancing until late…"
        style={{
          width: '100%', padding: 8, borderRadius: 8,
          border: '1px solid var(--line)', background: 'var(--cream-2)',
          fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--font-ui)',
          outline: 'none', resize: 'vertical', lineHeight: 1.5,
        }}
      />
      {err && (
        <div style={{ marginTop: 6, padding: '5px 9px', borderRadius: 6, background: 'rgba(122,45,45,0.08)', fontSize: 11, color: '#7A2D2D' }}>
          {err}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button
          type="button"
          onClick={draft}
          disabled={!notes.trim() || busy}
          style={{
            flex: 1, padding: '7px 12px', borderRadius: 999,
            background: 'var(--peach-ink)', color: '#fff',
            border: 'none', fontSize: 11.5, fontWeight: 700,
            cursor: notes.trim() && !busy ? 'pointer' : 'not-allowed',
            opacity: notes.trim() && !busy ? 1 : 0.55,
          }}
        >
          {busy ? 'Drafting…' : 'Draft moments'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setNotes(''); setErr(null); }}
          style={{
            padding: '7px 12px', borderRadius: 999,
            background: 'transparent', border: '1px solid var(--line)',
            fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
        </div>
      )}
    </span>
  );
}

/* ─── MiniTimeline ────────────────────────────────────────────
   Horizontal preview strip above the event list. Each event is
   a small lavender dot positioned by parsed time, with the
   event name above. Visualizes the day-shape before the host
   even saves. Falls back to evenly-spaced dots when times can't
   be parsed.

   Parses "4:30 pm", "16:30", "4 pm" — anything Date.parse can
   make sense of when prefixed with a dummy date. */

function parseTimeOfDay(time: string): number | null {
  if (!time?.trim()) return null;
  /* Match hh[:mm] [am|pm] with optional minutes. */
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(time.trim());
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3]?.toLowerCase();
  if (meridiem === 'pm' && h < 12) h += 12;
  if (meridiem === 'am' && h === 12) h = 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h + min / 60;
}

function MiniTimeline({ events }: { events: WeddingEvent[] }) {
  if (events.length < 2) return null;
  const parsed = events.map((e) => ({ event: e, hours: parseTimeOfDay(e.time ?? '') }));
  const withTimes = parsed.filter((p) => p.hours !== null);
  /* Need at least 2 events with valid times to plot a meaningful
     timeline; otherwise the visualization adds no information. */
  if (withTimes.length < 2) return null;
  const minH = Math.min(...withTimes.map((p) => p.hours!));
  const maxH = Math.max(...withTimes.map((p) => p.hours!));
  const span = Math.max(1, maxH - minH);
  return (
    <div style={{
      marginBottom: 12, padding: '12px 10px 6px',
      borderRadius: 10,
      background: 'var(--cream-2)',
      border: '1px solid var(--line-soft)',
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
        Day shape
      </div>
      <div style={{ position: 'relative', height: 28 }}>
        {/* baseline */}
        <div style={{
          position: 'absolute',
          left: 8, right: 8, top: 14,
          height: 2, borderRadius: 1,
          background: 'var(--line)',
        }} />
        {/* event dots */}
        {parsed.map((p, i) => {
          if (p.hours === null) return null;
          const pct = ((p.hours - minH) / span) * 100;
          return (
            <div
              key={p.event.id ?? i}
              title={`${p.event.time} · ${p.event.name}`}
              style={{
                position: 'absolute',
                left: `calc(${pct}% - 4px + 8px * (1 - ${pct / 100}) - 4px * ${pct / 100})`,
                top: 10,
                width: 10, height: 10, borderRadius: '50%',
                background: 'var(--lavender-ink)',
                border: '2px solid var(--cream-2)',
                boxShadow: '0 0 0 1px var(--lavender-ink)',
              }}
            />
          );
        })}
      </div>
      {/* Range labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: 'var(--ink-muted)',
        marginTop: 4, fontVariantNumeric: 'tabular-nums',
      }}>
        <span>{formatHour(minH)}</span>
        <span>{formatHour(maxH)}</span>
      </div>
    </div>
  );
}

function formatHour(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  const display = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const meridiem = hours >= 12 ? 'pm' : 'am';
  return mins === 0 ? `${display} ${meridiem}` : `${display}:${String(mins).padStart(2, '0')} ${meridiem}`;
}
