'use client';

// Steps 4-6: Date (with dateMode picker), Venue (+ guest count),
// Event details (conditional on occasion needing days/memory/school)

import { useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../../marketing/design/DesignAtoms';
import { Scene, SceneDeco, StepHead, StepNav } from './WizardShell';
import { EVENTS } from './wizardSpec';
import type { StepProps } from './wizardAnswers';
import { NumberInput, DatePicker } from '@/components/pearloom/editor/v8-forms';

// ── Step 4: DATE with dateMode picker ─────────────────────────
export function StepDate({ answers, set, next, back, skip, dark }: StepProps) {
  const mode = answers.dateMode ?? null;

  const cardStyle = (active: boolean): React.CSSProperties => ({
    padding: '22px 20px',
    background: active ? PD.ink : PD.paperCard,
    color: active ? PD.paper : PD.ink,
    border: `1.5px solid ${active ? PD.ink : 'rgba(31,36,24,0.12)'}`,
    borderRadius: 18,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    minHeight: 120,
    transition: 'all 200ms',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 6,
  });

  return (
    <Scene deco={<SceneDeco variant="bloom-tl" />} dark={dark}>
      <StepHead stepKey="date" dark={dark} />

      {/* Mode picker — specific / season / year / tba */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginTop: 16,
        }}
      >
        {(
          [
            { k: 'specific', t: 'A specific day', s: 'Pick it on the calendar.' },
            { k: 'season', t: 'A season', s: "'Late summer', 'early fall'." },
            { k: 'year', t: 'A year', s: 'Sometime in 2026.' },
            { k: 'tba', t: 'TBA', s: "Not locked yet. That's fine." },
          ] as const
        ).map((m) => (
          <button
            key={m.k}
            onClick={() => set({ dateMode: m.k })}
            style={cardStyle(mode === m.k)}
          >
            <div style={{ ...DISPLAY_STYLE, fontSize: 20, fontWeight: 400, letterSpacing: '-0.015em' }}>
              {m.t}
            </div>
            <div
              style={{
                fontSize: 13,
                opacity: 0.72,
                lineHeight: 1.5,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              {m.s}
            </div>
          </button>
        ))}
      </div>

      {/* Branch-specific input */}
      {mode && (
        <div style={{ marginTop: 28 }}>
          {mode === 'specific' && (
            <div
              style={{
                background: dark ? 'rgba(244,236,216,0.05)' : PD.paperCard,
                border: '1px solid rgba(31,36,24,0.1)',
                borderRadius: 18,
                padding: '24px 28px',
              }}
            >
              <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginBottom: 10 }}>
                THE DAY
              </div>
              <DatePicker
                value={answers.date ?? ''}
                onChange={(v) => set({ date: v })}
                placeholder="Pick the day"
                ariaLabel="Event date"
              />
            </div>
          )}
          {mode === 'season' && (
            <div
              style={{
                background: dark ? 'rgba(244,236,216,0.05)' : PD.paperCard,
                border: '1px solid rgba(31,36,24,0.1)',
                borderRadius: 18,
                padding: '24px 28px',
              }}
            >
              <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginBottom: 10 }}>
                ROUGHLY
              </div>
              <input
                autoFocus
                value={answers.dateSeason ?? ''}
                onChange={(e) => set({ dateSeason: e.target.value })}
                placeholder="Late summer 2026"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '2px solid rgba(31,36,24,0.25)',
                  outline: 'none',
                  padding: '8px 2px',
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontSize: 28,
                  fontStyle: 'italic',
                  color: dark ? PD.paper : PD.ink,
                }}
              />
            </div>
          )}
          {mode === 'year' && (
            <div
              style={{
                background: dark ? 'rgba(244,236,216,0.05)' : PD.paperCard,
                border: '1px solid rgba(31,36,24,0.1)',
                borderRadius: 18,
                padding: '24px 28px',
              }}
            >
              <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginBottom: 10 }}>
                THE YEAR
              </div>
              <NumberInput
                value={answers.dateYear ?? new Date().getFullYear() + 1}
                onChange={(n) => set({ dateYear: n })}
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 5}
                width={140}
                ariaLabel="Event year"
              />
            </div>
          )}
          {mode === 'tba' && (
            <div
              style={{
                fontSize: 13,
                color: dark ? 'rgba(244,236,216,0.7)' : PD.inkSoft,
                fontStyle: 'italic',
                fontFamily: '"Fraunces", Georgia, serif',
                padding: '18px 4px',
              }}
            >
              Got it. I&rsquo;ll skip the countdown and write copy that doesn&rsquo;t fake a
              specific day.
            </div>
          )}
        </div>
      )}

      <StepNav
        onBack={back}
        onNext={next}
        onSkip={skip}
        nextDisabled={
          !mode ||
          (mode === 'specific' && !answers.date) ||
          (mode === 'season' && !answers.dateSeason?.trim()) ||
          (mode === 'year' && !answers.dateYear)
        }
      />
    </Scene>
  );
}

