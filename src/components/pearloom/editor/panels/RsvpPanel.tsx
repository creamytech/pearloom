'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx RsvpEditor.
   The 4 question toggles now write manifest.rsvpConfig.{mealChoice,
   dietary, songRequest, plusOne} — the canonical shape the RSVP
   form + canvas read. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, FSuggest, FToggleStandalone, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';
import { FSelect } from './_form-atoms';
import { FDate } from './_form-atoms';
import { mealOptionSuggestions } from './_suggestions';

interface MealOption { name: string }

interface RsvpConfig {
  mealChoice?: boolean;
  dietary?: boolean;
  songRequest?: boolean;
  plusOne?: boolean;
  /** Canonical meal-option list the GuestRsvpModal renders. When
   *  the host hasn't customized it, the guest form falls back to
   *  Chicken / Fish / Vegetarian. */
  mealOptions?: MealOption[];
}

export function RsvpPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'rsvp');
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const mealSet = mealOptionSuggestions(occasion);
  const [rsvpEyebrow, setRsvpEyebrow] = useCopyOverride(manifest, onChange, 'rsvpEyebrow');
  const [rsvpCta, setRsvpCta] = useCopyOverride(manifest, onChange, 'rsvpCta');
  const loose = manifest as unknown as { rsvpDeadline?: string; rsvpConfig?: RsvpConfig };
  const replyBy = loose.rsvpDeadline ?? 'April 28, 2027';
  const config: RsvpConfig = loose.rsvpConfig ?? { mealChoice: true, dietary: true, songRequest: true, plusOne: false };
  const mealOptions: MealOption[] = Array.isArray(config.mealOptions) && config.mealOptions.length > 0
    ? config.mealOptions
    : [{ name: 'Chicken' }, { name: 'Fish' }, { name: 'Vegetarian' }];

  const setReplyBy = (v: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    rsvpDeadline: v,
  } as unknown as StoryManifest);

  const patchConfig = (next: Partial<RsvpConfig>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    rsvpConfig: { ...config, ...next },
  } as unknown as StoryManifest);
  const setToggle = (k: keyof RsvpConfig, v: boolean) => patchConfig({ [k]: v } as Partial<RsvpConfig>);

  const setMealOption = (i: number, name: string) =>
    patchConfig({ mealOptions: mealOptions.map((o, idx) => idx === i ? { ...o, name } : o) });
  const removeMealOption = (i: number) =>
    patchConfig({ mealOptions: mealOptions.filter((_, idx) => idx !== i) });
  const addMealOption = (name = 'New option') =>
    patchConfig({ mealOptions: [...mealOptions, { name }] });
  /* Quick-add chips for meal options the host hasn't added yet. */
  const remainingMealQuickAdds = mealSet.options.filter(
    (o) => !mealOptions.some((m) => m.name.trim().toLowerCase() === o.toLowerCase()),
  );

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
          <FInput value={rsvpEyebrow} onChange={setRsvpEyebrow} placeholder="RSVP by April 28" />
        </FGroup>
        <FGroup label="Reply by">
          <FDate value={replyBy} onChange={setReplyBy} placeholder="Pick a deadline" />
        </FGroup>
        <FGroup label="Button label" hint="Shown on the RSVP CTA.">
          <FInput value={rsvpCta} onChange={setRsvpCta} placeholder="RSVP" />
        </FGroup>
        <FGroup label="Questions to ask">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FToggleStandalone label="Meal choice" sub={mealOptions.map((o) => o.name).join(' · ')} def={!!config.mealChoice} onChange={(v) => setToggle('mealChoice', v)} />
            <FToggleStandalone label="Dietary restrictions" def={!!config.dietary} onChange={(v) => setToggle('dietary', v)} />
            <FToggleStandalone label="Song request" def={!!config.songRequest} onChange={(v) => setToggle('songRequest', v)} />
            <FToggleStandalone label="Plus-one" def={!!config.plusOne} onChange={(v) => setToggle('plusOne', v)} />
            <AddCard label="Add a custom question" />
          </div>
        </FGroup>
        {config.mealChoice && (
          <FGroup label={`Meal options · ${mealOptions.length}`} hint="These show up as pills on the guest RSVP form.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {mealOptions.map((o, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <FSuggest
                      value={o.name}
                      onChange={(v) => setMealOption(i, v)}
                      placeholder="Beef"
                      options={mealSet.options.filter((opt) => !mealOptions.some((existing, idx) => idx !== i && existing.name.trim().toLowerCase() === opt.toLowerCase()))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMealOption(i)}
                    aria-label={`Remove ${o.name}`}
                    style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)' }}
                  >
                    <Icon name="close" size={12} />
                  </button>
                </div>
              ))}
              <AddCard label="Add a meal option" onClick={() => addMealOption('')} />
              {remainingMealQuickAdds.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                  {remainingMealQuickAdds.slice(0, 8).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => addMealOption(q)}
                      style={{
                        fontSize: 11.5, fontWeight: 600,
                        padding: '4px 9px', borderRadius: 999,
                        background: 'var(--cream-2)', color: 'var(--ink-soft)',
                        border: '1px solid var(--line)', cursor: 'pointer',
                      }}
                    >
                      + {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FGroup>
        )}
        <FGroup label="After they reply" hint="Pear nudges non-responders on the schedule you pick.">
          <ReminderCadencePicker manifest={manifest} onChange={onChange} />
        </FGroup>
        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="RSVP" />
      </div>
    </SectionPanelShell>
  );
}

export default RsvpPanel;

/* ─── ReminderCadencePicker ───────────────────────────────────
   Persists manifest.reminderCadence — 'off', 'gentle' (1wk
   before deadline), 'standard' (2wk + 1wk + 72h), or 'firm'
   (weekly until they reply). Pear's cron worker reads this when
   running the chase-non-responders job. */

function ReminderCadencePicker({
  manifest, onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const loose = manifest as unknown as { reminderCadence?: string };
  const value = loose.reminderCadence ?? 'off';
  const setValue = (next: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    reminderCadence: next,
  } as unknown as StoryManifest);

  const HINTS: Record<string, string> = {
    'off':      'No automatic nudges. You can still send manual ones from the Guests panel.',
    'gentle':   'One reminder, one week before your reply-by date.',
    'standard': 'Two weeks before · One week before · 72 hours before.',
    'firm':     'Weekly nudges until each guest replies.',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <FSelect
        value={value}
        onChange={setValue}
        options={[
          { value: 'off',      label: 'Off — no nudges',          hint: 'Manual sends only' },
          { value: 'gentle',   label: 'Gentle — 1 reminder',      hint: '1 week before deadline' },
          { value: 'standard', label: 'Standard — 3 reminders',   hint: '2wk · 1wk · 72h' },
          { value: 'firm',     label: 'Firm — weekly',            hint: 'Until they reply' },
        ]}
        icon="clock"
      />
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
        {HINTS[value]}
      </div>
    </div>
  );
}
