'use client';
 
/* Toast signup section — claim a toast slot.

   Data: manifest.toastSlots[]  (written by ToastSignupPanel)
     { id, label, assigned?, note? }
   Mirrors the legacy ToastSlot shape from
   src/components/site/ToastSignupBlock.tsx. NOT related to the
   Toasts & speeches tool (ToastsPanel) — that drafts speech TEXT
   with Pear; this is the day-of slot list.

   Rendered READ-ONLY here — guest claiming (POST
   /api/event-os/toasts) is design-agent work. Variants
   (layouts.ts): slots (implemented) | list. */

import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface ToastSlotData { id?: string; label?: string; assigned?: string; note?: string }

export function readToastSlots(manifest: BlockSectionProps['manifest']): ToastSlotData[] {
  const loose = manifest as unknown as { toastSlots?: ToastSlotData[] };
  return Array.isArray(loose.toastSlots) ? loose.toastSlots : [];
}

export function ToastSignupSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  void variant; /* slots | list — design agents dispatch here. */
  const slots = readToastSlots(manifest).filter((s) => (s.label ?? '').trim());
  const empty = slots.length === 0;
  if (empty && !editable) return null;

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'toastSignupEyebrow', 'Raise a glass')}
        title={blockCopy(manifest, 'toastSignupTitle', 'Toasts & words')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('toastSignupEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('toastSignupTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Add toast slots in the Toast signup panel." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560, margin: '0 auto' }}>
          {slots.map((slot, i) => {
            const claimed = !!slot.assigned?.trim();
            return (
              <div
                key={slot.id ?? i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '34px 1fr auto',
                  gap: 14,
                  alignItems: 'center',
                  padding: '14px 18px',
                  background: 'var(--t-card)',
                  border: '1px solid var(--t-line)',
                  borderRadius: 'var(--t-radius-lg, 14px)',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 34, height: 34, borderRadius: '50%',
                    display: 'grid', placeItems: 'center',
                    background: 'var(--t-accent-bg, var(--t-section))',
                    color: 'var(--t-accent-ink, var(--t-ink))',
                    fontFamily: 'var(--t-display)', fontSize: 15,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--t-ink)' }}>{slot.label}</div>
                  {slot.note && (
                    <div style={{ fontSize: 12, color: 'var(--t-ink-muted)', marginTop: 2, lineHeight: 1.45 }}>{slot.note}</div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                    fontStyle: claimed ? 'normal' : 'italic',
                    color: claimed ? 'var(--t-ink)' : 'var(--t-ink-muted)',
                  }}
                >
                  {claimed ? slot.assigned : 'Open slot'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </BlockFrame>
  );
}
