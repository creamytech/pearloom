'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx FaqEditor —
   now host-editable. Writes manifest.faqs[] (canonical FaqItem
   shape) which ThemedSite's FaqBlock reads. */

import { useState } from 'react';
import type { FaqItem, StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, PearChip, SectionPanelShell } from './_section-atoms';

const DEFAULT_FAQS: FaqItem[] = [
  { id: 'f-dress', question: 'What is the dress code?', answer: '', order: 0 },
  { id: 'f-guest', question: 'Can I bring a guest?', answer: '', order: 1 },
  { id: 'f-kids', question: 'Are children welcome?', answer: '', order: 2 },
  { id: 'f-stay', question: 'Where should we stay?', answer: '', order: 3 },
];

export function FaqPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const faqs: FaqItem[] = manifest.faqs && manifest.faqs.length > 0 ? manifest.faqs : DEFAULT_FAQS;
  const [openId, setOpenId] = useState<string | null>(null);

  const write = (next: FaqItem[]) => onChange({ ...manifest, faqs: next.map((f, i) => ({ ...f, order: i })) } as StoryManifest);
  const patch = (i: number, p: Partial<FaqItem>) => write(faqs.map((f, idx) => idx === i ? { ...f, ...p } : f));
  const remove = (i: number) => write(faqs.filter((_, idx) => idx !== i));
  const add = () => write([...faqs, { id: `f-${Date.now()}`, question: 'New question', answer: '', order: faqs.length }]);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FGroup label={`Questions · ${faqs.length}`} action={<PearChip>Suggest from data</PearChip>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {faqs.map((f, i) => {
              const isOpen = openId === f.id;
              return (
                <div key={f.id} style={{ borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : f.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <Icon name="drag" size={13} color="var(--ink-muted)" />
                    <span style={{ flex: 1, fontSize: 12.5 }}>{f.question || '(empty question)'}</span>
                    <Icon name={isOpen ? 'chev-up' : 'chev-down'} size={13} color="var(--ink-muted)" />
                  </button>
                  {isOpen && (
                    <div style={{ padding: 10, borderTop: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <FInput value={f.question} onChange={(v) => patch(i, { question: v })} placeholder="Question" />
                      <FInput value={f.answer} onChange={(v) => patch(i, { answer: v })} placeholder="Answer (shown on the FAQ page)" />
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          style={{ padding: '5px 10px', borderRadius: 7, background: 'transparent', border: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-muted)', cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <AddCard label="Add a question" onClick={add} />
          </div>
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default FaqPanel;