// ── Step 5: VENUE + guestCount ─────────────────────────────────
export function StepVenue({ answers, set, next, back, skip, dark }: StepProps) {
  const [draft, setDraft] = useState(answers.venue ?? '');

  const sizeLabel = (
    s: 'small' | 'medium' | 'large' | number | undefined,
  ): string => {
    if (s === undefined) return '';
    if (typeof s === 'number') return String(s);
    return s;
  };

  return (
    <Scene deco={<SceneDeco variant="bloom-tl" />} dark={dark}>
      <StepHead stepKey="venue" dark={dark} />
      <div
        style={{
          background: dark ? 'rgba(244,236,216,0.05)' : PD.paperCard,
          border: '1px solid rgba(31,36,24,0.1)',
          borderRadius: 24,
          padding: '32px 36px',
          maxWidth: 760,
          margin: '0 auto',
        }}
      >
        <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginBottom: 10 }}>PLACE</div>
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            set({ venue: e.target.value });
          }}
          placeholder="Hollow Barn, Point Reyes"
          autoFocus
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '2px solid rgba(31,36,24,0.25)',
            outline: 'none',
            padding: '8px 2px',
            fontFamily: '"Fraunces", Georgia, serif',
            fontSize: 28,
            fontStyle: 'italic',
            color: dark ? PD.paper : PD.ink,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        />

        {/* Guest count — bucket or exact */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(31,36,24,0.1)' }}>
          <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginBottom: 10 }}>
            HOW MANY PEOPLE
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {(
              [
                { k: 'small', l: 'Small', s: 'under 40' },
                { k: 'medium', l: 'Medium', s: '40-120' },
                { k: 'large', l: 'Large', s: '120+' },
              ] as const
            ).map((b) => {
              const active = answers.guestCount === b.k;
              return (
                <button
                  key={b.k}
                  onClick={() => set({ guestCount: b.k })}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 999,
                    background: active ? PD.ink : 'transparent',
                    color: active ? PD.paper : dark ? PD.paper : PD.ink,
                    border: `1px solid ${active ? PD.ink : 'rgba(31,36,24,0.18)'}`,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 2,
                    lineHeight: 1.2,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{b.l}</span>
                  <span style={{ fontSize: 10.5, opacity: 0.6 }}>{b.s}</span>
                </button>
              );
            })}
            <span
              style={{
                ...MONO_STYLE,
                fontSize: 10,
                opacity: 0.55,
                margin: '0 10px',
              }}
            >
              OR
            </span>
            <NumberInput
              value={typeof answers.guestCount === 'number' ? answers.guestCount : 0}
              onChange={(n) => set({ guestCount: n || undefined })}
              min={0}
              max={2000}
              width={120}
              unit="guests"
              ariaLabel="Exact guest count"
            />
          </div>
          {answers.guestCount !== undefined && (
            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                opacity: 0.55,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              Selected: {sizeLabel(answers.guestCount)}
            </div>
          )}
        </div>

        {/* TBD shortcut */}
        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              setDraft('TBD');
              set({ venue: 'TBD' });
            }}
            style={{
              background: 'transparent',
              border: '1px dashed rgba(31,36,24,0.2)',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 12,
              color: dark ? 'rgba(244,236,216,0.75)' : PD.inkSoft,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Venue TBD
          </button>
        </div>
      </div>
      <StepNav onBack={back} onNext={next} onSkip={skip} nextDisabled={!draft.trim()} />
    </Scene>
  );
}

