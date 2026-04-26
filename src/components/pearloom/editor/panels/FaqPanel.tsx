'use client';

import type { StoryManifest } from '@/types';
import { AddRowButton, EmptyBlockState, Field, PanelGroup, PanelSection, TextArea, TextInput } from '../atoms';
import { SortableList, SortableRowCard } from '../sortable';
import { AIHint, AISuggestButton, useAICall } from '../ai';

type FaqItem = { id: string; question: string; answer: string };

function get(m: StoryManifest): FaqItem[] {
  const arr = (m as unknown as { faq?: FaqItem[] }).faq;
  return Array.isArray(arr) ? arr : [];
}

export function FaqPanel({
  manifest,
  names,
  onChange,
}: {
  manifest: StoryManifest;
  names: [string, string];
  onChange: (m: StoryManifest) => void;
}) {
  const items = get(manifest);

  function set(next: FaqItem[]) {
    onChange({ ...manifest, faq: next } as unknown as StoryManifest);
  }
  function update(idx: number, patch: Partial<FaqItem>) {
    set(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function add() {
    set([...items, { id: `faq-${Date.now().toString(36)}`, question: 'New question', answer: '' }]);
  }

  const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
  const { state, error, run } = useAICall(async () => {
    const res = await fetch('/api/ai-faq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        occasion,
        names,
        logistics: manifest.logistics,
        vibes: (manifest as unknown as { vibes?: string[] }).vibes,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Pear couldn't draft an FAQ (${res.status})`);
    }
    const data = (await res.json()) as { faq?: FaqItem[]; questions?: FaqItem[]; items?: FaqItem[] };
    const raw = data.faq ?? data.questions ?? data.items ?? [];
    const now = Date.now();
    const next: FaqItem[] = raw.map((q, i) => ({
      id: `faq-ai-${now.toString(36)}-${i}`,
      question: q.question,
      answer: q.answer,
    }));
    if (!next.length) throw new Error('No FAQ items returned');
    set([...items, ...next]);
    return next;
  });

  return (
    <PanelGroup>
      <PanelSection label="Frequently asked" hint="Drag to reorder. Guests see these below the schedule.">
        <AIHint>
          Pear drafts an 8–10 question FAQ from your occasion, venue, date, and vibes. Everything is editable.
        </AIHint>
        <AISuggestButton
          label={items.length ? 'Draft more with Pear' : 'Draft FAQ with Pear'}
          runningLabel="Writing your FAQ…"
          state={state}
          onClick={() => void run()}
          error={error ?? undefined}
        />
        {items.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            <SortableList
              items={items}
              onReorder={set}
              renderItem={(it, { handle }) => {
                const i = items.findIndex((x) => x.id === it.id);
                return (
                  <SortableRowCard handle={handle} onDelete={() => set(items.filter((_, idx) => idx !== i))}>
                    <Field label="Question">
                      <TextInput
                        value={it.question}
                        onChange={(e) => update(i, { question: e.target.value })}
                        placeholder="What should I wear?"
                      />
                    </Field>
                    <Field label="Answer">
                      <TextArea
                        rows={3}
                        value={it.answer}
                        onChange={(e) => update(i, { answer: e.target.value })}
                        placeholder="Cocktail attire — elevated but comfortable. Think elegant dinner party."
                      />
                    </Field>
                  </SortableRowCard>
                );
              }}
            />
            <AddRowButton label="Add a question" onClick={add} />
          </div>
        ) : (
          <EmptyBlockState
            icon="heart-icon"
            title="No FAQ yet"
            body="Let Pear draft 8–10 questions your guests will ask — parking, dress code, plus-ones, photo rules, gift policy — based on your event details."
            action={
              <button type="button" className="btn btn-outline btn-sm" onClick={add}>
                Start empty
              </button>
            }
          />
        )}
      </PanelSection>
    </PanelGroup>
  );
}
