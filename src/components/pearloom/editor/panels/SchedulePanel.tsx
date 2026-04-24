'use client';

import type { StoryManifest, WeddingEvent } from '@/types';
import { AddRowButton, EmptyBlockState, Field, PanelSection, SelectInput, TextArea, TextInput } from '../atoms';
import { SortableList, SortableRowCard } from '../sortable';

// The canvas renderer reads `manifest.events` — keep this panel on
// the same shape so edits flow through. (Earlier versions wrote to
// `manifest.schedule` which the v8 renderer never read, so panel
// changes silently did nothing.)

const TYPE_OPTIONS: Array<{ value: WeddingEvent['type']; label: string }> = [
  { value: 'welcome-party', label: 'Welcome' },
  { value: 'rehearsal', label: 'Rehearsal' },
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'reception', label: 'Reception' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'other', label: 'Other' },
];

function getEvents(manifest: StoryManifest): WeddingEvent[] {
  const arr = (manifest as unknown as { events?: WeddingEvent[] }).events;
  return Array.isArray(arr) ? arr : [];
}

export function SchedulePanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const items = getEvents(manifest);

  function set(next: WeddingEvent[]) {
    onChange({ ...manifest, events: next.map((e, i) => ({ ...e, order: i })) } as unknown as StoryManifest);
  }

  function update(idx: number, patch: Partial<WeddingEvent>) {
    set(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function add() {
    set([
      ...items,
      {
        id: `evt-${Date.now().toString(36)}`,
        name: 'New moment',
        type: 'reception',
        date: manifest.logistics?.date ?? '',
        time: '4:00',
        venue: '',
        address: '',
        description: '',
        order: items.length,
      } as WeddingEvent,
    ]);
  }

  function preset() {
    const d = manifest.logistics?.date ?? '';
    set([
      { id: 'evt-arrive', name: 'Arrive & settle', type: 'welcome-party', date: d, time: '3:30', venue: '', address: '', description: 'Grab a drink, grab a seat.', order: 0 } as WeddingEvent,
      { id: 'evt-ceremony', name: 'Ceremony', type: 'ceremony', date: d, time: '4:00', venue: '', address: '', description: 'Forty minutes, give or take a few happy tears.', order: 1 } as WeddingEvent,
      { id: 'evt-cocktail', name: 'Cocktail hour', type: 'reception', date: d, time: '4:45', venue: '', address: '', description: 'Signature drinks. Lawn games for the brave.', order: 2 } as WeddingEvent,
      { id: 'evt-dinner', name: 'Dinner', type: 'reception', date: d, time: '6:00', venue: '', address: '', description: 'Family-style, local. Toasts from family.', order: 3 } as WeddingEvent,
      { id: 'evt-dance', name: 'First dance + open floor', type: 'reception', date: d, time: '8:30', venue: '', address: '', description: 'The slow one, then the loud one.', order: 4 } as WeddingEvent,
      { id: 'evt-pie', name: 'Late-night bites', type: 'reception', date: d, time: '10:30', venue: '', address: '', description: "You'll be hungry again, promise.", order: 5 } as WeddingEvent,
      { id: 'evt-sendoff', name: 'Send-off', type: 'other', date: d, time: '11:30', venue: '', address: '', description: 'Safe travels.', order: 6 } as WeddingEvent,
    ]);
  }

  return (
    <div>
      <PanelSection
        label="Today's rundown"
        hint="Drag to reorder. Times are free-form — '4:00', '4 PM', 'Sunset'."
        action={items.length > 0 ? <AddRowButton label="Add moment" onClick={add} /> : null}
      >
        <SortableList
          items={items as unknown as Array<{ id: string }>}
          onReorder={(next) => set(next as unknown as WeddingEvent[])}
          emptyState={
            <EmptyBlockState
              icon="clock"
              title="No schedule yet"
              body="Draft a starter schedule — you can edit every row, or start from scratch."
              action={
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={preset}>
                    Use wedding preset
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={add}>
                    Start empty
                  </button>
                </div>
              }
            />
          }
          renderItem={(itRaw, { handle }) => {
            const it = itRaw as unknown as WeddingEvent;
            const i = items.findIndex((x) => x.id === it.id);
            return (
              <SortableRowCard handle={handle} onDelete={() => set(items.filter((_, idx) => idx !== i))}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 130px', gap: 10 }}>
                  <Field label="Time">
                    <TextInput value={it.time ?? ''} onChange={(e) => update(i, { time: e.target.value })} placeholder="4:00" />
                  </Field>
                  <Field label="Title">
                    <TextInput value={it.name ?? ''} onChange={(e) => update(i, { name: e.target.value })} placeholder="Ceremony" />
                  </Field>
                  <Field label="Type">
                    <SelectInput
                      value={(it.type ?? 'reception') as string}
                      onChange={(v) => update(i, { type: v as WeddingEvent['type'] })}
                      options={TYPE_OPTIONS.map((o) => ({ value: o.value as string, label: o.label }))}
                    />
                  </Field>
                </div>
                <Field label="Short description">
                  <TextArea
                    rows={2}
                    value={it.description ?? ''}
                    onChange={(e) => update(i, { description: e.target.value })}
                    placeholder="Forty minutes, give or take a few happy tears."
                  />
                </Field>
              </SortableRowCard>
            );
          }}
        />
      </PanelSection>
    </div>
  );
}
