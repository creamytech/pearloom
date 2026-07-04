'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/wizard/GeneratingScreen.tsx
//
// Full-bleed generating overlay shown while the wizard presses
// runs. Matches the v8 paper + motif system instead of the
// previous grey-scrim modal.
//
// Visual anchors:
//   - Cream paper full-bleed with three drifting tone-blobs
//   - A central Pear mascot that gently breathes (Float)
//   - A seven-step "loom" list that ticks as progress events
//     arrive (supports best-effort matching from server labels)
//   - A Fraunces italic currentStep line with an editorial
//     kicker ("WEAVING STEP 3 OF 7")
//   - Respectful of prefers-reduced-motion via the motion
//     primitive's internal guards.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { Blob, Icon, Pear, Sparkle, Squiggle } from '../motifs';
import { AmbientSprig, AmbientThread } from '../ambient';
import { Float, Reveal } from '../motion';

interface Stage {
  id: string;
  label: string;
  hint: string;
  /** Server labels that should mark this stage as "done" when seen. */
  matches: RegExp[];
}

/* The "make-ready" script — both paths build the site locally in
   about a second, so the press itself is the story. Labels are
   driven by WizardV8's pressScript at a measured cadence. Photo
   runs get one extra stage while the cover + gallery are placed. */
const PRESS_STAGES: Stage[] = [
  {
    id: 'type',
    label: 'Setting your names in type',
    hint: 'Fraunces italic, pressed into the paper.',
    matches: [/names in type/i],
  },
  {
    id: 'palette',
    label: 'Mixing the palette',
    hint: 'Your colors pulled across paper, ink, and accent.',
    matches: [/mixing the palette/i],
  },
  {
    id: 'kit',
    label: 'Cutting the component kit',
    hint: 'Cards, rows, and seams in the look you chose.',
    matches: [/component kit/i],
  },
  {
    id: 'sections',
    label: 'Laying out the sections',
    hint: 'Schedule, RSVP, travel — seeded from your answers.',
    matches: [/laying out the sections/i],
  },
  {
    id: 'story',
    label: 'Setting your story in type',
    hint: 'Pear drafts your words; you make them yours in the editor.',
    matches: [/story in type|drafting|gathering your words|setting your (story|words)/i],
  },
  {
    id: 'press',
    label: 'Pressing the proof',
    hint: 'One pass through the press, then the editor opens.',
    matches: [/pressing the proof|already prepared|unrolling/i],
  },
];

/* Photo runs: same press, one extra stage between palette and kit. */
const PRESS_STAGES_WITH_PHOTOS: Stage[] = [
  PRESS_STAGES[0],
  PRESS_STAGES[1],
  {
    id: 'photos',
    label: 'Placing your photographs',
    hint: 'Your first photo becomes the cover; the rest fill the gallery.',
    matches: [/photograph|placing/i],
  },
  ...PRESS_STAGES.slice(2),
];

interface Props {
  /** Current press label, e.g. "Placing your photographs…". */
  genStep: string;
  /** Whether generation is currently running. Used to freeze the final stage as "done" after it completes. */
  photoCount: number;
}

function stageIndexFor(step: string, stages: Stage[]): number {
  if (!step) return 0;
  for (let i = stages.length - 1; i >= 0; i--) {
    if (stages[i].matches.some((r) => r.test(step))) return i;
  }
  return 0;
}

