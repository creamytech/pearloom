'use client';

 
/* ToastSignupPanel — Content tab for the Toast signup section.
   Writes manifest.toastSlots[] — { id, label, assigned?, note? },
   mirroring the legacy ToastSlot shape. NOT the same thing as the
   "Toasts & speeches" tool (ToastsPanel): that drafts speech TEXT
   with Pear; this authors the claimable slot list guests see. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { mkId, RemoveButton, RowCard, type BlockPanelProps } from './_shared';

interface ToastSlotRow { id: string; label: string; assigned?: string; note?: string }

export function ToastSignupPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'toastSignup');
  const loose = manifest as unknown as { toastSlots?: ToastSlotRow[] };
  const slots = Array.isArray(loose.toastSlots) ? loose.toastSlots : [];

  const write = (next: ToastSlotRow[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    toastSlots: next,
  } as unknown as StoryManifest);

  const patchSlot = (i: number, p: Partial<ToastSlotRow>) =>
    write(slots.map((s, idx) => (idx === i ? { ...s, ...p } : s)));

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label={`Toast slots · ${slots.length}`} hint="Each slot can be pre-assigned or left open for guests to claim.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slots.map((slot, i) => (
              <RowCard key={slot.id}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <FInput value={slot.label} onChange={(v) => patchSlot(i, { label: v })} icon="mic" placeholder="Father of the bride" />
                    <FInput value={slot.assigned ?? ''} onChange={(v) => patchSlot(i, { assigned: v })} icon="user" placeholder="Pre-assigned name (leave blank for an open slot)" />
                    <FInput value={slot.note ?? ''} onChange={(v) => patchSlot(i, { note: v })} placeholder="Keep it under 90 seconds." />
                  </div>
                  <RemoveButton label={`Remove ${slot.label || 'slot'}`} onClick={() => write(slots.filter((_, idx) => idx !== i))} />
                </div>
              </RowCard>
            ))}
            <AddCard
              label={slots.length === 0 ? 'Add the first slot' : 'Add a slot'}
              onClick={() => write([...slots, { id: mkId('toast'), label: '' }])}
            />
          </div>
        </FGroup>

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Toast signup" />
      </div>
    </SectionPanelShell>
  );
}

export default ToastSignupPanel;