// ── Step 5.5: EVENT DETAILS (conditional) ─────────────────────
export function StepDetails({ answers, set, next, back, skip, dark }: StepProps) {
  const ev = EVENTS.find((e) => e.k === answers.occasion);
  const days = ev?.days;
  const memory = ev?.memory;
  const school = ev?.school;
  const d = answers.eventDetails ?? {};

  return (
    <Scene deco={<SceneDeco variant="bloom-tl" />} dark={dark}>
      <StepHead stepKey="details" dark={dark} />
      <div
        style={{
          background: dark ? 'rgba(244,236,216,0.05)' : PD.paperCard,
          border: '1px solid rgba(31,36,24,0.1)',
          borderRadius: 24,
          padding: '32px 36px',
          maxWidth: 720,
          margin: '0 auto',
          display: 'grid',
          gap: 22,
        }}
      >
        {days && (
          <Field label="HOW MANY DAYS" dark={dark}>
            <NumberInput
              value={d.days ?? 3}
              onChange={(n) => set({ eventDetails: { ...d, days: n } })}
              min={1}
              max={10}
              width={140}
              unit="days"
              ariaLabel="Trip duration in days"
            />
          </Field>
        )}
        {memory && (
          <>
            <Field label="LIVESTREAM LINK (OPTIONAL)" dark={dark}>
              <input
                value={d.livestreamUrl ?? ''}
                onChange={(e) => set({ eventDetails: { ...d, livestreamUrl: e.target.value } })}
                placeholder="zoom.us/… or vimeo.com/…"
                style={fieldInput(dark)}
              />
            </Field>
            <Field label="IN MEMORY OF / DONATIONS" dark={dark}>
              <input
                value={d.inMemoryOf ?? ''}
                onChange={(e) => set({ eventDetails: { ...d, inMemoryOf: e.target.value } })}
                placeholder="Donations to the Monarch Foundation"
                style={fieldInput(dark)}
              />
            </Field>
          </>
        )}
        {school && (
          <Field label="SCHOOL" dark={dark}>
            <input
              value={d.school ?? ''}
              onChange={(e) => set({ eventDetails: { ...d, school: e.target.value } })}
              placeholder="Wesleyan"
              style={fieldInput(dark)}
            />
          </Field>
        )}

        {/* Fact sheet — these are the grounding anchors */}
        <div style={{ paddingTop: 18, borderTop: '1px solid rgba(31,36,24,0.1)' }}>
          <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginBottom: 10 }}>
            TWO OR THREE THINGS I SHOULD KNOW (OPTIONAL)
          </div>
          <div
            style={{
              fontSize: 12.5,
              opacity: 0.7,
              marginBottom: 14,
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            These anchor my writing. Skip any you don&rsquo;t have a clean answer for.
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="HOW YOU MET / HOW THIS EVENT CAME TOGETHER" dark={dark}>
              <textarea
                rows={2}
                value={answers.factSheet?.howWeMet ?? ''}
                onChange={(e) =>
                  set({ factSheet: { ...answers.factSheet, howWeMet: e.target.value } })
                }
                placeholder="On a dog-walking app in 2019. Both of us ignored it."
                style={{ ...fieldInput(dark), resize: 'vertical', fontFamily: 'inherit', fontStyle: 'normal', fontSize: 14 }}
              />
            </Field>
            <Field label="WHY THIS MATTERS" dark={dark}>
              <textarea
                rows={2}
                value={answers.factSheet?.why ?? ''}
                onChange={(e) =>
                  set({ factSheet: { ...answers.factSheet, why: e.target.value } })
                }
                placeholder="Ten years quiet. Now it's the whole family."
                style={{ ...fieldInput(dark), resize: 'vertical', fontFamily: 'inherit', fontStyle: 'normal', fontSize: 14 }}
              />
            </Field>
            <Field label="FAVORITE THING (OPTIONAL)" dark={dark}>
              <input
                value={answers.factSheet?.favorite ?? ''}
                onChange={(e) =>
                  set({ factSheet: { ...answers.factSheet, favorite: e.target.value } })
                }
                placeholder="He makes me laugh before coffee."
                style={{ ...fieldInput(dark), fontFamily: 'inherit', fontStyle: 'normal', fontSize: 14 }}
              />
            </Field>
          </div>
        </div>
      </div>
      <StepNav onBack={back} onNext={next} onSkip={skip} />
    </Scene>
  );
}

// ── Field primitives for step 5/6 ─────────────────────────────
function Field({
  label,
  dark,
  children,
}: {
  label: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>{label}</span>
      {children}
      <span aria-hidden style={{ display: 'none' }}>{dark ? '' : ''}</span>
    </label>
  );
}

function fieldInput(dark?: boolean): React.CSSProperties {
  return {
    padding: '10px 14px',
    background: dark ? 'rgba(244,236,216,0.05)' : PD.paper3,
    border: '1px solid rgba(31,36,24,0.12)',
    borderRadius: 10,
    fontFamily: '"Fraunces", Georgia, serif',
    fontStyle: 'italic',
    fontSize: 18,
    outline: 'none',
    color: dark ? PD.paper : PD.ink,
    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
  };
}
