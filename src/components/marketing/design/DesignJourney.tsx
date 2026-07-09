'use client';

import { PD, MONO_STYLE, DISPLAY_STYLE } from './DesignAtoms';
import { FoilGradient } from '@/components/brand/pressed';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/design/DesignJourney.tsx
//
// The dark "From first idea to forever memory" band — five KNOTS
// tied on one woven strand (RADICAL landing revamp: the icon-
// circle row read as template-SaaS; the thread is the identity).
// Two strands — olive + foil gold — weave across the row; each
// step is a knot on them, glowing in its own tint against the
// midnight slab. Mobile stacks the steps and hides the strand.
//
// Hairlines + muted text are cream-based rgba here (not ink mixes)
// because ink-based mixes would vanish on the midnight slab.
// ─────────────────────────────────────────────────────────────

const CREAM_MUTED = 'rgba(245,239,226,0.72)';
const GOLD_ON_DARK = '#E0AC7E';

const STEPS = [
  {
    title: 'Save the date',
    desc: 'Capture your vision and set the foundation with Pear.',
    color: '#8B9C5A',
  },
  {
    title: 'Invite with heart',
    desc: 'Share your story and collect replies: a letter, not a form.',
    color: '#A896C9',
  },
  {
    title: 'Plan with ease',
    desc: 'Build timelines, manage vendors, track every detail.',
    color: '#D98B55',
  },
  {
    title: 'Live in the moment',
    desc: 'Coordinate the day-of so you can be present for it.',
    color: '#D9A89E',
  },
  {
    title: 'Cherish forever',
    desc: 'Your memories, gathered and kept for a lifetime.',
    color: '#D4A95D',
  },
];

export function DesignJourney() {
  return (
    <div style={{ background: PD.slab, color: PD.slabInk }}>
      <section
        className="dj-sec"
        style={{
          padding: 'clamp(72px,10vw,120px) 24px',
          maxWidth: 1180,
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ ...MONO_STYLE, color: GOLD_ON_DARK }}>The Pearloom journey</span>
          <h2
            className="pl-letterpress"
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(34px,4.6vw,60px)',
              color: PD.slabInk,
              textAlign: 'center',
              margin: '14px 0 0',
            }}
          >
            From first idea to{' '}
            <em style={{ fontStyle: 'italic', color: GOLD_ON_DARK }}>forever memory</em>.
          </h2>
        </div>

        {/* Steps — knots on the strand */}
        <div style={{ position: 'relative', marginTop: 'clamp(40px,6vw,64px)' }}>
          {/* The strand — two threads weaving behind the knots.
              Hidden when the steps stack. */}
          <svg
            className="dj-thread"
            aria-hidden
            viewBox="0 0 1000 24"
            preserveAspectRatio="none"
            style={{ position: 'absolute', top: 4, left: '8%', right: '8%', width: '84%', height: 24 }}
          >
            <defs>
              <FoilGradient id="dj-strand-foil" />
            </defs>
            <path
              d="M 0 12 C 60 4, 130 4, 200 12 S 340 20, 400 12 S 540 4, 600 12 S 740 20, 800 12 S 940 4, 1000 12"
              fill="none" stroke="rgba(164,181,122,0.55)" strokeWidth="1.6" strokeLinecap="round"
            />
            <path
              d="M 0 12 C 60 20, 130 20, 200 12 S 340 4, 400 12 S 540 20, 600 12 S 740 4, 800 12 S 940 20, 1000 12"
              fill="none" stroke="url(#dj-strand-foil)" strokeWidth="1.6" strokeLinecap="round" opacity="0.85"
            />
          </svg>

          <div
            className="dj-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5,1fr)',
              gap: 24,
              position: 'relative',
            }}
          >
            {STEPS.map((step) => (
              <div
                key={step.title}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                {/* The knot — a flat tied-off dot on the strand, ringed
                    so it reads as sitting ON the threads, not floating.
                    Flat ink, no sphere gloss. */}
                <span
                  aria-hidden
                  style={{
                    width: 13,
                    height: 13,
                    marginTop: 8,
                    borderRadius: 999,
                    background: step.color,
                    boxShadow: `0 0 0 4px ${PD.slab}, 0 0 0 5px rgba(245,239,226,0.28)`,
                    flexShrink: 0,
                  }}
                />
                <h4
                  style={{
                    fontFamily: 'var(--pl-font-display)',
                    fontSize: 17,
                    fontWeight: 600,
                    color: PD.slabInk,
                    margin: '22px 0 0',
                  }}
                >
                  {step.title}
                </h4>
                <p
                  style={{
                    fontSize: 13,
                    color: CREAM_MUTED,
                    lineHeight: 1.5,
                    maxWidth: 200,
                    margin: '6px auto 0',
                  }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          /* Stacked: a tight vertical rail instead of five sparse
             centered stacks. The horizontal strand becomes a vertical
             two-tone thread at the left; each knot ties onto it, with
             the step copy beside it. */
          .dj-grid {
            grid-template-columns: 1fr !important;
            gap: 22px !important;
            position: relative;
          }
          .dj-thread {
            display: none !important;
          }
          .dj-grid::before {
            content: '';
            position: absolute;
            left: 6px;
            top: 10px;
            bottom: 10px;
            width: 1.5px;
            background: linear-gradient(180deg, rgba(164, 181, 122, 0.5), rgba(224, 172, 126, 0.6));
          }
          .dj-grid > div {
            display: grid !important;
            grid-template-columns: 14px 1fr !important;
            column-gap: 16px;
            align-items: start !important;
            text-align: left !important;
          }
          .dj-grid > div > span {
            grid-row: 1 / span 2;
            margin-top: 5px !important;
          }
          .dj-grid > div h4 {
            grid-column: 2;
            margin: 0 !important;
          }
          .dj-grid > div p {
            grid-column: 2;
            margin: 4px 0 0 !important;
            max-width: none !important;
          }
        }
        @media (max-width: 640px) {
          .dj-sec {
            padding: 48px 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
