'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/GrooveHero.tsx
//
// Groove-brand replacement for EditorialHero. Two-column:
// • Left: eyebrow + kinetic italic headline + body + two CTAs
// • Right: the 3D RipeningPear ringed with a Ripple halo
//
// Atmosphere: two large soft Blobs (sunrise + orchard) drifting
// behind the grid so the whole hero feels alive. Scroll drives
// the pear's ripeness so the first 100vh of the page literally
// ripens the fruit.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { GooeyText } from '@/components/brand/GooeyText';
import {
  BlurFade,
  GrooveBlob,
  MagneticHover,
  RipeningPear,
  Ripple,
  SquishyButton,
} from '@/components/brand/groove';

interface GrooveHeroProps {
  onGetStarted: () => void;
}

const ROTATING_NOUN = ['wedding', 'anniversary', 'memorial', 'birthday', 'reunion', 'milestone'];

// What Pear is "doing" right now — cycles every 1.5s under the
// hero CTA so the visitor sees the drafter as an active thing,
// not a waiting button. Matches the tone of the "basting in"
// metaphor from the brand bible.
const THREADING_STEPS = [
  'reading your photos',
  'pressing a palette',
  'writing your story',
  'weaving your RSVP',
  'setting the type',
];

const HERO_STATS: Array<{ n: string; l: string; c: string }> = [
  { n: '42,000',  l: 'days, already threaded',   c: 'var(--pl-groove-sage)' },
  { n: '28',      l: 'occasions, one voice each', c: 'var(--pl-groove-terra)' },
  { n: '8 min',   l: 'from hello to published',  c: 'var(--pl-groove-plum)' },
];

// The hero previously tracked scrollY in React state and passed
// ripeness down, which re-rendered the whole subtree 60×/sec —
// noticeable jank once Lenis + framer useScroll + two TracingThreads
// all piled on. RipeningPear now self-drives from scroll via a ref
// + rAF, so this component is static after mount.

