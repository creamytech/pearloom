'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx ScheduleEditor
   — now host-editable: add a moment, edit time/title/location per row,
   remove a row. Writes manifest.events[] which ThemedSite's
   ScheduleBlock reads. */

import type { StoryManifest, WeddingEvent } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, FSuggest, PearChip, SectionPanelShell, useCopyOverride } from './_section-atoms';
import { scheduleEventSuggestions } from './_suggestions';

const TONE_BY_INDEX: Array<'peach' | 'lavender' | 'sage'> = ['peach', 'lavender', 'sage', 'peach', 'lavender', 'sage'];

const DEFAULT_EVENTS: WeddingEvent[] = [
  { id: 'e-ceremony', name: 'Ceremony', type: 'ceremony', date: '', time: '4:30 pm', venue: 'Clifftop', address: '' },
  { id: 'e-cocktails', name: 'Cocktails', type: 'other', date: '', time: '5:30 pm', venue: 'Caldera terrace', address: '' },
  { id: 'e-dinner', name: 'Dinner', type: 'reception', date: '', time: '7:00 pm', venue: 'Long table', address: '' },
  { id: 'e-dancing', name: 'Dancing', type: 'other', date: '', time: '9:00 pm', venue: 'Until late', address: '' },
];

export function SchedulePanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const eventNameSet = scheduleEventSuggestions(occasion);
  const events = manifest.events && manifest.events.length > 0 ? manifest.events : DEFAULT_EVENTS;
  const [scheduleEyebrow, setScheduleEyebrow] = useCopyOverride(manifest, onChange, 'scheduleEyebrow');

  const writeEvents = (next: WeddingEvent[]) => onChange({ ...manifest, events: next } as StoryManifest);
  const patchEvent = (i: number, patch: Partial<WeddingEvent>) => {
    const next = events.map((e, idx) => idx === i ? { ...e, ...patch } : e);
    writeEvents(next);
  };
  const removeEvent = (i: number) => writeEvents(events.filter((_, idx) => idx !== i));
  const addEvent = () => writeEvents([
    ...events,
    {
      id: `e-${Date.now()}`,
      name: 'New moment',
      type: 'other',
      date: '',
      time: '',
      venue: '',
      address: '',
    },
  ]);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
          <FInput value={scheduleEyebrow} onChange={setScheduleEyebrow} placeholder="The day" />
        </FGroup>
        <FGroup label={`Timeline · ${events.length} moments`} action={<PearChip>Build from notes</PearChip>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.map((e, i) => {
              const tone = TONE_BY_INDEX[i % TONE_BY_INDEX.length];
              return (
                <div key={e.id ?? i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: `var(--${tone}-2)`, display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 4 }}>
                    <Icon name="clock" size={14} color="#3D4A1F" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <FSuggest
                      value={e.name ?? ''}
                      onChange={(v) => patchEvent(i, { name: v })}
                      placeholder="Ceremony"
                      options={eventNameSet.options}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: 6 }}>
                      <FInput value={e.time ?? ''} onChange={(v) => patchEvent(i, { time: v })} placeholder="4:30 pm" />
                      <FInput value={e.venue ?? ''} onChange={(v) => patchEvent(i, { venue: v })} placeholder="Olive grove" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEvent(i)}
                    aria-label={`Remove ${e.name}`}
                    style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', marginTop: 6 }}
                  >
                    <Icon name="close" size={12} />
                  </button>
                </div>
              );
            })}
            <AddCard label="Add a moment" onClick={addEvent} />
          </div>
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default SchedulePanel;
