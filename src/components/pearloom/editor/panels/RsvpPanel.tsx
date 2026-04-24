'use client';

import type { StoryManifest, MealOption } from '@/types';
import { AddRowButton, EmptyBlockState, Field, PanelSection, TextArea, TextInput, Toggle } from '../atoms';
import { SortableList, SortableRowCard } from '../sortable';
import { AIHint, AISuggestButton, useAICall } from '../ai';

const DIETARY_TAGS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher'] as const;

function MealsAI({ manifest, onResult }: { manifest: StoryManifest; onResult: (m: MealOption[]) => void }) {
  const { state, error, run } = useAICall(async () => {
    const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
    const vibes = (manifest as unknown as { vibes?: string[] }).vibes ?? [];
    const res = await fetch('/api/ai-meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generateMenu: true,
        occasion,
        vibe: vibes.join(', '),
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Pear couldn't write a menu (${res.status})`);
    }
    const data = (await res.json()) as { menu?: Array<{ name: string; description?: string; dietaryTags?: string[] }> };
    const now = Date.now();
    const next: MealOption[] = (data.menu ?? []).map((m, i) => ({
      id: `meal-ai-${now.toString(36)}-${i}`,
      name: m.name,
      description: m.description ?? '',
      dietaryTags: (m.dietaryTags ?? []) as MealOption['dietaryTags'],
    }));
    if (!next.length) throw new Error('No meals returned');
    onResult(next);
    return next;
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AIHint>
        Pear drafts a menu from your occasion + vibe — you can edit every plate, dietary tag, and description.
      </AIHint>
      <AISuggestButton
        label="Suggest meal options"
        runningLabel="Writing your menu…"
        state={state}
        onClick={() => void run()}
        error={error ?? undefined}
      />
    </div>
  );
}

type V = MealOption['dietaryTags'][number];

export function RsvpPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const meals = manifest.mealOptions ?? [];
  const features = manifest.features ?? {};
  const logistics = manifest.logistics ?? {};

  function setMeals(next: MealOption[]) {
    onChange({ ...manifest, mealOptions: next });
  }

  function update(idx: number, patch: Partial<MealOption>) {
    setMeals(meals.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }

  function addMeal() {
    setMeals([
      ...meals,
      { id: `meal-${Date.now().toString(36)}`, name: 'Short rib', description: '', dietaryTags: [] },
    ]);
  }

  return (
    <div>
      <PanelSection label="Deadline + gating" hint="Controls the RSVP CTA on your site.">
        <Field label="RSVP deadline" help="Shown as 'Kindly respond by …' above the form.">
          <TextInput
            type="date"
            value={(logistics.rsvpDeadline ?? '').slice(0, 10)}
            onChange={(e) =>
              onChange({
                ...manifest,
                logistics: { ...logistics, rsvpDeadline: e.target.value || undefined },
              })
            }
          />
        </Field>
        <Toggle
          label="Allow plus-ones"
          help="Guests can note a plus-one name on the RSVP form."
          on={(manifest as unknown as { rsvpConfig?: { plusOnes?: boolean } }).rsvpConfig?.plusOnes ?? true}
          onChange={(v) =>
            onChange({
              ...manifest,
              rsvpConfig: {
                ...((manifest as unknown as { rsvpConfig?: Record<string, unknown> }).rsvpConfig ?? {}),
                plusOnes: v,
              },
            } as unknown as StoryManifest)
          }
        />
        <Toggle
          label="Collect song requests"
          on={(manifest as unknown as { rsvpConfig?: { songRequests?: boolean } }).rsvpConfig?.songRequests ?? true}
          onChange={(v) =>
            onChange({
              ...manifest,
              rsvpConfig: {
                ...((manifest as unknown as { rsvpConfig?: Record<string, unknown> }).rsvpConfig ?? {}),
                songRequests: v,
              },
            } as unknown as StoryManifest)
          }
        />
        <Toggle
          label="Guestbook on published site"
          help="Shows a live guest wall on the Day-of page + published site."
          on={features.guestbook ?? false}
          onChange={(v) => onChange({ ...manifest, features: { ...features, guestbook: v } })}
        />
      </PanelSection>

      <PanelSection
        label="Meal options"
        hint="Drag to reorder. Guests who RSVP yes pick one."
        action={meals.length > 0 ? <AddRowButton label="Add meal" onClick={addMeal} /> : null}
      >
        <MealsAI manifest={manifest} onResult={(next) => setMeals([...meals, ...next])} />

        <SortableList
          items={meals}
          onReorder={setMeals}
          emptyState={
            <EmptyBlockState
              icon="gift"
              title="No meal options yet"
              body="If you're serving dinner, add each plate — short rib, halibut, garden plate, etc."
              action={<AddRowButton label="Add first meal" onClick={addMeal} />}
            />
          }
          renderItem={(m, { handle }) => {
            const i = meals.findIndex((x) => x.id === m.id);
            return (
              <SortableRowCard handle={handle} onDelete={() => setMeals(meals.filter((_, idx) => idx !== i))}>
                <Field label="Name">
                  <TextInput value={m.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Short rib" />
                </Field>
                <Field label="Description">
                  <TextArea
                    rows={2}
                    value={m.description ?? ''}
                    onChange={(e) => update(i, { description: e.target.value })}
                    placeholder="Braised, fennel + creamed leeks."
                  />
                </Field>
                <Field label="Dietary tags">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DIETARY_TAGS.map((t) => {
                      const on = m.dietaryTags.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            const next = on
                              ? m.dietaryTags.filter((x) => x !== t)
                              : [...m.dietaryTags, t as V];
                            update(i, { dietaryTags: next as MealOption['dietaryTags'] });
                          }}
                          className="chip"
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            background: on ? 'var(--sage-tint)' : 'var(--cream-2)',
                            color: on ? 'var(--sage-deep)' : 'var(--ink-soft)',
                            border: `1px solid ${on ? 'var(--sage-deep)' : 'var(--line)'}`,
                            cursor: 'pointer',
                          }}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </SortableRowCard>
            );
          }}
        />
      </PanelSection>
    </div>
  );
}
