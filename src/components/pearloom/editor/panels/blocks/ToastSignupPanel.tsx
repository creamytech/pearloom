'use client';

/* eslint-disable no-restricted-syntax */
/* ToastSignupPanel — Content tab for the Toast signup section.
   Writes manifest.toastSlots[] — { id, label, assigned?, note? },
   mirroring the legacy ToastSlot shape. NOT the same thing as the
   "Toasts & speeches" tool (ToastsPanel): that drafts speech TEXT
   with Pear; this authors the claimable slot list guests see.

   CLAIM CAVEAT: guest claims are keyed by the slot's position in
   this list (toast-signup.tsx posts the raw manifest index), so
   removing or inserting slots mid-list after guests start claiming
   shifts later claims. Add new slots at the END once the site is
   live — surfaced as a hint below. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { isMemorialOccasion, mkId, readOccasion, RemoveButton, RowCard, type BlockPanelProps } from './_shared';

interface ToastSlotRow { id: string; label: string; assigned?: string; note?: string }

/* Slot example routed by occasion — the registry mounts this
   section on rehearsal dinners (wedding-shaped) but also milestone
   birthdays and retirements, where nobody is anyone's bride. */
function slotPlaceholderFor(occasion?: string): string {
  if (isMemorialOccasion(occasion)) return 'A family member';
  if (occasion === 'retirement' || occasion === 'graduation' || occasion === 'milestone-birthday') {
    return 'A longtime friend';
  }
  return 'Father of the bride';
}

export function ToastSignupPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'toastSignup');
  const slotPlaceholder = slotPlaceholderFor(readOccasion(manifest));
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
        <FGroup
          label={`Toast slots · ${slots.length}`}
          hint="Each slot can be pre-assigned or left open for guests to claim. Claims attach to a slot's position in this list — once guests start claiming, add new slots at the end rather than removing or inserting mid-list."
          action={
            slots.length === 0 ? (
              <button
                type="button"
                onClick={() =>
                  write([
                    { id: mkId('toast'), label: 'Welcome toast' },
                    { id: mkId('toast'), label: 'A story about the early days' },
                    { id: mkId('toast'), label: 'Open toast — anyone' },
                    { id: mkId('toast'), label: 'The send-off' },
                  ])
                }
                style={{
                  padding: '4px 9px', borderRadius: 999,
                  background: 'var(--cream-2)', border: '1px solid var(--line-soft)',
                  fontSize: 10.5, fontWeight: 700, color: 'var(--ink-soft)',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                Seed 4 open slots
              </button>
            ) : undefined
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slots.map((slot, i) => (
              <RowCard key={slot.id}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <FInput value={slot.label} onChange={(v) => patchSlot(i, { label: v })} icon="mic" placeholder={slotPlaceholder} />
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