export function GeneratingScreen({ genStep, photoCount }: Props) {
  const stages = photoCount > 0 ? PRESS_STAGES_WITH_PHOTOS : PRESS_STAGES;
  const stageIdx = useMemo(() => stageIndexFor(genStep, stages), [genStep, stages]);

  return (
    <div
      role="status"
      aria-live="polite"
      // The press used to snap over the Review step in one frame —
      // a 320ms fade (pl8-content-fade-in) makes the takeover read
      // as a curtain, not a glitch. Applied on the fixed root itself
      // so the opacity never creates a containing block above it.
      className="pl8-content-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--paper, #FDFAF0)',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {/* Drifting tone blobs behind everything */}
      <Blob tone="cream" size={420} opacity={0.45} seed={0} style={{ position: 'absolute', top: -120, left: -140 }} />
      <Blob tone="peach" size={360} opacity={0.42} seed={1} style={{ position: 'absolute', bottom: -100, right: -120 }} />
      <Blob tone="sage" size={300} opacity={0.36} seed={2} style={{ position: 'absolute', top: '40%', left: '55%' }} />
      <AmbientThread size={230} style={{ position: 'absolute', top: 70, right: 70, opacity: 0.1 }} />
      <AmbientSprig size={200} style={{ position: 'absolute', bottom: 110, left: 90, opacity: 0.09, transform: 'scaleX(-1)' }} />

      <div
        className="container pl8-gen-layout"
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 980,
          width: '100%',
          padding: '40px 32px',
          display: 'grid',
          gridTemplateColumns: '1fr 1.1fr',
          gap: 48,
          alignItems: 'center',
        }}
      >
        {/* LEFT — mascot + current step */}
        <div style={{ position: 'relative' }}>
          <Reveal delay={60} y={10}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--pl-olive, #5C6B3F)',
                marginBottom: 14,
              }}
            >
              <Sparkle size={12} color="var(--gold)" />
              Weaving step {stageIdx + 1} of {stages.length}
            </div>
          </Reveal>

          <Reveal delay={160} y={18}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 18 }}>
              <Float amplitude={8} duration={5}>
                <Pear size={110} tone="sage" shadow sparkle />
              </Float>
              <div>
                <div
                  className="display"
                  style={{
                    fontSize: 'clamp(32px, 4vw, 44px)',
                    fontStyle: 'italic',
                    lineHeight: 1.05,
                    margin: 0,
                    color: 'var(--ink)',
                  }}
                >
                  {stages[stageIdx].label}
                  <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>…</span>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--ink-soft)',
                    marginTop: 8,
                    lineHeight: 1.55,
                    maxWidth: 340,
                  }}
                >
                  {stages[stageIdx].hint}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={280}>
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--cream-2)',
                border: '1px solid var(--line-soft)',
                borderRadius: 14,
                fontSize: 13,
                color: 'var(--ink-soft)',
                fontStyle: 'italic',
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <LoomShuttle />
              <span>
                {genStep?.trim() ? genStep : 'Threading…'}
              </span>
            </div>
          </Reveal>

          <Reveal delay={360}>
            <div
              style={{
                marginTop: 18,
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: 10.5,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
              }}
            >
              {photoCount > 0
                ? `${photoCount} photo${photoCount === 1 ? '' : 's'} placed · about 10s`
                : 'Preparing the loom · about 10s'}
            </div>
          </Reveal>
        </div>

        {/* RIGHT — stage checklist */}
        <div>
          <Reveal delay={80}>
            <ol
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'grid',
                gap: 6,
              }}
            >
              {stages.map((s, i) => {
                const status: 'done' | 'active' | 'pending' =
                  i < stageIdx ? 'done' : i === stageIdx ? 'active' : 'pending';
                return (
                  <li
                    key={s.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 1fr',
                      gap: 14,
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: status === 'active' ? '1px solid var(--line)' : '1px solid transparent',
                      background: status === 'active' ? 'var(--cream)' : 'transparent',
                      transition: 'background 280ms ease, border-color 280ms ease',
                    }}
                  >
                    <StageMarker status={status} />
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-display, Fraunces, serif)',
                          fontSize: 16,
                          fontStyle: status === 'pending' ? 'normal' : 'italic',
                          color: status === 'pending' ? 'var(--ink-muted)' : 'var(--ink)',
                          lineHeight: 1.2,
                        }}
                      >
                        {s.label}
                      </div>
                      {status === 'active' && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--ink-soft)',
                            marginTop: 3,
                            lineHeight: 1.45,
                          }}
                        >
                          {s.hint}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Reveal>
        </div>
      </div>

      {/* Global styles for the loom/stage markers. jsx global so the
          reduced-motion rule below can reach the LoomShuttle /
          StageMarker child components (scoped styles wouldn't), and
          the class rule's !important can beat their inline
          animation shorthand. BRAND §6 — these two are infinite
          loops and must stop entirely under reduced motion (the
          Reveal / Float wrappers guard themselves; these didn't). */}
      <style jsx global>{`
        @keyframes pear-loom-shuttle {
          0%   { transform: translateX(0); opacity: 0.85; }
          50%  { transform: translateX(48px); opacity: 1; }
          100% { transform: translateX(0); opacity: 0.85; }
        }
        @keyframes pear-stage-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.15); opacity: 0.7; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pear-gen-anim { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/** Small SVG shuttle that travels back and forth inside the genStep card — pearloom's signature "weaving" motion at a glance. */
function LoomShuttle() {
  return (
    <svg width="64" height="14" viewBox="0 0 64 14" aria-hidden style={{ flex: 'none' }}>
      <line x1="0" y1="7" x2="64" y2="7" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.35" />
      <g className="pear-gen-anim" style={{ animation: 'pear-loom-shuttle 1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite' }}>
        <rect x="0" y="4" width="14" height="6" rx="2" fill="var(--sage-deep, #8B9C5A)" />
        <circle cx="7" cy="7" r="1.2" fill="var(--cream, #FDFAF0)" />
      </g>
    </svg>
  );
}

function StageMarker({ status }: { status: 'done' | 'active' | 'pending' }) {
  if (status === 'done') {
    return (
      <div
        aria-hidden
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'var(--sage-deep, #8B9C5A)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--cream, #FDFAF0)',
        }}
      >
        <Icon name="check" size={12} strokeWidth={3} />
      </div>
    );
  }
  if (status === 'active') {
    return (
      <div
        aria-hidden
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '1.5px solid var(--ink)',
          background: 'var(--cream)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <span
          className="pear-gen-anim"
          style={{
            display: 'block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'var(--pl-gold, #C19A4B)',
            animation: 'pear-stage-pulse 1.4s ease-in-out infinite',
          }}
        />
      </div>
    );
  }
  return (
    <div
      aria-hidden
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        border: '1.5px dashed var(--line)',
        background: 'transparent',
      }}
    />
  );
}
