'use client';

// Pearloom Home Hero — exact port of the design bundle's hero.jsx.
// Two columns: left with copy + threading indicator + stats, right
// with a 2D HeroPear + a switchable preview card
// (wedding / milestone / memorial). Animated blobs, swirls, bloom,
// and sparkles drift behind the grid.

import { useEffect, useState } from 'react';
import { Bloom, Sparkle, Swirl } from '@/components/brand/groove';
import { HeroPear, Leaf, Pear, Pearl, Pill, PLButton, PD, DISPLAY_STYLE, Squiggle } from './DesignAtoms';

type Occasion = 'wedding' | 'milestone' | 'memorial';

interface DesignHeroProps {
  onGetStarted: () => void;
}

const THREADING_STEPS = [
  'reading your photos',
  'pressing a palette',
  'writing your story',
  'weaving your RSVP',
  'setting the type',
];

const DATA: Record<Occasion, {
  hosts: string;
  verb: string;
  sub: string;
  date: string;
  loc: string;
  slug: string;
  accent: string;
  pear: string;
}> = {
  wedding: {
    hosts: 'Mira & Jun',
    verb: 'are getting married',
    sub: 'A bright Saturday in Point Reyes, two families, one very long table.',
    date: 'Sept 6, 2026',
    loc: 'Point Reyes, CA',
    slug: 'mira-and-jun',
    accent: PD.gold,
    pear: PD.pear,
  },
  milestone: {
    hosts: 'Maya turns 30',
    verb: 'is throwing a supper',
    sub: 'Citrus, rosé, the garden hose for the kids, no speeches longer than 90 seconds.',
    date: 'Aug 15, 2026',
    loc: 'Lark Hill Orchard',
    slug: 'maya-at-thirty',
    accent: PD.terra,
    pear: PD.butter,
  },
  memorial: {
    hosts: 'For Amara Osei',
    verb: 'a quiet gathering',
    sub: "Tea, her records, her people. Come as you are.",
    date: 'Nov 15, 2026',
    loc: 'The Lumen, Brooklyn',
    slug: 'for-amara',
    accent: PD.plum,
    pear: PD.rose,
  },
};

