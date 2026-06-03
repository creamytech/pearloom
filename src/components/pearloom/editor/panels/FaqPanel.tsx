'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx FaqEditor —
   now host-editable. Writes manifest.faqs[] (canonical FaqItem
   shape) which ThemedSite's FaqBlock reads. */

import { useState } from 'react';
import type { FaqItem, StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, FSuggest, PearChip, SectionPanelShell } from './_section-atoms';
import { faqQuestionSuggestions } from './_suggestions';

const DEFAULT_FAQS: FaqItem[] = [
  { id: 'f-dress', question: 'What is the dress code?', answer: '', order: 0 },
  { id: 'f-guest', question: 'Can I bring a guest?', answer: '', order: 1 },
  { id: 'f-kids', question: 'Are children welcome?', answer: '', order: 2 },
  { id: 'f-stay', question: 'Where should we stay?', answer: '', order: 3 },
];

export function FaqPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const questionSet = faqQuestionSuggestions(occasion);
  const faqs: FaqItem[] = manifest.faqs && manifest.faqs.length > 0 ? manifest.faqs : DEFAULT_FAQS;
  const [openId, setOpenId] = useState<string | null>(null);

  const write = (next: FaqItem[]) => onChange({ ...manifest, faqs: next.map((f, i) => ({ ...f, order: i })) } as StoryManifest);
  const patch = (i: number, p: Partial<FaqItem>) => write(faqs.map((f, idx) => idx === i ? { ...f, ...p } : f));
  const remove = (i: number) => write(faqs.filter((_, idx) => idx !== i));
  const add = () => write([...faqs, { id: `f-${Date.now()}`, question: 'New question', answer: '', order: faqs.length }]);
  /* "Quick-add" — tap a curated question; appends it with an
     empty answer so the host can fill in details. Skipped if a
     question with that text already exists. */
  const quickAdd = (q: string) => {
    if (faqs.some((f) => f.question.trim().toLowerCase() === q.toLowerCase())) return;
    write([...faqs, { id: `f-${Date.now()}`, question: q, answer: '', order: faqs.length }]);
  };
  const remainingQuickAdds = questionSet.options.filter(
    (q) => !faqs.some((f) => f.question.trim().toLowerCase() === q.toLowerCase()),
  );

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
                      <FSuggest
                        value={f.question}
                        onChange={(v) => patch(i, { question: v })}
                        placeholder="Question"
                        options={questionSet.options}
                      />
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
        {remainingQuickAdds.length > 0 && (
          <FGroup label="Quick-add common questions" hint="Tap to add with an empty answer — fill it in below.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {remainingQuickAdds.slice(0, 8).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => quickAdd(q)}
                  style={{
                    fontSize: 11.5, fontWeight: 600,
                    padding: '5px 10px', borderRadius: 999,
                    background: 'var(--cream-2)', color: 'var(--ink-soft)',
                    border: '1px solid var(--line)', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  + {q}
                </button>
              ))}
            </div>
          </FGroup>
        )}
      </div>
    </SectionPanelShell>
  );
}

export default FaqPanel;
