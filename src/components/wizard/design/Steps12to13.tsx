'use client';

// Steps 12-13: Ready summary + Generating stage.
// The Generating stage is deliberately opaque about implementation —
// no "Gemini", no "Claude", no "API". Pear is a craftsperson; the
// user sees "weaving", "pressing", "binding". A curtain reveal opens
// at the end to hand off to the editor.

import { useEffect, useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../../marketing/design/DesignAtoms';
import { Scene, SceneDeco } from './WizardShell';
import { EVENTS } from './wizardSpec';
import type { StepProps } from './wizardAnswers';

// ── Step 12: READY ────────────────────────────────────────────
export function StepReady({ answers, set, back, next, dark }: StepProps) {
  const ev = EVENTS.find((e) => e.k === answers.occasion);
  const namesLine =
    answers.nameA && answers.nameB
      ? `${answers.nameA} & ${answers.nameB}`
      : answers.nameA ?? '';
  const date =
    answers.dateMode === 'specific' && answers.date
      ? new Date(answers.date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : answers.dateMode === 'season'
      ? answers.dateSeason
      : answers.dateMode === 'year' && answers.dateYear
      ? String(answers.dateYear)
      : answers.dateMode === 'tba'
      ? 'TBA'
      : '';

  const count = answers.photos?.length ?? 0;
  const vibe = answers.vibeName?.trim() || answers.palette?.name;
  const layout =
    !answers.storyLayoutPreference || answers.storyLayoutPreference === 'auto'
      ? 'Pear decides'
      : answers.storyLayoutPreference;

  const rows: Array<[string, string | undefined]> = [
    ['Event', ev?.l],
    ['Names', namesLine || undefined],
    ['When', date || undefined],
    ['Where', answers.venue || undefined],
    ['Photos', count ? `${count} added` : undefined],
    ['Vibe', vibe],
    ['Layout', layout],
    ['Song', answers.songMeta?.title ?? (answers.songUrl ? 'linked' : undefined)],
  ];

  return (
    <Scene deco={<SceneDeco variant="bloom-tl" />} dark={dark}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        <Pear size={64} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} animated />
        <div>
          <div
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            All threaded.{' '}
            <span
              style={{
                fontStyle: 'italic',
                color: PD.olive,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              Ready when you are.
            </span>
          </div>
          <div
            style={{
              fontSize: 15,
              color: dark ? 'rgba(244,236,216,0.72)' : PD.inkSoft,
              marginTop: 12,
              maxWidth: 520,
              lineHeight: 1.5,
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            Seven passes, about ninety seconds. You can change anything after.
          </div>
        </div>
      </div>

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
        <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginBottom: 14 }}>
          EDITION 01 · A HAND-TO-LOOM SUMMARY
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'max-content 1fr',
            gap: '14px 24px',
            alignItems: 'baseline',
          }}
        >
          {rows.map(([k, v]) =>
            v ? (
              <div key={k} style={{ display: 'contents' }}>
                <div
                  style={{
                    ...MONO_STYLE,
                    fontSize: 9,
                    opacity: 0.55,
                    paddingTop: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {k.toUpperCase()}
                </div>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 20,
                    fontStyle: 'italic',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    lineHeight: 1.2,
                  }}
                >
                  {v}
                </div>
              </div>
            ) : null,
          )}
        </div>

        {(answers.factSheet?.howWeMet || answers.factSheet?.why) && (
          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: '1px solid rgba(31,36,24,0.1)',
              fontSize: 13.5,
              fontStyle: 'italic',
              lineHeight: 1.55,
              fontFamily: '"Fraunces", Georgia, serif',
              opacity: 0.9,
            }}
          >
            &ldquo;{answers.factSheet?.why ?? answers.factSheet?.howWeMet}&rdquo;
          </div>
        )}

        {/* Opt-in AI logo */}
        <label
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: '1px solid rgba(31,36,24,0.1)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={!!answers.optInAILogo}
            onChange={(e) => set({ optInAILogo: e.target.checked })}
            style={{
              marginTop: 3,
              width: 16,
              height: 16,
              accentColor: PD.olive,
              cursor: 'pointer',
            }}
          />
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: dark ? PD.paper : PD.ink,
              }}
            >
              Draft me an artistic logo
            </div>
            <div
              style={{
                fontSize: 11.5,
                opacity: 0.6,
                marginTop: 3,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              Off by default. I&rsquo;ll set a typographic monogram unless you ask.
            </div>
          </div>
        </label>
      </div>

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={next}
          style={{
            background: PD.ink,
            color: PD.paper,
            border: 'none',
            borderRadius: 999,
            padding: '18px 44px',
            fontSize: 16,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.02em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 16px 40px rgba(31,36,24,0.25)',
          }}
        >
          Weave my site
          <span style={{ fontSize: 18 }}>→</span>
        </button>
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={back}
          style={{
            background: 'transparent',
            border: 'none',
            ...MONO_STYLE,
            fontSize: 10,
            color: dark ? 'rgba(244,236,216,0.6)' : PD.inkSoft,
            cursor: 'pointer',
            padding: '6px 12px',
          }}
        >
          ← CHANGE SOMETHING
        </button>
      </div>
    </Scene>
  );
}

