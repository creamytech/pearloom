'use client';

import { PD, MONO_STYLE, DISPLAY_STYLE } from './DesignAtoms';
import { PenLine, Mail, CalendarCheck, Sparkles, Bookmark } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/design/DesignJourney.tsx
//
// The dark "From first idea to forever memory" band — a 5-step
// timeline that carries a celebration from save-the-date to
// keepsake. A dark editorial slab (PD.slab / PD.slabInk) so the
// warm nodes glow; a dotted thread runs behind the nodes across
// the row on desktop and hides when the steps stack on mobile.
//
// Hairlines + muted text are cream-based rgba here (not ink mixes)
// because ink-based mixes would vanish on the midnight slab.
// ─────────────────────────────────────────────────────────────

const CREAM_LINE = 'rgba(245,239,226,0.18)';
const CREAM_MUTED = 'rgba(245,239,226,0.72)';
const GOLD_ON_DARK = '#E0AC7E';

const STEPS = [
  {
    title: 'Save the date',
    desc: 'Capture your vision and set the foundation with Pear.',
    color: '#5C6B3F',
    Icon: PenLine,
  },
  {
    title: 'Invite with heart',
    desc: 'Share your story and collect replies — a letter, not a form.',
    color: '#8B7BA8',
    Icon: Mail,
  },
  {
    title: 'Plan with ease',
    desc: 'Build timelines, manage vendors, track every detail.',
    color: '#C6703D',
    Icon: CalendarCheck,
  },
  {
    title: 'Live in the moment',
    desc: 'Coordinate the day-of so you can be present for it.',
    color: '#D9A89E',
    Icon: Sparkles,
  },
  {
    title: 'Cherish forever',
    desc: 'Your memories, gathered and kept for a lifetime.',
    color: '#C19A4B',
    Icon: Bookmark,
  },
];

export function DesignJourney() {
  return (
    <div style={{ background: PD.slab, color: PD.slabInk }}>
      <section
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

        {/* Steps */}
        <div style={{ position: 'relative', marginTop: 'clamp(40px,6vw,64px)' }}>
          {/* Connecting thread behind the nodes — hidden when stacked */}
          <div
            className="dj-thread"
            aria-hidden
            style={{
              position: 'absolute',
              top: 24,
              left: '10%',
              right: '10%',
              height: 2,
              borderTop: `2px dotted ${CREAM_LINE}`,
            }}
          />

          <div
            className="dj-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5,1fr)',
              gap: 24,
              position: 'relative',
            }}
          >
            {STEPS.map((step) => {
              const Icon = step.Icon;
              return (
                <div
                  key={step.title}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 999,
                      background: step.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={22} color="#FFFFFF" strokeWidth={1.8} />
                  </div>
                  <h4
                    style={{
                      fontFamily: 'var(--pl-font-display)',
                      fontSize: 17,
                      fontWeight: 600,
                      color: PD.slabInk,
                      margin: '14px 0 0',
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
              );
            })}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 720px) {
          .dj-grid {
            grid-template-columns: 1fr !important;
            gap: 36px !important;
          }
          .dj-thread {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
