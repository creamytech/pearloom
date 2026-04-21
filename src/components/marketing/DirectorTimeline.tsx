'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/DirectorTimeline.tsx
//
// "Pear is not a button. She is a planner." Concrete product
// moment for The Director — a T-180 → T+0 timeline thread with
// milestones, a "quiet note" card from Pear suggesting the next
// move, and three open stitches (pending to-dos). The timeline
// is the hero of the section; everything else is decoration.
// ─────────────────────────────────────────────────────────────

import { ArrowRight } from 'lucide-react';
import { BlurFade, CurvedText, RipeningPear, SquishyButton } from '@/components/brand/groove';

const MILESTONES = [
  { p: 4,  d: 'T–180', l: 'Book venue',     done: true,  now: false, c: 'var(--pl-groove-sage)' },
  { p: 22, d: 'T–120', l: 'Save the date',  done: true,  now: false, c: 'var(--pl-groove-sage)' },
  { p: 42, d: 'T–90',  l: 'Send invites',   done: true,  now: false, c: 'var(--pl-groove-sage)' },
  { p: 62, d: 'T–45',  l: 'Menu locked',    done: false, now: true,  c: 'var(--pl-groove-terra)' },
  { p: 82, d: 'T–7',   l: 'Rehearse',       done: false, now: false, c: 'color-mix(in oklab, var(--pl-groove-ink) 20%, transparent)' },
  { p: 96, d: 'T+0',   l: 'Vows',           done: false, now: false, c: 'var(--pl-groove-plum)' },
];

const STITCHES = [
  { h: 'Venue pay',  s: '$4,200 on Fri' },
  { h: 'Flowers',    s: '2 quotes in' },
  { h: 'Hair trial', s: 'Book by Sun' },
];

const CAPABILITIES = [
  { k: 'The timeline',   v: 'T–180 through T+30. Every deadline threaded.' },
  { k: 'The little book', v: 'Every guest, allergy, seating note, gift.' },
  { k: 'The ledger',     v: 'Budget live against quotes and invoices.' },
  { k: 'The reply',      v: 'Drafts your next email in your voice.' },
];

interface DirectorTimelineProps {
  onGetStarted?: () => void;
}