// ── Step 13: GENERATING ──────────────────────────────────────
// No mention of model providers. Pear is "weaving", "pressing",
// "binding" — verbs from BRAND.md. When `done` flips true, a
// curtain reveal animation opens and `onDone` fires.
const STAGES = [
  { k: 'warp', t: 'Setting the warp', s: 'Drawing the threads.' },
  { k: 'weft', t: 'Running the weft', s: 'Passing the first strand.' },
  { k: 'press', t: 'Pressing type', s: 'Letterpress marks on the paper.' },
  { k: 'bind', t: 'Binding the edges', s: 'Folio, colophon, final rules.' },
  { k: 'breathe', t: 'Breathing it in', s: 'One last look from across the room.' },
] as const;

export function StepGenerating({
  progress,
  message,
  done,
  onDone,
  dark,
}: {
  progress: number;
  message?: string;
  done: boolean;
  onDone: () => void;
  dark?: boolean;
}) {
  const [reveal, setReveal] = useState(false);
  const stageIdx = Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length));
  const stage = STAGES[stageIdx];

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setReveal(true), 300);
    const t2 = setTimeout(() => onDone(), 1700);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [done, onDone]);

  return (
    <Scene deco={<SceneDeco variant="ink" />} dark={dark}>
      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
        }}
      >
        <div style={{ position: 'relative' }}>
          <Pear size={104} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} animated />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: -20,
              border: `1.5px dashed ${PD.gold}`,
              borderRadius: 999,
              animation: 'pl-weave-travel 4s linear infinite',
              opacity: 0.6,
            }}
          />
        </div>

        <div style={{ ...MONO_STYLE, fontSize: 10, color: PD.olive, opacity: 0.85 }}>
          {stage.k.toUpperCase()} · {Math.round(progress * 100)}%
        </div>

        <div
          style={{
            ...DISPLAY_STYLE,
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontStyle: 'italic',
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            color: dark ? PD.paper : PD.ink,
            lineHeight: 1.1,
          }}
        >
          {stage.t}
        </div>

        <div
          style={{
            fontSize: 15,
            color: dark ? 'rgba(244,236,216,0.75)' : PD.inkSoft,
            lineHeight: 1.55,
            maxWidth: 440,
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          {message ?? stage.s}
        </div>

        <div
          style={{
            width: '100%',
            maxWidth: 340,
            height: 2,
            background: 'rgba(31,36,24,0.1)',
            borderRadius: 999,
            overflow: 'hidden',
            marginTop: 4,
          }}
        >
          <div
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${PD.olive}, ${PD.gold})`,
              transition: 'width 700ms cubic-bezier(.22,1,.36,1)',
            }}
          />
        </div>

        <div
          style={{
            ...MONO_STYLE,
            fontSize: 9,
            color: PD.olive,
            opacity: 0.6,
            marginTop: 8,
          }}
        >
          DON&rsquo;T CLOSE THIS TAB
        </div>
      </div>

      {/* Curtain reveal — two halves open when done */}
      {done && (
        <>
          <div
            aria-hidden
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '50vw',
              height: '100vh',
              background: dark ? PD.ink : PD.paper,
              zIndex: 500,
              transform: reveal ? 'translateX(-100%)' : 'translateX(0)',
              transition: 'transform 1.4s cubic-bezier(.7, 0, .2, 1)',
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '50vw',
              height: '100vh',
              background: dark ? PD.ink : PD.paper,
              zIndex: 500,
              transform: reveal ? 'translateX(100%)' : 'translateX(0)',
              transition: 'transform 1.4s cubic-bezier(.7, 0, .2, 1)',
              pointerEvents: 'none',
            }}
          />
          {/* Gold seam */}
          <div
            aria-hidden
            style={{
              position: 'fixed',
              top: 0,
              left: '50%',
              width: 2,
              height: '100vh',
              background: PD.gold,
              zIndex: 501,
              opacity: reveal ? 0 : 1,
              transition: 'opacity 600ms ease',
              pointerEvents: 'none',
            }}
          />
        </>
      )}
    </Scene>
  );
}
