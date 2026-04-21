'use client';

// Faithful port of design bundle's features.jsx (Director). Exact
// match:
// - straight mono Pill kicker with Pearl (not CurvedText)
// - Fraunces display headline "Pear is not a button. / She is a planner."
//   with "planner" italic olive
// - two paragraphs of body copy, second in Fraunces italic
// - numbered capability list with gold 01-04 italic
// - right column: paper3 timeline card, radius 18, 6 milestones
//   across a two-strand thread
// - Pear's quiet note card with 2D Pear (NOT the 3D pear)
// - three open stitches at the bottom

import { Pear, Pearl, Pill, PLButton, PD, DISPLAY_STYLE, MONO_STYLE } from './design/DesignAtoms';

const MILESTONES = [
  { p: 4,  d: 'T–180', l: 'Book venue',     done: true,  now: false, c: PD.olive },
  { p: 22, d: 'T–120', l: 'Save the date',  done: true,  now: false, c: PD.olive },
  { p: 42, d: 'T–90',  l: 'Send invites',   done: true,  now: false, c: PD.olive },
  { p: 62, d: 'T–45',  l: 'Menu locked',    done: false, now: true,  c: PD.terra },
  { p: 82, d: 'T–7',   l: 'Rehearse',       done: false, now: false, c: PD.stone },
  { p: 96, d: 'T+0',   l: 'Vows',           done: false, now: false, c: PD.gold },
] as const;

const STITCHES = [
  { h: 'Venue pay', s: '$4,200 on Fri' },
  { h: 'Flowers', s: '2 quotes in' },
  { h: 'Hair trial', s: 'Book by Sun' },
] as const;

const CAPABILITIES = [
  { k: 'The timeline',   v: 'T–180 through T+30. Every deadline threaded.' },
  { k: 'The little book', v: 'Every guest, allergy, seating note, gift.' },
  { k: 'The ledger',     v: 'Budget live against quotes and invoices.' },
  { k: 'The reply',      v: 'Drafts your next email in your voice.' },
] as const;

interface DirectorTimelineProps {
  onGetStarted?: () => void;
}

