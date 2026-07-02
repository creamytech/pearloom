'use client';

/* eslint-disable no-restricted-syntax */
/* RoomsPanel — Content tab for the Rooms section (who sleeps
   where). THIN editor over manifest.bachelor.rooms[] — the SAME
   field the Weekend planner tool (BachelorPanel "Rooms" group)
   owns, so nothing forks. Unlike BachelorPanel, this panel never
   seeds the default two rooms — an empty list keeps the canvas in
   its empty state. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { moveItem, ReorderHandle } from '../_reorder';
import { isBachelorOccasion, mkId, readOccasion, RemoveButton, ToolPointerCard, type BlockPanelProps } from './_shared';

interface RoomRow { id: string; name: string; guests: string }

export function RoomsPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'rooms');
  const loose = manifest as unknown as { bachelor?: { rooms?: RoomRow[] } & Record<string, unknown> };
  const rooms = Array.isArray(loose.bachelor?.rooms) ? loose.bachelor.rooms : [];

  const write = (next: RoomRow[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    bachelor: { ...(loose.bachelor ?? {}), rooms: next },
  } as unknown as StoryManifest);

  const patchRoom = (i: number, p: Partial<RoomRow>) =>
    write(rooms.map((room, idx) => (idx === i ? { ...room, ...p } : room)));

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup
          label={`Rooms · ${rooms.length}`}
          hint="Sleeping arrangements — each room lists who's in it, comma-separated. Rooms appear on the site in this order."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rooms.map((room, i) => (
              <div key={room.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
                <ReorderHandle
                  index={i}
                  count={rooms.length}
                  label={room.name || 'room'}
                  onMove={(from, to) => write(moveItem(rooms, from, to))}
                />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <FInput value={room.name} onChange={(v) => patchRoom(i, { name: v })} icon="home" placeholder="Master suite" />
                  <FInput value={room.guests} onChange={(v) => patchRoom(i, { guests: v })} icon="user" placeholder="Jane, Maya" />
                </div>
                <RemoveButton label={`Remove ${room.name || 'room'}`} onClick={() => write(rooms.filter((_, idx) => idx !== i))} />
              </div>
            ))}
            <AddCard
              label={rooms.length === 0 ? 'Add the first room' : 'Add a room'}
              onClick={() => write([...rooms, { id: mkId('r'), name: '', guests: '' }])}
            />
          </div>
        </FGroup>

        {isBachelorOccasion(readOccasion(manifest)) && (
          <ToolPointerCard
            toolId="bachelor"
            label="Also in the Weekend planner"
            body="Costs, polls, and packing live there — same rooms, one store."
          />
        )}

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Rooms" />
      </div>
    </SectionPanelShell>
  );
}

export default RoomsPanel;
