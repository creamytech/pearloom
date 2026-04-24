'use client';

import type { StoryManifest } from '@/types';
import { AddRowButton, EmptyBlockState, Field, PanelSection, SelectInput, TextArea, TextInput } from '../atoms';
import { SortableList, SortableRowCard } from '../sortable';

type ScheduleItem = {
  id: string;
  time: string;
  title: string;
  description?: string;
  tag?: 'Welcome' | 'Ceremony' | 'Reception' | 'Party' | 'Send-off';
};

const TAGS: Array<{ value: string; label: string }> = [
  { value: 'Welcome', label: 'Welcome' },
  { value: 'Ceremony', label: 'Ceremony' },
  { value: 'Reception', label: 'Reception' },
  { value: 'Party', label: 'Party' },
  { value: 'Send-off', label: 'Send-off' },
];

function getSchedule(manifest: StoryManifest): ScheduleItem[] {
  return ((manifest as unknown as { schedule?: ScheduleItem[] }).schedule ?? []) as ScheduleItem[];
}

export function SchedulePanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const items = getSchedule(manifest);

  function set(next: ScheduleItem[]) {
    onChange({ ...manifest, schedule: next } as unknown as StoryManifest);
  }

  function update(idx: number, patch: Partial<ScheduleItem>) {
    set(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function add() {
    set([
      ...items,
      { id: `evt-${Date.now().toString(36)}`, time: '4:00', title: 'New moment', description: '', tag: 'Reception' },
    ]);
  }

  function preset() {
    set([
      { id: 'evt-arrive', time: '3:30', title: 'Arrive & settle', description: 'Grab a drink, grab a seat.', tag: 'Welcome' },
      { id: 'evt-ceremony', time: '4:00', title: 'Ceremony', description: 'Forty minutes, give or take a few happy tears.', tag: 'Ceremony' },
      { id: 'evt-cocktail', time: '4:45', title: 'Cocktail hour', description: 'Signature drinks. Lawn games for the brave.', tag: 'Reception' },
      { id: 'evt-dinner', time: '6:00', title: 'Dinner', description: 'Family-style, local. Toasts from family.', tag: 'Reception' },
      { id: 'evt-dance', time: '8:30', title: 'First dance + open floor', description: 'The slow one, then the loud one.', tag: 'Party' },
      { id: 'evt-pie', time: '10:30', title: 'Late-night bites', description: "You'll be hungry again, promise.", tag: 'Party' },
      { id: 'evt-sendoff', time: '11:30', title: 'Send-off', description: 'Safe travels.', tag: 'Send-off' },
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
          items={items}
          onReorder={set}
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
          renderItem={(it, { handle }) => {
            const i = items.findIndex((x) => x.id === it.id);
            return (
              <SortableRowCard handle={handle} onDelete={() => set(items.filter((_, idx) => idx !== i))}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 130px', gap: 10 }}>
                  <Field label="Time">
                    <TextInput value={it.time} onChange={(e) => update(i, { time: e.target.value })} placeholder="4:00" />
                  </Field>
                  <Field label="Title">
                    <TextInput value={it.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Ceremony" />
                  </Field>
                  <Field label="Tag">
                    <SelectInput
                      value={it.tag ?? 'Reception'}
                      onChange={(v) => update(i, { tag: v as ScheduleItem['tag'] })}
                      options={TAGS}
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