export function DesignHero({ onGetStarted }: DesignHeroProps) {
  const [occasion, setOccasion] = useState<Occasion>('wedding');
  const [draftStep, setDraftStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setDraftStep((s) => (s + 1) % THREADING_STEPS.length), 1500);
    return () => clearInterval(id);
  }, []);

  const data = DATA[occasion];

  return (
    <section style={{ position: 'relative', padding: '56px 24px 160px', overflow: 'hidden' }}>
      {/* Floating curvy background blobs */}
      <div
        style={{
          position: 'absolute',
          top: -80,
          left: -160,
          width: 420,
          height: 420,
          background: PD.pearSkin,
          borderRadius: '62% 38% 54% 46% / 49% 58% 42% 51%',
          opacity: 0.55,
          filter: 'blur(22px)',
          animation: 'pl-blob-morph 14s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 340,
          right: -140,
          width: 340,
          height: 340,
          background: PD.butter,
          borderRadius: '55% 45% 38% 62% / 38% 52% 48% 62%',
          opacity: 0.45,
          filter: 'blur(18px)',
          animation: 'pl-blob-morph 14s ease-in-out infinite -5s',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: '42%',
          width: 220,
          height: 220,
          background: PD.rose,
          borderRadius: '70% 30% 58% 42% / 44% 62% 38% 56%',
          opacity: 0.35,
          filter: 'blur(16px)',
          animation: 'pl-blob-morph 14s ease-in-out infinite -9s',
        }}
      />

      {/* Groovy swirl, bloom, sparkles */}
      <div
        style={{ position: 'absolute', top: 80, right: '48%', opacity: 0.28, animation: 'pl-spin-slow 80s linear infinite' }}
        aria-hidden
      >
        <Swirl size={140} color={PD.olive} strokeWidth={1.6} />
      </div>
      <div style={{ position: 'absolute', bottom: 120, right: 40, opacity: 0.45 }} aria-hidden>
        <Bloom size={110} color={PD.pear} centerColor={PD.olive} speed={4} />
      </div>
      <div style={{ position: 'absolute', top: 180, left: 40 }} aria-hidden>
        <Sparkle size={24} color={PD.gold} />
      </div>
      <div style={{ position: 'absolute', bottom: 220, left: 180, opacity: 0.7 }} aria-hidden>
        <Sparkle size={14} color={PD.terra} />
      </div>

      <div
        className="pd-hero-grid"
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 1320,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1.05fr 1fr',
          gap: 60,
          alignItems: 'center',
        }}
      >
        {/* ── Left column ────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
            <Pill color="transparent">
              <Pearl size={7} /> A CRAFT HOUSE FOR MEMORY
            </Pill>
            <Pill color={PD.paper2} bordered={false}>
              <Leaf size={11} color={PD.olive} /> NEW · THE DIRECTOR
            </Pill>
          </div>

          <h1
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(54px, 7.8vw, 120px)',
              lineHeight: 0.94,
              fontWeight: 400,
              margin: '0 0 22px',
              letterSpacing: '-0.028em',
              color: PD.ink,
            }}
          >
            <span style={{ display: 'block' }}>The days that</span>
            <span style={{ display: 'block', position: 'relative' }}>
              <span
                style={{
                  fontStyle: 'italic',
                  color: PD.olive,
                  position: 'relative',
                  display: 'inline-block',
                }}
              >
                matter
                <span style={{ position: 'absolute', left: '-4%', right: '-4%', bottom: '-6px' }}>
                  <Squiggle width={220} height={14} color={PD.gold} strokeWidth={3} animated />
                </span>
              </span>
              , woven
            </span>
            <span style={{ display: 'block' }}>in an afternoon.</span>
          </h1>

          <p
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: 'clamp(16px, 1.15vw, 19px)',
              lineHeight: 1.55,
              maxWidth: 520,
              color: PD.inkSoft,
              margin: '0 0 32px',
            }}
          >
            Answer three questions. Hand over a few photos. Pearloom drafts the whole site: cover,
            story, RSVP, schedule, travel guide, registry. Pear, our in-house planner, writes it
            in your voice and stays with you from save the date to a year later.
          </p>

          {/* Pear is threading indicator */}
          <div
            aria-live="polite"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              background: PD.paper3,
              borderRadius: 999,
              marginBottom: 28,
              border: '1px solid rgba(31,36,24,0.1)',
            }}
          >
            <Pearl size={9} />
            <span
              style={{
                fontFamily: 'var(--pl-font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontSize: 11,
                opacity: 0.7,
              }}
            >
              PEAR IS
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: PD.olive,
                fontStyle: 'italic',
                fontFamily: '"Fraunces", Georgia, serif',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                minWidth: 180,
                display: 'inline-block',
              }}
            >
              {THREADING_STEPS[draftStep]}...
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 44 }}>
            <PLButton variant="ink" size="lg" onClick={onGetStarted}>
              Start your loom <Pearl size={9} />
            </PLButton>
            <PLButton variant="ghost" size="lg">
              <span
                style={{
                  display: 'inline-flex',
                  width: 22,
                  height: 22,
                  borderRadius: 99,
                  border: `1px solid ${PD.ink}`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                }}
              >
                ▶
              </span>
              Watch Pear thread a site
            </PLButton>
          </div>

          <div
            className="pd-hero-stats"
            style={{
              display: 'flex',
              gap: 32,
              alignItems: 'center',
              paddingTop: 26,
              borderTop: '1px solid rgba(31,36,24,0.12)',
              flexWrap: 'wrap',
            }}
          >
            {([
              { n: '42,000', l: 'days, already threaded', c: PD.olive },
              { n: '28', l: 'occasions, one voice each', c: PD.gold },
              { n: '8 min', l: 'from hello to published', c: PD.terra },
            ] as const).map((s, i) => (
              <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                <div>
                  <div
                    style={{
                      ...DISPLAY_STYLE,
                      fontSize: 26,
                      fontStyle: 'italic',
                      color: s.c,
                      lineHeight: 1,
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    {s.n}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-body)',
                      fontSize: 12,
                      color: PD.inkSoft,
                      marginTop: 3,
                      maxWidth: 140,
                    }}
                  >
                    {s.l}
                  </div>
                </div>
                {i < 2 && <div style={{ width: 1, height: 36, background: 'rgba(31,36,24,0.12)' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column — animated preview ─────────────── */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              position: 'absolute',
              top: -40,
              left: -60,
              opacity: 0.85,
              animation: 'pl-float-y 8s ease-in-out infinite',
            }}
            aria-hidden
          >
            <HeroPear size={200} />
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: -30,
              right: -30,
              animation: 'pl-float-y 6s ease-in-out infinite -3s',
            }}
            aria-hidden
          >
            <Leaf size={64} color={PD.olive} rotate={35} />
          </div>
          <div
            style={{
              position: 'absolute',
              top: 60,
              right: -40,
              animation: 'pl-spin-slow 40s linear infinite',
            }}
            aria-hidden
          >
            <Swirl size={80} color={PD.gold} strokeWidth={1.5} />
          </div>

          <div style={{ position: 'relative' }}>
            {/* Preview site card */}
            <div
              style={{
                width: 'min(460px, 92vw)',
                background: PD.paperCard,
                color: PD.ink,
                borderRadius: 24,
                border: '1px solid rgba(31,36,24,0.12)',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 30px 70px -20px rgba(31,36,24,0.35)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderBottom: '1px solid #E5DAB9',
                  background: PD.paper3,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: 99, background: PD.stone }} />
                <div style={{ width: 8, height: 8, borderRadius: 99, background: PD.stone }} />
                <div style={{ width: 8, height: 8, borderRadius: 99, background: PD.stone }} />
                <div
                  style={{
                    marginLeft: 10,
                    fontFamily: 'var(--pl-font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontSize: 9,
                    opacity: 0.55,
                  }}
                >
                  pearloom.com/{occasion}/{data.slug}
                </div>
              </div>

              <div style={{ padding: '36px 32px 28px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 24, right: 24 }}>
                  <Pear size={36} color={data.pear} stem={PD.oliveDeep} leaf={PD.olive} animated />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontSize: 10,
                    opacity: 0.6,
                    marginBottom: 12,
                  }}
                >
                  PRESSED BY PEAR · {data.date.toUpperCase()}
                </div>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 44,
                    lineHeight: 0.95,
                    fontWeight: 400,
                    letterSpacing: '-0.025em',
                    fontVariationSettings: '"SOFT" 60, "opsz" 144',
                  }}
                >
                  {data.hosts}
                </div>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 17,
                    fontStyle: 'italic',
                    color: data.accent,
                    margin: '6px 0 14px',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  {data.verb}
                </div>
                <p
                  style={{
                    fontFamily: 'var(--pl-font-body)',
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: PD.inkSoft,
                    margin: 0,
                    maxWidth: 360,
                  }}
                >
                  {data.sub}
                </p>
              </div>

              {/* Inline timeline strip */}
              <div style={{ padding: '18px 32px 24px', background: PD.paperDeep, borderTop: '1px solid #E5DAB9' }}>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontSize: 9,
                    opacity: 0.6,
                    marginBottom: 10,
                  }}
                >
                  THE RUN OF THE DAY
                </div>
                <div
                  style={{
                    position: 'relative',
                    height: 6,
                    background: PD.line,
                    borderRadius: 99,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: '0 42% 0 0',
                      background: `linear-gradient(90deg, ${data.accent}, ${PD.gold})`,
                      borderRadius: 99,
                    }}
                  />
                  {[4, 24, 42, 62, 82].map((p, i) => (
                    <div
                      key={p}
                      style={{
                        position: 'absolute',
                        left: `${p}%`,
                        top: -4,
                        width: 14,
                        height: 14,
                        borderRadius: 99,
                        background: PD.paper,
                        border: `1.5px solid ${i < 3 ? data.accent : PD.stone}`,
                        transform: 'translateX(-50%)',
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 10,
                    color: PD.inkSoft,
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  <span>arrive</span>
                  <span>vows</span>
                  <span>portraits</span>
                  <span>supper</span>
                  <span>dance</span>
                </div>
              </div>

              {/* RSVP strip */}
              <div
                style={{
                  padding: '16px 32px 22px',
                  background: PD.paperCard,
                  borderTop: '1px solid #E5DAB9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Pearl size={10} />
                <div style={{ flex: 1, fontSize: 13, fontFamily: 'var(--pl-font-body)' }}>
                  Kindly reply by{' '}
                  <em style={{ fontFamily: '"Fraunces", Georgia, serif', fontStyle: 'italic' }}>Aug 10</em>.
                </div>
                <button
                  onClick={onGetStarted}
                  style={{
                    background: data.accent,
                    color: PD.paperCard,
                    border: 'none',
                    padding: '9px 16px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontFamily: 'var(--pl-font-body)',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Press RSVP →
                </button>
              </div>
            </div>

            {/* occasion switcher */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: -60,
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 4,
                padding: 4,
                background: 'rgba(244, 236, 216, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(31,36,24,0.14)',
                borderRadius: 999,
                boxShadow: '0 10px 30px -10px rgba(31,36,24,0.25)',
              }}
            >
              {([
                { k: 'wedding', l: 'Wedding' },
                { k: 'milestone', l: 'Milestone' },
                { k: 'memorial', l: 'Memorial' },
              ] as const).map((o) => (
                <button
                  key={o.k}
                  onClick={() => setOccasion(o.k)}
                  style={{
                    background: occasion === o.k ? PD.ink : 'transparent',
                    color: occasion === o.k ? PD.paper : PD.ink,
                    border: 'none',
                    borderRadius: 999,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--pl-font-body)',
                    transition: 'all 160ms',
                  }}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-hero-grid) {
            grid-template-columns: 1fr !important;
            gap: 80px !important;
          }
        }
      `}</style>
    </section>
  );
}
