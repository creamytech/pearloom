'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/wizard/GeneratingScreen.tsx
//
// Full-bleed generating overlay shown while /api/generate/stream
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
import { Float, Reveal } from '../motion';

interface Stage {
  id: string;
  label: string;
  hint: string;
  /** Server labels that should mark this stage as "done" when seen. */
  matches: RegExp[];
}

const STAGES: Stage[] = [
  {
    id: 'gather',
    label: 'Gathering your memories',
    hint: 'Unpacking your photos into clusters by time and place.',
    matches: [/gather|cluster|memor/i],
  },
  {
    id: 'story',
    label: 'Writing the story',
    hint: 'Drafting one chapter per cluster in your voice.',
    matches: [/writing.*story|Pass 1|story pass/i],
  },
  {
    id: 'refine',
    label: 'Refining every word',
    hint: 'A second pass fixes clichés, tightens rhythm, saves specifics.',
    matches: [/refin|critique|Pass 1\.2|every word/i],
  },
  {
    id: 'dna',
    label: 'Learning your DNA',
    hint: 'Pear maps your pets, places, hobbies — to color everything downstream.',
    matches: [/dna|couple profile|Pass 1\.5/i],
  },
  {
    id: 'poetry',
    label: 'Weaving the poetry',
    hint: 'Hero tagline, closing line, RSVP intro — in your voice.',
    matches: [/poetry|welcome|tagline|Pass 4/i],
  },
  {
    id: 'design',
    label: 'Designing your world',
    hint: 'Palette, typography, motifs, chapter art — composed together.',
    matches: [/design|vibeskin|palette|motif|chapter icon|Pass 2/i],
  },
  {
    id: 'content',
    label: 'Final polish',
    hint: 'Seeding FAQ, registry, travel — so the editor opens full.',
    matches: [/polish|final|FAQ|registry|travel|Pass 7/i],
  },
];

interface Props {
  /** Current server-provided label, e.g. "Pear is reading your photos…". */
  genStep: string;
  /** Whether generation is currently running. Used to freeze the final stage as "done" after it completes. */
  photoCount: number;
}

function stageIndexFor(step: string): number {
  if (!step) return 0;
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (STAGES[i].matches.some((r) => r.test(step))) return i;
  }
  return 0;
}

export function GeneratingScreen({ genStep, photoCount }: Props) {
  const stageIdx = useMemo(() => stageIndexFor(genStep), [genStep]);

  return (
    <div
      role="status"
      aria-live="polite"
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
      <Blob tone="lavender" size={420} opacity={0.45} seed={0} style={{ position: 'absolute', top: -120, left: -140 }} />
      <Blob tone="peach" size={360} opacity={0.42} seed={1} style={{ position: 'absolute', bottom: -100, right: -120 }} />
      <Blob tone="sage" size={300} opacity={0.36} seed={2} style={{ position: 'absolute', top: '40%', left: '55%' }} />
      <Squiggle variant={1} width={260} stroke="#D4A95D" style={{ position: 'absolute', top: 80, right: 80, opacity: 0.5 }} />
      <Squiggle variant={3} width={220} stroke="#D4A95D" style={{ position: 'absolute', bottom: 120, left: 100, opacity: 0.45 }} />

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
                color: 'var(--peach-ink)',
                marginBottom: 14,
              }}
            >
              <Sparkle size={12} color="var(--gold)" />
              Weaving step {stageIdx + 1} of {STAGES.length}
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
                  {STAGES[stageIdx].label}
                  <span className="display-italic">…</span>
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
                  {STAGES[stageIdx].hint}
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
                ? `${photoCount} photo${photoCount === 1 ? '' : 's'} · 7 AI passes · usually 30–90s`
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
              {STAGES.map((s, i) => {
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

      {/* Global styles for the loom/stage markers */}
      <style jsx>{`
        @keyframes pear-loom-shuttle {
          0%   { transform: translateX(0); opacity: 0.85; }
          50%  { transform: translateX(48px); opacity: 1; }
          100% { transform: translateX(0); opacity: 0.85; }
        }
        @keyframes pear-stage-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.15); opacity: 0.7; }
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
      <g style={{ animation: 'pear-loom-shuttle 1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite' }}>
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
          style={{
            display: 'block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'var(--peach-ink, #C6563D)',
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