export function DirectorTimeline({ onGetStarted }: DirectorTimelineProps) {
  return (
    <section
      id="director"
      style={{
        padding: '140px 24px',
        position: 'relative',
        overflow: 'hidden',
        background: PD.paper,
      }}
    >
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div
          className="pd-director-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '0.95fr 1.05fr',
            gap: 72,
            alignItems: 'center',
          }}
        >
          {/* Left — copy */}
          <div>
            <Pill style={{ marginBottom: 18 }}>
              <Pearl size={7} /> THE DIRECTOR
            </Pill>
            <h2
              style={{
                ...DISPLAY_STYLE,
                fontSize: 'clamp(40px, 5.2vw, 72px)',
                lineHeight: 0.95,
                margin: '0 0 22px',
                fontWeight: 400,
                letterSpacing: '-0.025em',
                color: PD.ink,
              }}
            >
              Pear is not a button.
              <br />
              She is a{' '}
              <span
                style={{
                  fontStyle: 'italic',
                  color: PD.olive,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                planner
              </span>
              .
            </h2>
            <p
              style={{
                fontFamily: 'var(--pl-font-body)',
                fontSize: 17.5,
                lineHeight: 1.6,
                color: PD.inkSoft,
                margin: '0 0 20px',
                maxWidth: 520,
              }}
            >
              She knows your budget, your city, your guest count, your timeline. She picks up
              where you left off. Ask her about venues, vendors, cost splits, toast order,
              she remembers.
            </p>
            <p
              style={{
                ...DISPLAY_STYLE,
                fontSize: 17.5,
                lineHeight: 1.6,
                color: PD.inkSoft,
                margin: '0 0 32px',
                maxWidth: 520,
                fontStyle: 'italic',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              Her drafting tone shifts with the occasion, solemn for memorials, playful for
              bachelor weekends, ceremonial for bar mitzvahs, intimate for anniversaries.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {CAPABILITIES.map((x, i) => (
                <div
                  key={x.k}
                  style={{
                    display: 'flex',
                    gap: 14,
                    alignItems: 'baseline',
                    paddingBottom: 10,
                    borderBottom: '1px solid rgba(31,36,24,0.08)',
                  }}
                >
                  <div
                    style={{
                      ...DISPLAY_STYLE,
                      fontSize: 15,
                      color: PD.gold,
                      minWidth: 30,
                      fontStyle: 'italic',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1, fontFamily: 'var(--pl-font-body)' }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: PD.ink }}>{x.k}</div>
                    <div style={{ fontSize: 14, color: PD.inkSoft }}>{x.v}</div>
                  </div>
                </div>
              ))}
            </div>

            <PLButton variant="olive" size="md" onClick={onGetStarted}>
              Ask Pear anything →
            </PLButton>
          </div>

          {/* Right — full-horizon timeline card */}
          <div
            style={{
              background: PD.paper3,
              border: '1px solid rgba(31,36,24,0.14)',
              borderRadius: 18,
              padding: '28px 28px 32px',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginBottom: 22,
              }}
            >
              <div>
                <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.6, marginBottom: 4 }}>
                  PEAR · YOUR TIMELINE
                </div>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 22,
                    fontStyle: 'italic',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  180 days to the vow
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: PD.inkSoft,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--pl-font-body)',
                }}
              >
                <Pearl size={7} /> 64% woven
              </div>
            </div>

            {/* Timeline strip */}
            <div style={{ position: 'relative', height: 78, marginBottom: 24 }}>
              <svg
                width="100%"
                height="20"
                viewBox="0 0 600 20"
                preserveAspectRatio="none"
                style={{ position: 'absolute', top: 28, left: 0 }}
              >
                <path d="M0 10 Q 100 4, 200 10 T 400 10 T 600 10" stroke={PD.olive} strokeWidth="1.5" fill="none" />
                <path
                  d="M0 10 Q 100 16, 200 10 T 400 10 T 600 10"
                  stroke={PD.gold}
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="3 4"
                />
              </svg>
              {MILESTONES.map((m) => (
                <div
                  key={m.d}
                  style={{
                    position: 'absolute',
                    left: `${m.p}%`,
                    top: 0,
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ ...MONO_STYLE, fontSize: 8, opacity: 0.6, marginBottom: 4 }}>
                    {m.d}
                  </div>
                  <div
                    style={{
                      width: m.now ? 18 : 14,
                      height: m.now ? 18 : 14,
                      margin: '0 auto',
                      borderRadius: 999,
                      background: m.done ? m.c : PD.paper,
                      border: `1.5px solid ${m.c}`,
                      boxShadow: m.now ? `0 0 0 4px ${m.c}22` : 'none',
                    }}
                  />
                  <div
                    style={{
                      fontSize: 9.5,
                      color: PD.ink,
                      marginTop: 6,
                      fontWeight: m.now ? 600 : 500,
                      maxWidth: 70,
                      lineHeight: 1.2,
                      marginInline: 'auto',
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    {m.l}
                  </div>
                </div>
              ))}
            </div>

            {/* Pear's voice */}
            <div
              style={{
                background: PD.paper,
                border: '1px solid rgba(31,36,24,0.1)',
                borderRadius: 14,
                padding: '16px 18px',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Pear size={28} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
                <div style={{ flex: 1 }}>
                  <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.6, marginBottom: 4 }}>
                    PEAR · A QUIET NOTE
                  </div>
                  <div
                    style={{
                      ...DISPLAY_STYLE,
                      fontSize: 17,
                      lineHeight: 1.4,
                      fontStyle: 'italic',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    &ldquo;The menu is the next stitch. Chef Adé sent three options,
                    <br />
                    I&rsquo;ve drafted your reply. Want me to press it?&rdquo;
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingLeft: 40 }}>
                <PLButton variant="olive" size="sm">
                  Press the reply
                </PLButton>
                <PLButton variant="ghost" size="sm">
                  Read the draft
                </PLButton>
              </div>
            </div>

            {/* Three open stitches */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {STITCHES.map((x) => (
                <div
                  key={x.h}
                  style={{
                    background: PD.paperDeep,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(31,36,24,0.08)',
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{x.h}</div>
                  <div style={{ fontSize: 11, color: PD.inkSoft }}>{x.s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-director-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
