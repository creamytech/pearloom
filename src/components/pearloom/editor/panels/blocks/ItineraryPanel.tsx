'use client';

/* eslint-disable no-restricted-syntax */
/* ItineraryPanel — Content tab for the Itinerary section.
   Writes manifest.itinerary.days[] — the field the redesign canvas
   (section-variants/blocks/itinerary.tsx) reads. Day shape mirrors
   the legacy ItineraryBlock config.days so old wizard-seeded data
   reads cleanly: { id, label, date?, slots: [{ id, time, title,
   detail, location }] }. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { mkId, RemoveButton, RowCard, type BlockPanelProps } from './_shared';

interface SlotRow { id: string; time?: string; title?: string; detail?: string; location?: string }
interface DayRow { id: string; label?: string; date?: string; slots: SlotRow[] }

function readDays(manifest: StoryManifest): DayRow[] {
  const loose = manifest as unknown as { itinerary?: { days?: DayRow[] } };
  const days = loose.itinerary?.days;
  if (!Array.isArray(days)) return [];
  return days.map((d, i) => ({
    id: d.id ?? `day-${i}`,
    label: d.label ?? '',
    date: d.date ?? '',
    slots: Array.isArray(d.slots) ? d.slots.map((s, j) => ({ ...s, id: s.id ?? `slot-${i}-${j}` })) : [],
  }));
}

export function ItineraryPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'itinerary');
  const days = readDays(manifest);

  const write = (next: DayRow[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    itinerary: { ...((manifest as unknown as { itinerary?: Record<string, unknown> }).itinerary ?? {}), days: next },
  } as unknown as StoryManifest);

  const patchDay = (di: number, p: Partial<DayRow>) =>
    write(days.map((d, i) => (i === di ? { ...d, ...p } : d)));
  const patchSlot = (di: number, si: number, p: Partial<SlotRow>) =>
    patchDay(di, { slots: days[di].slots.map((s, j) => (j === si ? { ...s, ...p } : s)) });

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {days.map((day, di) => (
          <FGroup key={day.id} label={day.label?.trim() || `Day ${di + 1}`}>
            <RowCard>
              <div style={{ display: 'flex', gap: 6 }}>
                <FInput value={day.label ?? ''} onChange={(v) => patchDay(di, { label: v })} placeholder={`Day ${di + 1} — "Friday"`} />
                <FInput value={day.date ?? ''} onChange={(v) => patchDay(di, { date: v })} placeholder="July 18" icon="calendar" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {day.slots.map((slot, si) => (
                  <div key={slot.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <div style={{ width: 86, flexShrink: 0 }}>
                      <FInput value={slot.time ?? ''} onChange={(v) => patchSlot(di, si, { time: v })} placeholder="09:30" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <FInput value={slot.title ?? ''} onChange={(v) => patchSlot(di, si, { title: v })} placeholder="Hotel check-in" />
                      <FInput value={slot.detail ?? ''} onChange={(v) => patchSlot(di, si, { detail: v })} placeholder="Optional detail or venue" />
                    </div>
                    <RemoveButton label="Remove slot" onClick={() => patchDay(di, { slots: day.slots.filter((_, j) => j !== si) })} />
                  </div>
                ))}
                <AddCard
                  label="Add a time slot"
                  onClick={() => patchDay(di, { slots: [...day.slots, { id: mkId('slot') }] })}
                />
              </div>
              <button
                type="button"
                onClick={() => write(days.filter((_, i) => i !== di))}
                style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)',
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', alignSelf: 'flex-end',
                }}
              >
                Remove day
              </button>
            </RowCard>
          </FGroup>
        ))}
        <AddCard
          label={days.length === 0 ? 'Add the first day' : 'Add a day'}
          onClick={() => write([...days, { id: mkId('day'), label: '', date: '', slots: [{ id: mkId('slot') }] }])}
        />
        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Itinerary" />
      </div>
    </SectionPanelShell>
  );
}

export default ItineraryPanel;
