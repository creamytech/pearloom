'use client';

/* eslint-disable no-restricted-syntax */
/* ItineraryPanel — Content tab for the Itinerary section.
   Writes manifest.itinerary.days[] — the field the redesign canvas
   (section-variants/blocks/itinerary.tsx) reads. Day shape mirrors
   the legacy ItineraryBlock config.days so old wizard-seeded data
   reads cleanly: { id, label, date?, slots: [{ id, time, title,
   detail, location }] }. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../../motifs';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { mkId, RemoveButton, RowCard, type BlockPanelProps } from './_shared';

interface SlotRow { id: string; time?: string; title?: string; detail?: string; location?: string }
interface DayRow { id: string; label?: string; date?: string; slots: SlotRow[] }

/** Tiny chevron button for reordering days. */
function MoveDayButton({ dir, disabled, onClick }: { dir: -1 | 1; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir < 0 ? 'Move day earlier' : 'Move day later'}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 22, height: 22, borderRadius: 6,
        display: 'grid', placeItems: 'center',
        background: 'transparent',
        border: '1px solid var(--line-soft)',
        color: disabled ? 'var(--line)' : 'var(--ink-muted)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon name={dir < 0 ? 'chev-up' : 'chev-down'} size={11} />
    </button>
  );
}

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

  /* Reorder — swap the day with its neighbour. The canvas (and the
     day-jump pills) follow array order, so this is the whole story. */
  const moveDay = (di: number, dir: -1 | 1) => {
    const target = di + dir;
    if (target < 0 || target >= days.length) return;
    const next = [...days];
    [next[di], next[target]] = [next[target], next[di]];
    write(next);
  };

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {days.map((day, di) => (
          <FGroup
            key={day.id}
            label={day.label?.trim() || `Day ${di + 1}`}
            action={days.length > 1 ? (
              <span style={{ display: 'inline-flex', gap: 3 }}>
                <MoveDayButton dir={-1} disabled={di === 0} onClick={() => moveDay(di, -1)} />
                <MoveDayButton dir={1} disabled={di === days.length - 1} onClick={() => moveDay(di, 1)} />
              </span>
            ) : undefined}
          >
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
