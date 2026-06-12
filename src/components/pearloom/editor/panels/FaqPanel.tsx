'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx FaqEditor —
   now host-editable. Writes manifest.faqs[] (canonical FaqItem
   shape) which ThemedSite's FaqBlock reads. */

import { useRef, useState } from 'react';
import type { FaqItem, StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, FSuggest, PearChip, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';
import { faqQuestionSuggestions, faqAnswerDraftFor, smartContext } from './_suggestions';
import { PearAiChip, PearInlineRewrite, pearErrorMessage } from '../../redesign/PearAssist';
import { AISource } from '../../ai-source';

/* Wording matches the canvas's DEFAULT_FAQ_QUESTIONS exactly so
   the panel and the preview never show two different drafts. */
const DEFAULT_FAQS: FaqItem[] = [
  { id: 'f-dress', question: "What's the dress code, really?", answer: '', order: 0 },
  { id: 'f-guest', question: 'Can I bring a plus-one?', answer: '', order: 1 },
  { id: 'f-kids', question: 'Are kids welcome at the ceremony?', answer: '', order: 2 },
  { id: 'f-stay', question: 'Where should we stay?', answer: '', order: 3 },
];

export function FaqPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'faq');
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const questionSet = faqQuestionSuggestions(occasion);
  const faqs: FaqItem[] = manifest.faqs && manifest.faqs.length > 0 ? manifest.faqs : DEFAULT_FAQS;
  const [faqEyebrow, setFaqEyebrow] = useCopyOverride(manifest, onChange, 'faqEyebrow');
  const [openId, setOpenId] = useState<string | null>(null);
  /* Tracks per-row "Draft answer from Pear" busy state. Keyed by
     faq id so multiple rows can stage independently. */
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [draftErr, setDraftErr] = useState<string | null>(null);
  /* Last answer Pear drafted — shown as a transient "drafted by
     Pear" stamp under the answer field until the host edits it
     (at which point it's theirs, not Pear's). */
  const [drafted, setDrafted] = useState<{ id: string; text: string } | null>(null);
  /* Bulk "Draft all unanswered" — sequential runs of draftAnswer
     over every question with an empty answer. `done` counts
     completed rows so the chip can read "Drafting 2 of 5…". */
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const [bulkErr, setBulkErr] = useState<string | null>(null);

  /* Refs mirror the latest manifest/faqs so the sequential bulk
     drafter never writes through a stale closure — each patch in
     the loop must see the answers earlier iterations landed. */
  const manifestRef = useRef(manifest);
  manifestRef.current = manifest;

  /* Returns null on success, or the sanitized error copy on
     failure (so the bulk runner can abort + surface it). */
  async function draftAnswer(f: FaqItem, idx: number): Promise<string | null> {
    if (!f.question.trim()) {
      const msg = 'Add a question first so Pear knows what to answer.';
      setDraftErr(msg);
      return msg;
    }
    setDraftingId(f.id); setDraftErr(null);
    try {
      const res = await fetch('/api/inline-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: f.question,
          context: `FAQ answer — the question is "${f.question}". Draft a warm, factual 1-2 sentence answer for a celebration-website FAQ. Don't restate the question — answer it directly.`,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[faq] draft-answer failed:', res.status);
        throw new Error((j as { error?: string }).error ?? 'Pear couldn’t draft that one — try again?');
      }
      const { rewritten } = await res.json() as { rewritten: string };
      if (rewritten && rewritten !== f.question) {
        patch(idx, { answer: rewritten });
        setDrafted({ id: f.id, text: rewritten });
      }
      return null;
    } catch (e) {
      console.error('[faq] draft-answer error:', e);
      const msg = pearErrorMessage(e, 'Pear couldn’t draft that one — try again?');
      setDraftErr(msg);
      return msg;
    } finally {
      setDraftingId(null);
    }
  }

  /* Sequential bulk drafter — reuses draftAnswer row by row (no
     new API route, same busy + sanitized-error handling). Aborts
     the remaining rows on the first error. Indexes stay stable
     during the run (no add/remove can happen mid-bulk). */
  async function draftAllUnanswered() {
    if (bulk || draftingId) return;
    const current = manifestRef.current.faqs && manifestRef.current.faqs.length > 0 ? manifestRef.current.faqs : DEFAULT_FAQS;
    const targets = current
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f.question.trim() && !f.answer.trim());
    if (targets.length === 0) return;
    setBulkErr(null);
    setBulk({ done: 0, total: targets.length });
    for (let k = 0; k < targets.length; k++) {
      setBulk({ done: k, total: targets.length });
      const errMsg = await draftAnswer(targets[k].f, targets[k].i);
      if (errMsg) {
        setBulkErr(errMsg);
        break;
      }
    }
    setBulk(null);
  }

  const write = (next: FaqItem[]) => onChange({ ...manifestRef.current, faqs: next.map((f, i) => ({ ...f, order: i })) } as StoryManifest);
  const patch = (i: number, p: Partial<FaqItem>) => {
    const cur = manifestRef.current.faqs && manifestRef.current.faqs.length > 0 ? manifestRef.current.faqs : DEFAULT_FAQS;
    write(cur.map((f, idx) => idx === i ? { ...f, ...p } : f));
  };
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
  const unansweredCount = faqs.filter((f) => f.question.trim() && !f.answer.trim()).length;

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
          <FInput value={faqEyebrow} onChange={setFaqEyebrow} placeholder="Questions & answers" />
        </FGroup>
        <FGroup label={`Questions · ${faqs.length}`} action={<PearChip>Suggest from data</PearChip>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Bulk drafter — only worth surfacing when 2+ rows are
                unanswered (a single row has its own per-row chip). */}
            {(unansweredCount >= 2 || bulk) && (
              <PearAiChip
                onClick={draftAllUnanswered}
                busy={!!bulk}
                disabled={!!draftingId && !bulk}
                style={{ alignSelf: 'flex-start' }}
              >
                {bulk
                  ? `Drafting ${Math.min(bulk.done + 1, bulk.total)} of ${bulk.total}…`
                  : `Draft all ${unansweredCount} unanswered`}
              </PearAiChip>
            )}
            {bulkErr && !bulk && (
              <div style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(122,45,45,0.08)', fontSize: 11, color: '#7A2D2D' }}>
                {bulkErr}
              </div>
            )}
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
                        onPick={(opt) => {
                          /* Picking a suggested question also drafts a
                             venue-aware answer when the answer box is
                             empty — the host edits a sentence instead
                             of facing a blank field. */
                          const draft = !f.answer.trim()
                            ? faqAnswerDraftFor(opt, smartContext(manifest), manifest)
                            : null;
                          patch(i, draft ? { question: opt, answer: draft } : { question: opt });
                        }}
                        placeholder="Question"
                        options={questionSet.options}
                      />
                      <FInput value={f.answer} onChange={(v) => patch(i, { answer: v })} placeholder="Answer (shown on the FAQ page)" />
                      {drafted?.id === f.id && drafted.text === f.answer && (
                        /* Transient attribution — disappears the
                           moment the host edits the drafted answer. */
                        <AISource style={{ fontSize: 10.5, opacity: 0.85, alignSelf: 'flex-start' }} />
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <PearAiChip
                            onClick={() => draftAnswer(f, i)}
                            busy={draftingId === f.id}
                            disabled={!!draftingId && draftingId !== f.id}
                          >
                            {draftingId === f.id ? 'Pear is drafting…' : f.answer ? 'Draft a fresh answer' : 'Draft answer'}
                          </PearAiChip>
                          {f.answer.trim().length >= 2 && (
                            /* Rewrite-tone chips for the existing
                               answer — Shorten / Warmer / etc. */
                            <PearInlineRewrite
                fxSection="faq"
                              value={f.answer}
                              onCommit={(v) => patch(i, { answer: v })}
                              context={`FAQ answer to "${f.question}"`}
                              tones={['shorten', 'warmer', 'poetic']}
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          style={{ padding: '5px 10px', borderRadius: 7, background: 'transparent', border: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-muted)', cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                      {draftErr && draftingId === null && (
                        <div style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(122,45,45,0.08)', fontSize: 11, color: '#7A2D2D' }}>
                          {draftErr}
                        </div>
                      )}
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
        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="FAQ" />
      </div>
    </SectionPanelShell>
  );
}

export default FaqPanel;
