'use client';

import type { StoryManifest, MealOption } from '@/types';
import { AddRowButton, EmptyBlockState, Field, PanelDisclosure, PanelGroup, PanelSection, PanelSmartActions, PanelTabs, TextArea, TextInput, Toggle, type PanelSmartAction } from '../atoms';
import { SortableList, SortableRowCard } from '../sortable';
import { AIHint, AISuggestButton, useAICall } from '../ai';

const DIETARY_TAGS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher'] as const;

function MealsAI({ manifest, onResult }: { manifest: StoryManifest; onResult: (m: MealOption[]) => void }) {
  const { state, error, run } = useAICall(async () => {
    // Manifest field is `vibeString` (singular string) — see
    // src/types.ts:96. Reading `vibes` returned undefined and the
    // route got an empty vibe context.
    const occasion = manifest.occasion ?? 'wedding';
    const vibe = manifest.vibeString ?? '';
    const res = await fetch('/api/ai-meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generateMenu: true,
        occasion,
        vibe,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Pear couldn't write a menu (${res.status})`);
    }
    // /api/ai-meals returns { meals: [...] }, not { menu }.
    // Reading the wrong key meant successful AI runs surfaced
    // as "No meals returned" and Pear's output was dropped.
    const data = (await res.json()) as { meals?: Array<{ name: string; description?: string; dietaryTags?: string[] }> };
    const now = Date.now();
    const next: MealOption[] = (data.meals ?? []).map((m, i) => ({
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

  const smartActions: PanelSmartAction[] = [
    {
      label: 'Set the deadline',
      icon: 'calendar-check',
      onClick: () => {
        const el = document.querySelector('[data-pl-rsvp-deadline] input') as HTMLInputElement | null;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => el.focus(), 240);
        }
      },
      primary: true,
    },
    {
      label: 'Add a meal',
      icon: 'plus',
      onClick: addMeal,
    },
    {
      label: 'See responses',
      icon: 'users',
      onClick: () => {
        if (typeof window !== 'undefined') {
          window.open('/rsvps', '_blank');
        }
      },
    },
  ];

  // Layout slot — the Send-button look (Pearl / Crisp / Editorial /
  // Paper tag), pulse, custom label, sticky-on-mobile. Everything
  // here is about the CTA's visual treatment, not the data the
  // RSVP form collects.
  const layout = (
    <PanelGroup>
      <RsvpButtonStyleSection manifest={manifest} onChange={onChange} />
    </PanelGroup>
  );

  const content = (
    <PanelGroup>
      <PanelSection label="Deadline + gating" hint="Controls the RSVP CTA on your site.">
        <Field label="RSVP deadline" help="Shown as 'Kindly respond by …' above the form.">
          <div data-pl-rsvp-deadline>
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
          </div>
        </Field>
        <fieldset
          style={{
            border: 'none',
            padding: 0,
            margin: '6px 0 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <legend style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', padding: 0, marginBottom: 4 }}>
            What to collect
          </legend>
          <Toggle
            label="Allow plus-ones"
            help="Guests can note a plus-one name on the RSVP form."
            on={manifest.rsvpConfig?.plusOnes ?? true}
            onChange={(v) =>
              onChange({
                ...manifest,
                rsvpConfig: { ...(manifest.rsvpConfig ?? {}), plusOnes: v },
              })
            }
          />
          <Toggle
            label="Collect song requests"
            on={manifest.rsvpConfig?.songRequests ?? true}
            onChange={(v) =>
              onChange({
                ...manifest,
                rsvpConfig: { ...(manifest.rsvpConfig ?? {}), songRequests: v },
              })
            }
          />
          <Toggle
            label="Guestbook on published site"
            help="Shows a live guest wall on the Day-of page + published site."
            on={features.guestbook ?? false}
            onChange={(v) => onChange({ ...manifest, features: { ...features, guestbook: v } })}
          />
        </fieldset>
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
              title="Nothing yet"
              body="If you're serving dinner, add each plate — short rib, halibut, garden plate, etc."
              action={<AddRowButton label="Add first meal" onClick={addMeal} />}
            />
          }
          renderItem={(m, { handle }) => {
            const i = meals.findIndex((x) => x.id === m.id);
            return (
              <SortableRowCard
                handle={handle}
                deleteLabel={`Delete meal ${i + 1}${m.name ? `: ${m.name}` : ''}`}
                onDelete={() => setMeals(meals.filter((_, idx) => idx !== i))}
              >
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
                          aria-pressed={on}
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
    </PanelGroup>
  );

  return (
    <>
      <PanelSmartActions actions={smartActions} />
      <PanelTabs slots={{ content, layout }} />
    </>
  );
}

// ── RsvpButtonStyleSection ───────────────────────────────────
// One named-look picker + everything else under Advanced.
// Looks: Pearl (default — iridescent), Crisp (ink pill), Editorial
// (hairline outline), Tag (peach paper-tag). Pulse + custom label
// + sticky live one click deeper for hosts who want them.
type RsvpButtonShape = 'pearl' | 'pill' | 'hairline' | 'tag';
type RsvpButtonPulse = 'none' | 'breathe' | 'urgent';

interface RsvpButtonConfig {
  shape?: RsvpButtonShape;
  pulse?: RsvpButtonPulse;
  customLabel?: string;
  sticky?: boolean;
}

const RSVP_LOOKS: Array<{ id: RsvpButtonShape; label: string; hint: string }> = [
  { id: 'pearl',    label: 'Pearl',     hint: 'Iridescent fill — the editorial default.' },
  { id: 'pill',     label: 'Crisp',     hint: 'Solid ink pill. Reads architectural.' },
  { id: 'hairline', label: 'Editorial', hint: 'Hairline outline, ink type. Quietest option.' },
  { id: 'tag',      label: 'Paper tag', hint: 'Peach paper-tag silhouette. Playful + warm.' },
];

function RsvpButtonStyleSection({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const cfg: RsvpButtonConfig = manifest.rsvpButton ?? {};
  function set(patch: Partial<RsvpButtonConfig>) {
    const next: RsvpButtonConfig = { ...cfg, ...patch };
    Object.keys(next).forEach((k) => {
      const v = (next as Record<string, unknown>)[k];
      if (v === undefined || v === '') delete (next as Record<string, unknown>)[k];
    });
    onChange({
      ...manifest,
      rsvpButton: Object.keys(next).length ? next : undefined,
    });
  }

  const currentShape = cfg.shape ?? 'pearl';

  return (
    <PanelSection
      label="Send button"
      hint="The primary RSVP CTA. Pick a look; tune the rest under Advanced."
    >
      <Field label="Look">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
          {RSVP_LOOKS.map((l) => {
            const on = currentShape === l.id;
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={on}
                onClick={() => set({ shape: l.id === 'pearl' ? undefined : l.id })}
                title={l.hint}
                style={shapeBtn(on)}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </Field>

      <PanelDisclosure label="Advanced">
        <Field label="Pulse" help="Pulls the eye. Reserve 'urgent' for the week before the deadline.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {(['none', 'breathe', 'urgent'] as RsvpButtonPulse[]).map((p) => {
              const on = (cfg.pulse ?? 'none') === p;
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ pulse: p === 'none' ? undefined : p })}
                  style={shapeBtn(on)}
                >
                  {p[0].toUpperCase() + p.slice(1)}
                </button>
              );
            })}
          </div>
        </Field>
        <Field
          label="Button label"
          help="Defaults to 'Send RSVP'. Try 'Tell us you're coming' for a warmer voice."
          pearAction={{ block: 'rsvp', pass: 'rewrite-rsvp-prompt', label: 'Rewrite the RSVP prompt' }}
        >
          <TextInput
            value={cfg.customLabel ?? ''}
            onChange={(e) => set({ customLabel: e.target.value })}
            placeholder="Send RSVP"
          />
        </Field>
        <Field label="Sticky on mobile" help="Floating RSVP pill follows the guest as they scroll.">
          <button
            type="button"
            onClick={() => set({ sticky: cfg.sticky ? undefined : true })}
            style={{
              ...shapeBtn(!!cfg.sticky),
              width: '100%',
              justifyContent: 'flex-start',
              padding: '8px 12px',
            }}
          >
            {cfg.sticky ? '✓ Floating pill enabled' : 'Inline only (default)'}
          </button>
        </Field>
      </PanelDisclosure>
    </PanelSection>
  );
}

const shapeBtn = (on: boolean): React.CSSProperties => ({
  padding: '6px 8px',
  borderRadius: 6,
  background: on ? 'var(--ink, #0E0D0B)' : 'var(--card)',
  color: on ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft)',
  border: `1px solid ${on ? 'var(--ink, #0E0D0B)' : 'var(--line)'}`,
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: on ? 700 : 600,
  fontFamily: 'var(--font-ui)',
});
