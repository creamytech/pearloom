'use client';

import type { StoryManifest, WeddingEvent } from '@/types';
import { AddRowButton, EmptyBlockState, Field, PanelSection, PanelSmartActions, SelectInput, TextArea, TextInput, type PanelSmartAction } from '../atoms';
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
    const occ = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
    const make = (id: string, name: string, type: WeddingEvent['type'], time: string, description: string): WeddingEvent => ({
      id, name, type, date: d, time, venue: '', address: '', description, order: 0,
    } as WeddingEvent);
    // Presets tuned to occasion. Single-person events use shorter
    // sequences; memorials are reverent; birthdays are punchy.
    let next: WeddingEvent[] = [];
    if (occ === 'memorial' || occ === 'funeral' || occ === 'celebration-life') {
      next = [
        make('evt-gather', 'Gathering', 'welcome-party', '10:30', 'Coffee, quiet, presence.'),
        make('evt-service', 'Service', 'ceremony', '11:00', 'Readings, music, a few words from family.'),
        make('evt-reception', 'Reception', 'reception', '12:30', 'Lunch in the hall. Stay as long as you like.'),
      ];
    } else if (occ === 'birthday' || occ === 'milestone-birthday' || occ === 'sweet-sixteen') {
      next = [
        make('evt-arrive', 'Doors open', 'welcome-party', '7:00', 'Drinks + first hellos.'),
        make('evt-dinner', 'Dinner', 'reception', '7:45', 'Family-style, long tables.'),
        make('evt-toast', 'Toasts', 'reception', '9:00', 'A few words from the people who know you best.'),
        make('evt-dance', 'Dance floor', 'reception', '9:30', 'Stay late.'),
      ];
    } else if (occ === 'baby-shower' || occ === 'bridal-shower') {
      next = [
        make('evt-brunch', 'Brunch', 'brunch', '11:00', 'Quiches, fruit, coffee.'),
        make('evt-games', 'Shower moments', 'reception', '12:15', 'Games, wishes, small rituals.'),
        make('evt-gifts', 'Gifts', 'reception', '1:00', 'Opening together. No rush.'),
      ];
    } else if (occ === 'retirement') {
      next = [
        make('evt-cocktails', 'Cocktails', 'welcome-party', '6:00', 'Arrive and say hello.'),
        make('evt-dinner', 'Dinner', 'reception', '7:00', 'Plated, stories between courses.'),
        make('evt-toasts', 'Toasts', 'reception', '8:30', "The good ones from people who've been there the longest."),
      ];
    } else if (occ === 'graduation') {
      next = [
        make('evt-ceremony', 'Ceremony', 'ceremony', '10:00', 'Walk across the stage. Brief, proud, loud.'),
        make('evt-lunch', 'Family lunch', 'reception', '12:30', 'Local spot, long table.'),
        make('evt-party', 'Open house', 'reception', '2:00', 'Drop by until 7. Food, cake, friends.'),
      ];
    } else if (occ === 'reunion') {
      next = [
        make('evt-meet', 'Friday mixer', 'welcome-party', '7:00', 'Name tags, drinks, a slideshow on loop.'),
        make('evt-dinner', 'Saturday dinner', 'reception', '6:30', 'Plated, reunion-committee speeches.'),
        make('evt-farewell', 'Sunday farewell brunch', 'brunch', '10:00', 'Coffee + last goodbyes.'),
      ];
    } else {
      // Default wedding-arc preset.
      next = [
        make('evt-arrive', 'Arrive & settle', 'welcome-party', '3:30', 'Grab a drink, grab a seat.'),
        make('evt-ceremony', 'Ceremony', 'ceremony', '4:00', 'Forty minutes, give or take a few happy tears.'),
        make('evt-cocktail', 'Cocktail hour', 'reception', '4:45', 'Signature drinks. Lawn games for the brave.'),
        make('evt-dinner', 'Dinner', 'reception', '6:00', 'Family-style, local. Toasts from family.'),
        make('evt-dance', 'First dance + open floor', 'reception', '8:30', 'The slow one, then the loud one.'),
        make('evt-pie', 'Late-night bites', 'reception', '10:30', "You'll be hungry again, promise."),
        make('evt-sendoff', 'Send-off', 'other', '11:30', 'Safe travels.'),
      ];
    }
    set(next);
  }

  const smartActions: PanelSmartAction[] = [
    {
      label: 'Add a moment',
      icon: 'plus',
      onClick: add,
      primary: true,
    },
    {
      label: 'Use a preset',
      icon: 'sparkles',
      onClick: preset,
      disabled: items.length > 0,
    },
  ];

  return (
    <div>
      <PanelSmartActions actions={smartActions} />
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
