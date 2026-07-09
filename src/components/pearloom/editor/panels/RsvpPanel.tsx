'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx RsvpEditor.
   The 4 question toggles now write manifest.rsvpConfig.{mealChoice,
   dietary, songRequest, plusOne} — the canonical shape the RSVP
   form + canvas read. */

import { useEffect, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, FSuggest, FToggleStandalone, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';
import { FSelect } from './_form-atoms';
import { FDate } from './_form-atoms';
import { mealOptionSuggestions } from './_suggestions';

interface MealOption { name: string }

/* ─── defaultReplyBy ──────────────────────────────────────────
   Derive the reply-by DEFAULT from the event date — 14 days
   before, formatted in the same long style FDate emits
   ("April 14, 2027"). manifest.logistics.date is a display
   string (long form from FDate, or ISO from older wizard runs),
   so parse defensively and fall back to the legacy placeholder
   when nothing parses. An explicit host-set rsvpDeadline always
   wins — this only changes the default. */
const REPLY_BY_FALLBACK = 'April 28, 2027';
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
function defaultReplyBy(eventDate: string | undefined): string {
  const trimmed = (eventDate ?? '').trim();
  if (!trimmed) return REPLY_BY_FALLBACK;
  let d: Date | null = null;
  /* ISO yyyy-mm-dd — parse as local time to avoid tz drift. */
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
  } else {
    const ms = Date.parse(trimmed);
    d = Number.isNaN(ms) ? null : new Date(ms);
  }
  if (!d || Number.isNaN(d.getTime())) return REPLY_BY_FALLBACK;
  d.setDate(d.getDate() - 14);
  return `${MONTHS_FULL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

interface RsvpConfig {
  mealChoice?: boolean;
  dietary?: boolean;
  songRequest?: boolean;
  plusOne?: boolean;
  /** Legacy twin of plusOne — the wizard's "Plus-ones welcome"
   *  pick writes this plural key (the name typed in
   *  StoryManifest). The toggle below reads whichever is set and
   *  writes both so every reader agrees. */
  plusOnes?: boolean;
  /** Invitation-only replies — /api/rsvp rejects emails that
   *  aren't already on the guest list. Default off (open RSVP). */
  guestListOnly?: boolean;
  /** Canonical meal-option list the GuestRsvpModal renders. When
   *  the host hasn't customized it, the guest form falls back to
   *  Chicken / Fish / Vegetarian. */
  mealOptions?: MealOption[];
}

export function RsvpPanel({ manifest, onChange, siteSlug }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void; siteSlug?: string }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'rsvp');
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const mealSet = mealOptionSuggestions(occasion);
  const [rsvpEyebrow, setRsvpEyebrow] = useCopyOverride(manifest, onChange, 'rsvpEyebrow');
  const [rsvpCta, setRsvpCta] = useCopyOverride(manifest, onChange, 'rsvpCta');
  const loose = manifest as unknown as { rsvpDeadline?: string; rsvpConfig?: RsvpConfig };
  const replyBy = loose.rsvpDeadline ?? defaultReplyBy(manifest.logistics?.date);
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
        {/* ── Zip RsvpEditor layout (section-fields.jsx L286-304):
              Reply by · Questions to ask · After they reply. The
              production-only extras (eyebrow, button label, who-can-
              reply, meal-option editor, show-who's-going) live tucked
              under "More" below so the default view is 1:1. */}
        <FGroup label="Reply by">
          <FDate value={replyBy} onChange={setReplyBy} placeholder="Pick a deadline" />
        </FGroup>
        <FGroup label="Questions to ask">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FToggleStandalone label="Meal choice" sub={mealOptions.map((o) => o.name).join(' · ')} def={!!config.mealChoice} onChange={(v) => setToggle('mealChoice', v)} />
            <FToggleStandalone label="Dietary restrictions" def={!!config.dietary} onChange={(v) => setToggle('dietary', v)} />
            <FToggleStandalone label="Song request" def={!!config.songRequest} onChange={(v) => setToggle('songRequest', v)} />
            <FToggleStandalone label="Plus-one" def={config.plusOne ?? config.plusOnes ?? false} onChange={(v) => patchConfig({ plusOne: v, plusOnes: v })} />
            {/* "Add a custom question" omitted — the zip's AddCard had
                no handler and no data model behind it. Restore with
                real custom-question support, not before. */}
          </div>
        </FGroup>
        <FGroup label="After they reply" hint="Pear nudges non-responders on the schedule you pick.">
          <ReminderCadencePicker manifest={manifest} onChange={onChange} />
        </FGroup>
        <FGroup label="The Loom" hint="A living tapestry above your RSVP, it grows denser as your day approaches. No names are shown, just the threads.">
          <FToggleStandalone
            label="The Loom, every reply weaves a thread"
            sub={manifest.rsvpLoom
              ? 'Each attending reply weaves one more thread into the cloth.'
              : 'Off, the RSVP section stays as-is.'}
            def={!!manifest.rsvpLoom}
            onChange={(v) => onChange({
              ...(manifest as unknown as Record<string, unknown>),
              rsvpLoom: v,
            } as unknown as StoryManifest)}
          />
        </FGroup>

        <details className="pl-panel-more">
          <summary
            style={{
              cursor: 'pointer', listStyle: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em',
              textTransform: 'uppercase', color: 'var(--ink-muted)',
            }}
          >
            <Icon name="chev-down" size={12} /> More, eyebrow, button, meals, who can reply
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
            <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
              <FInput value={rsvpEyebrow} onChange={setRsvpEyebrow} placeholder="RSVP by April 28" />
            </FGroup>
            <FGroup label="Button label" hint="Shown on the RSVP CTA.">
              <FInput value={rsvpCta} onChange={setRsvpCta} placeholder="RSVP" />
            </FGroup>
            <FGroup label="Who can reply" hint="Off: anyone with the link can RSVP. On: only emails already on your guest list (or personal invite links) get through.">
              <FToggleStandalone
                label="Guest list only"
                sub="Replies must match an invited email"
                def={!!config.guestListOnly}
                onChange={(v) => setToggle('guestListOnly', v)}
              />
            </FGroup>
            {config.mealChoice && (
              <FGroup label={`Meal options · ${mealOptions.length}`} hint="These show up as pills on the guest RSVP form.">
                <MealCounts siteSlug={siteSlug} mealOptions={mealOptions.map((o) => o.name)} />
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
            <FGroup label="Show who's going" hint="A small avatar pile + count of attending guests under the RSVP button. Defaults on for casual events (birthdays, reunions, bachelor parties), off for weddings + memorials.">
              <ShowGoingToggle manifest={manifest} onChange={onChange} />
            </FGroup>
          </div>
        </details>

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
  /* Unset = the cadence preset as shipped (both reminders) — the
     old 'off' default lied: the Cadence page showed reminders
     regardless. Legacy 'firm' (a weekly schedule that never
     existed) reads as standard. */
  const raw = loose.reminderCadence;
  const value = raw === 'firm' || !raw ? 'standard' : raw;
  const setValue = (next: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    reminderCadence: next,
  } as unknown as StoryManifest);

  const HINTS: Record<string, string> = {
    'off':      'No automatic reminder phases. You can still send manual nudges from the Guests panel.',
    'gentle':   'One reminder phase before your reply-by date.',
    'standard': 'Both reminder phases, the full cadence.',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <FSelect
        value={value}
        onChange={setValue}
        options={[
          { value: 'off', label: 'Off, no nudges', hint: 'Manual sends only' },
          { value: 'gentle', label: 'Gentle, 1 reminder', hint: 'One phase before the deadline' },
          { value: 'standard', label: 'Standard, 2 reminders', hint: 'The full cadence' },
        ]}
        icon="clock"
      />
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
        {HINTS[value]} Your pick shapes the phases on the Cadence page.
      </div>
    </div>
  );
}

/* ─── MealCounts ──────────────────────────────────────────────
   Live count of how many guests have picked each meal option.
   Fetches /api/guests once on mount; renders nothing when there
   are no responses yet (no point showing "Chicken: 0 · Fish: 0")
   or when siteSlug is missing. */

function MealCounts({ siteSlug, mealOptions }: { siteSlug?: string; mealOptions: string[] }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!siteSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/guests?siteSlug=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json() as { guests?: Array<{ status?: string; mealPreference?: string | null }> };
        const guests = data.guests ?? [];
        const tally: Record<string, number> = {};
        for (const g of guests) {
          if (g.status !== 'attending' || !g.mealPreference) continue;
          const key = g.mealPreference.trim();
          if (!key) continue;
          tally[key] = (tally[key] ?? 0) + 1;
        }
        if (!cancelled) setCounts(tally);
      } catch { /* ignore, counts stay null */ }
    })();
    return () => { cancelled = true; };
  }, [siteSlug]);

  if (!counts) return null;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div style={{
      marginBottom: 10, padding: '8px 10px',
      borderRadius: 9,
      background: 'var(--sage-bg)',
      border: '1px solid rgba(92,107,63,0.18)',
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--sage-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        Picks so far · {total} guest{total === 1 ? '' : 's'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {mealOptions.map((m) => {
          const n = counts[m] ?? 0;
          return (
            <span
              key={m}
              style={{
                fontSize: 11, fontWeight: 600,
                color: n > 0 ? 'var(--sage-deep)' : 'var(--ink-muted)',
                padding: '3px 8px', borderRadius: 999,
                background: n > 0 ? '#fff' : 'transparent',
                border: n > 0 ? '1px solid rgba(92,107,63,0.18)' : '1px dashed var(--line)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {m} · {n}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ─── ShowGoingToggle ─────────────────────────────────────────
   Boolean toggle for manifest.rsvpShowGoing. Tristate-aware:
   undefined falls through to event-type defaults (on for casual,
   off for weddings/memorials). Explicit pick wins. */

function ShowGoingToggle({
  manifest, onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const loose = manifest as unknown as { rsvpShowGoing?: boolean; occasion?: string };
  const occ = loose.occasion ?? 'wedding';
  const PUBLIC = new Set(['bachelor-party', 'bachelorette-party', 'bridal-shower', 'baby-shower', 'reunion', 'milestone-birthday', 'birthday', 'sweet-sixteen', 'engagement', 'housewarming', 'gender-reveal', 'sip-and-see']);
  const defaultEnabled = PUBLIC.has(occ);
  const current = loose.rsvpShowGoing ?? defaultEnabled;
  const setVal = (v: boolean) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    rsvpShowGoing: v,
  } as unknown as StoryManifest);
  return (
    <FToggleStandalone
      label={current ? 'Showing attendee pile' : 'Hidden, private guest list'}
      sub={current
        ? 'Guests see a small attendee pile + count under the RSVP button, real replies only.'
        : 'Standard for weddings + memorials. Your guest list stays private.'}
      def={current}
      onChange={setVal}
    />
  );
}