export function GrooveHero({ onGetStarted }: GrooveHeroProps) {
  const [draftStep, setDraftStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDraftStep((s) => (s + 1) % THREADING_STEPS.length), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      className="pl-grain"
      style={{
        position: 'relative',
        minHeight: 'min(94vh, 880px)',
        background:
          'radial-gradient(ellipse at 50% 0%, color-mix(in oklab, var(--pl-groove-butter) 18%, var(--pl-groove-cream)) 0%, var(--pl-groove-cream) 60%)',
        padding: 'clamp(96px, 14vh, 160px) clamp(20px, 5vw, 64px) clamp(48px, 8vh, 96px)',
        overflow: 'hidden',
      }}
    >
      {/* Ambient atmosphere — two blobs drift behind the grid */}
      <GrooveBlob
        palette="sunrise"
        size={640}
        blur={80}
        opacity={0.55}
        style={{ position: 'absolute', top: '-180px', right: '-160px', zIndex: 0 }}
      />
      <GrooveBlob
        palette="orchard"
        size={460}
        blur={70}
        opacity={0.4}
        style={{ position: 'absolute', bottom: '-120px', left: '-100px', zIndex: 0 }}
      />

      {/* Editorial edition mark — keeps the mono-label rhythm */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 'clamp(20px, 5vw, 64px)',
          zIndex: 1,
          color: 'var(--pl-groove-terra)',
          fontFamily: 'var(--pl-font-mono)',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          display: 'flex',
          gap: 18,
          alignItems: 'center',
        }}
      >
        <span>Built for life&rsquo;s biggest days</span>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--pl-groove-terra)' }} />
        <span>The Event OS</span>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
          gap: 'clamp(32px, 5vw, 80px)',
          alignItems: 'center',
        }}
        className="pl-groove-hero-grid"
      >
        {/* ── Left column: copy + CTAs ── */}
        <div>
          <BlurFade delay={0.05}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 14px',
                borderRadius: 'var(--pl-groove-radius-pill)',
                background: 'color-mix(in oklab, var(--pl-groove-butter) 28%, transparent)',
                border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 32%, transparent)',
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--pl-groove-plum)',
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--pl-groove-terra)',
                }}
              />
              Pear + Loom
            </div>
          </BlurFade>

          <BlurFade delay={0.15}>
            <h1
              className="pl-display"
              style={{
                margin: 0,
                fontSize: 'clamp(2.8rem, 6.8vw, 5rem)',
                lineHeight: 1.0,
                letterSpacing: '-0.02em',
                color: 'var(--pl-groove-ink)',
                fontStyle: 'italic',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              One loom for every
              <br />
              <GooeyText
                words={ROTATING_NOUN}
                interval={2600}
                fontSize="inherit"
                italic
                color="var(--pl-groove-terra)"
                fontFamily="var(--pl-font-display)"
                letterSpacing="-0.02em"
                intensity={10}
              />
            </h1>
          </BlurFade>

          <BlurFade delay={0.3}>
            <p
              style={{
                margin: '24px 0 0',
                maxWidth: '48ch',
                fontSize: 'clamp(1.04rem, 1.4vw, 1.2rem)',
                lineHeight: 1.55,
                color: 'color-mix(in oklab, var(--pl-groove-ink) 76%, transparent)',
              }}
            >
              A craft house for memory. AI drafts it, you hand-edit it,
              we press it to paper. One woven artifact for the day that
              matters — from a bachelor weekend to a 50th anniversary.
            </p>
          </BlurFade>

          <BlurFade delay={0.4}>
            <div
              style={{
                marginTop: 28,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 16px',
                borderRadius: 'var(--pl-groove-radius-pill)',
                background: 'color-mix(in oklab, var(--pl-groove-butter) 22%, var(--pl-groove-cream))',
                border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 26%, transparent)',
              }}
              aria-live="polite"
              aria-label={`Pear is ${THREADING_STEPS[draftStep]}`}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  background:
                    'var(--pl-groove-blob-sunrise, linear-gradient(135deg, var(--pl-groove-butter), var(--pl-groove-rose)))',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'color-mix(in oklab, var(--pl-groove-ink) 55%, transparent)',
                }}
              >
                Pear is
              </span>
              <span
                key={draftStep}
                style={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 14,
                  color: 'var(--pl-groove-sage)',
                  minWidth: 172,
                  display: 'inline-block',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  animation: 'pl-enter-fade-in 280ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {THREADING_STEPS[draftStep]}…
              </span>
            </div>
          </BlurFade>

          <BlurFade delay={0.48}>
            <div
              style={{
                marginTop: 20,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <MagneticHover strength={0.25} radius={140}>
                <SquishyButton size="lg" onClick={onGetStarted}>
                  Begin a new site
                </SquishyButton>
              </MagneticHover>
              <MagneticHover strength={0.2} radius={120}>
                <SquishyButton
                  size="lg"
                  palette="orchard"
                  onClick={() => {
                    document.getElementById('showroom')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  See the showroom
                </SquishyButton>
              </MagneticHover>
            </div>
          </BlurFade>

          <BlurFade delay={0.6}>
            <p
              style={{
                marginTop: 18,
                fontSize: '0.82rem',
                color: 'color-mix(in oklab, var(--pl-groove-ink) 62%, transparent)',
              }}
            >
              Free to start · No credit card · Your first site is{' '}
              <span style={{ color: 'var(--pl-groove-terra)', fontWeight: 600 }}>yours to keep</span>.
            </p>
          </BlurFade>

          <BlurFade delay={0.72}>
            <div
              style={{
                marginTop: 34,
                paddingTop: 26,
                borderTop: '1px solid color-mix(in oklab, var(--pl-groove-terra) 20%, transparent)',
                display: 'flex',
                gap: 'clamp(20px, 3vw, 36px)',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              {HERO_STATS.map((s, i) => (
                <div
                  key={s.l}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'clamp(20px, 3vw, 36px)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: '"Fraunces", Georgia, serif',
                        fontStyle: 'italic',
                        fontWeight: 400,
                        fontSize: 26,
                        lineHeight: 1,
                        color: s.c,
                        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                      }}
                    >
                      {s.n}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--pl-font-body)',
                        fontSize: 12,
                        color: 'color-mix(in oklab, var(--pl-groove-ink) 62%, transparent)',
                        marginTop: 4,
                        maxWidth: 150,
                        lineHeight: 1.35,
                      }}
                    >
                      {s.l}
                    </div>
                  </div>
                  {i < HERO_STATS.length - 1 && (
                    <div
                      aria-hidden
                      style={{
                        width: 1,
                        height: 40,
                        background: 'color-mix(in oklab, var(--pl-groove-ink) 12%, transparent)',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </BlurFade>
        </div>

        {/* ── Right column: 3D pear + ripple halo ── */}
        <BlurFade delay={0.2} distance={20}>
          <div
            style={{
              position: 'relative',
              width: 'min(100%, 440px)',
              aspectRatio: '1 / 1',
              margin: '0 auto',
            }}
          >
            <Ripple
              count={6}
              minSize={180}
              step={44}
              color="var(--pl-groove-butter)"
              opacity={0.9}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RipeningPear size={360} />
            </div>
          </div>
        </BlurFade>
      </div>

      {/* Mobile tweak: pear goes below copy */}
      <style>{`
        @media (max-width: 820px) {
          .pl-groove-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
        }
      `}</style>
    </section>
  );
}