export function DirectorTimeline({ onGetStarted }: DirectorTimelineProps) {
  return (
    <section
      id="director"
      style={{
        position: 'relative',
        padding: 'clamp(96px, 14vh, 160px) clamp(20px, 5vw, 64px)',
        background: 'var(--pl-groove-cream)',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 0.95fr) minmax(0, 1.05fr)',
            gap: 'clamp(36px, 5vw, 72px)',
            alignItems: 'center',
          }}
          className="pl-director-timeline-grid"
        >
          {/* Left — copy */}
          <div>
            <BlurFade>
              <div
                aria-hidden
                style={{
                  color: 'var(--pl-groove-terra)',
                  marginBottom: 8,
                  marginLeft: -6,
                }}
              >
                <CurvedText
                  variant="wave"
                  width={260}
                  amplitude={10}
                  fontFamily="var(--pl-font-body)"
                  fontSize={14}
                  fontWeight={500}
                  letterSpacing={1.5}
                  aria-label="The Director"
                >
                  ✦  The Director  ✦
                </CurvedText>
              </div>
            </BlurFade>
            <BlurFade delay={0.08}>
              <h2
                style={{
                  margin: '0 0 20px',
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
                  fontWeight: 700,
                  lineHeight: 1.04,
                  letterSpacing: '-0.025em',
                  color: 'var(--pl-groove-ink)',
                }}
              >
                Pear is not a button.
                <br />
                She is a{' '}
                <span
                  style={{
                    fontFamily: '"Fraunces", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    color: 'var(--pl-groove-sage)',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  planner
                </span>
                .
              </h2>
            </BlurFade>
            <BlurFade delay={0.16}>
              <p
                style={{
                  margin: '0 0 16px',
                  maxWidth: '48ch',
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: '1.04rem',
                  lineHeight: 1.6,
                  color: 'color-mix(in oklab, var(--pl-groove-ink) 72%, transparent)',
                }}
              >
                She knows your budget, your city, your guest count, your timeline.
                She picks up where you left off. Ask her about venues, vendors,
                cost splits, toast order. She remembers.
              </p>
              <p
                style={{
                  margin: '0 0 28px',
                  maxWidth: '48ch',
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: '1.02rem',
                  lineHeight: 1.55,
                  color: 'color-mix(in oklab, var(--pl-groove-ink) 68%, transparent)',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                Her drafting tone shifts with the occasion. Solemn for memorials,
                playful for bachelor weekends, ceremonial for bar mitzvahs,
                intimate for anniversaries.
              </p>
            </BlurFade>

            <BlurFade delay={0.24}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {CAPABILITIES.map((x, i) => (
                  <div
                    key={x.k}
                    style={{
                      display: 'flex',
                      gap: 14,
                      alignItems: 'baseline',
                      paddingBottom: 12,
                      borderBottom: '1px solid color-mix(in oklab, var(--pl-groove-terra) 16%, transparent)',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: '"Fraunces", Georgia, serif',
                        fontStyle: 'italic',
                        fontSize: 16,
                        color: 'var(--pl-groove-plum)',
                        minWidth: 30,
                        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div style={{ flex: 1, fontFamily: 'var(--pl-font-body)' }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--pl-groove-ink)', letterSpacing: '-0.005em' }}>{x.k}</div>
                      <div style={{ fontSize: 14, color: 'color-mix(in oklab, var(--pl-groove-ink) 68%, transparent)', lineHeight: 1.5 }}>{x.v}</div>
                    </div>
                  </div>
                ))}
              </div>
            </BlurFade>

            <BlurFade delay={0.32}>
              <SquishyButton size="md" onClick={onGetStarted} trailing={<ArrowRight size={16} />}>
                Ask Pear anything
              </SquishyButton>
            </BlurFade>
          </div>

          {/* Right — live timeline mock */}
          <BlurFade delay={0.16}>
            <div
              style={{
                background: 'color-mix(in oklab, var(--pl-groove-butter) 22%, var(--pl-groove-cream))',
                border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 22%, transparent)',
                borderRadius: 22,
                padding: 'clamp(24px, 3vw, 34px)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginBottom: 24,
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-body)',
                      fontSize: '0.72rem',
                      fontWeight: 500,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'color-mix(in oklab, var(--pl-groove-ink) 55%, transparent)',
                      marginBottom: 4,
                    }}
                  >
                    Pear · your timeline
                  </div>
                  <div
                    style={{
                      fontFamily: '"Fraunces", Georgia, serif',
                      fontStyle: 'italic',
                      fontSize: 24,
                      fontWeight: 400,
                      color: 'var(--pl-groove-ink)',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    180 days to the vow
                  </div>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    fontFamily: 'var(--pl-font-body)',
                    color: 'var(--pl-groove-terra)',
                    padding: '5px 12px',
                    borderRadius: 999,
                    background: 'color-mix(in oklab, var(--pl-groove-cream) 85%, transparent)',
                    border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 26%, transparent)',
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: 'var(--pl-groove-blob-sunrise, linear-gradient(135deg, var(--pl-groove-butter), var(--pl-groove-rose)))',
                    }}
                  />
                  64% woven
                </div>
              </div>

              {/* Timeline strip — the thread + milestones */}
              <div style={{ position: 'relative', height: 84, marginBottom: 28 }}>
                <svg
                  width="100%"
                  height="20"
                  viewBox="0 0 600 20"
                  preserveAspectRatio="none"
                  style={{ position: 'absolute', top: 30, left: 0 }}
                >
                  <path d="M0 10 Q 100 4, 200 10 T 400 10 T 600 10" stroke="var(--pl-groove-sage)" strokeWidth="1.5" fill="none" />
                  <path
                    d="M0 10 Q 100 16, 200 10 T 400 10 T 600 10"
                    stroke="var(--pl-groove-terra)"
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
                    <div
                      style={{
                        fontFamily: 'var(--pl-font-body)',
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.12em',
                        color: 'color-mix(in oklab, var(--pl-groove-ink) 55%, transparent)',
                        marginBottom: 6,
                      }}
                    >
                      {m.d}
                    </div>
                    <div
                      style={{
                        width: m.now ? 18 : 14,
                        height: m.now ? 18 : 14,
                        margin: '0 auto',
                        borderRadius: 999,
                        background: m.done ? m.c : 'var(--pl-groove-cream)',
                        border: `1.5px solid ${m.c}`,
                        boxShadow: m.now ? `0 0 0 5px color-mix(in oklab, ${m.c} 22%, transparent)` : 'none',
                      }}
                    />
                    <div
                      style={{
                        fontFamily: 'var(--pl-font-body)',
                        fontSize: 10.5,
                        fontWeight: m.now ? 700 : 500,
                        color: 'var(--pl-groove-ink)',
                        marginTop: 6,
                        maxWidth: 72,
                        lineHeight: 1.2,
                        marginInline: 'auto',
                      }}
                    >
                      {m.l}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pear's quiet note */}
              <div
                style={{
                  background: 'var(--pl-groove-cream)',
                  border: '1px solid color-mix(in oklab, var(--pl-groove-ink) 10%, transparent)',
                  borderRadius: 16,
                  padding: '18px 20px',
                  marginBottom: 14,
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0 }}>
                    <RipeningPear size={40} scrollDriven={false} ripeness={0.6} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--pl-font-body)',
                        fontSize: 10.5,
                        fontWeight: 500,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: 'color-mix(in oklab, var(--pl-groove-ink) 55%, transparent)',
                        marginBottom: 6,
                      }}
                    >
                      Pear · a quiet note
                    </div>
                    <div
                      style={{
                        fontFamily: '"Fraunces", Georgia, serif',
                        fontStyle: 'italic',
                        fontSize: 17,
                        lineHeight: 1.4,
                        color: 'var(--pl-groove-ink)',
                        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                      }}
                    >
                      &ldquo;The menu is the next stitch. Chef Adé sent three options.
                      I&rsquo;ve drafted your reply. Want me to press it?&rdquo;
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                      <SquishyButton size="sm">Press the reply</SquishyButton>
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          color: 'var(--pl-groove-ink)',
                          border: '1px solid color-mix(in oklab, var(--pl-groove-ink) 18%, transparent)',
                          borderRadius: 'var(--pl-groove-radius-pill)',
                          padding: '8px 16px',
                          fontSize: 13,
                          fontWeight: 500,
                          fontFamily: 'var(--pl-font-body)',
                          cursor: 'pointer',
                        }}
                      >
                        Read the draft
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Three open stitches */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {STITCHES.map((s) => (
                  <div
                    key={s.h}
                    style={{
                      background: 'color-mix(in oklab, var(--pl-groove-butter) 14%, var(--pl-groove-cream))',
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 14%, transparent)',
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-groove-ink)', letterSpacing: '-0.005em' }}>{s.h}</div>
                    <div style={{ fontSize: 11.5, color: 'color-mix(in oklab, var(--pl-groove-ink) 65%, transparent)', marginTop: 2 }}>{s.s}</div>
                  </div>
                ))}
              </div>
            </div>
          </BlurFade>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .pl-director-timeline-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
