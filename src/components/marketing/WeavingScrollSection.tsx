'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/WeavingScrollSection.tsx
//
// The signature "watch it weave" moment. A scroll-pinned
// 200vh tall section where a blank page weaves itself into a
// finished Pearloom site across 5 scroll beats:
//
//   Beat 0  — blank paper with a faint grid (0–10%)
//   Beat 1  — section rails draw in (10–30%)
//   Beat 2  — photo + chapter cards drop into place (30–50%)
//   Beat 3  — palette washes in, hero blob blooms (50–70%)
//   Beat 4  — names + headline type in, final polish (70–90%)
//   Beat 5  — "Your celebration is ready" badge (90–100%)
//
// Built on framer-motion's useScroll + useTransform with the
// section pinned via CSS position: sticky. Respects reduced-
// motion: renders the final composed frame without animation.
// ─────────────────────────────────────────────────────────────

import { AnimatePresence, motion, useScroll, useTransform, useReducedMotion, useMotionValueEvent, type MotionValue } from 'framer-motion';
import { useRef, useState } from 'react';
import { BlurFade, CurvedText } from '@/components/brand/groove';

interface WeavingScrollSectionProps {
  /** Optional couple/honoree names used in the finished page. */
  demoName1?: string;
  demoName2?: string;
}

// Tiny helper so transform maps stay readable.
const range = (mv: MotionValue<number>, from: number, to: number, v0: number, v1: number) =>
  useTransform(mv, [from, to], [v0, v1], { clamp: true });

export function WeavingScrollSection({
  demoName1 = 'Emma',
  demoName2 = 'James',
}: WeavingScrollSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // `progress` runs 0 → 1 across the whole 200vh scroll region.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });
  const p = reduced ? (useTransform(scrollYProgress, [0, 1], [1, 1]) as MotionValue<number>) : scrollYProgress;

  // ── Beat opacities (stagger with small cross-fade windows) ──
  const gridOpacity    = range(p, 0.02, 0.15, 0, 0.5);
  const gridFade       = range(p, 0.75, 0.95, 0.5, 0);
  const combinedGridOp = useTransform([gridOpacity, gridFade], ([a, b]) => Math.min(a as number, b as number));

  const railOpacity    = range(p, 0.12, 0.28, 0, 1);
  const railScaleX     = range(p, 0.12, 0.32, 0, 1);

  const heroBlobOp     = range(p, 0.48, 0.65, 0, 1);
  const heroBlobScale  = range(p, 0.48, 0.7, 0.6, 1);
  const heroBlobHue    = useTransform(p, [0.48, 0.9], [80, 24]); // green → orange-ish

  const photoDrop0     = range(p, 0.3, 0.46, -40, 0);
  const photo0Op       = range(p, 0.3, 0.46, 0, 1);
  const photoDrop1     = range(p, 0.35, 0.52, -40, 0);
  const photo1Op       = range(p, 0.35, 0.52, 0, 1);
  const photoDrop2     = range(p, 0.4, 0.58, -40, 0);
  const photo2Op       = range(p, 0.4, 0.58, 0, 1);

  const chapterOp0     = range(p, 0.32, 0.5, 0, 1);
  const chapterOp1     = range(p, 0.38, 0.56, 0, 1);

  const paletteOp      = range(p, 0.52, 0.68, 0, 1);
  const paletteWashOp  = range(p, 0.56, 0.72, 0, 0.6);

  const nameOp         = range(p, 0.68, 0.82, 0, 1);
  const nameY          = range(p, 0.68, 0.85, 20, 0);
  const taglineOp      = range(p, 0.76, 0.9, 0, 1);

  const badgeOp        = range(p, 0.88, 0.98, 0, 1);
  const badgeScale     = range(p, 0.88, 1, 0.7, 1);

  // Beat index as React state — the label renders as normal text
  // (a framer MotionValue<string> can't go into a React child slot).
  const [beatIdx, setBeatIdx] = useState(0);
  useMotionValueEvent(p, 'change', (v) => {
    const next =
      v < 0.12 ? 0 :
      v < 0.3  ? 1 :
      v < 0.5  ? 2 :
      v < 0.7  ? 3 :
      v < 0.88 ? 4 :
      5;
    setBeatIdx((prev) => (prev === next ? prev : next));
  });
  const beatLabel = [
    'Blank page',
    'Drawing the structure',
    'Placing your photos',
    'Painting your palette',
    'Writing your story',
    'Your celebration is ready',
  ][beatIdx];

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        // 420vh gives ~84vh of stuck scroll per beat. Anything tighter
        // zips past the user on high-DPI trackpads before they can
        // read a single beat label.
        height: reduced ? 'auto' : '420vh',
        background: 'var(--pl-groove-cream)',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Section intro copy — visible at beat 0, fully gone by the
            time beat 2 (photos) lands so the stage is unobstructed. */}
        <motion.div
          style={{
            position: 'absolute',
            top: 'clamp(48px, 8vh, 96px)',
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: useTransform(p, [0, 0.1, 0.26], [1, 1, 0]),
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          <div
            aria-hidden
            style={{
              color: 'var(--pl-groove-terra)',
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 0,
            }}
          >
            <CurvedText
              variant="arc"
              width={360}
              amplitude={22}
              fontFamily='"Fraunces", Georgia, serif'
              fontSize={22}
              fontStyle="italic"
              fontWeight={400}
              letterSpacing={1.5}
              aria-label="Watch it weave"
            >
              ✧  Watch it weave  ✧
            </CurvedText>
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--pl-font-body)',
              fontSize: 'clamp(2rem, 4.5vw, 3rem)',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--pl-groove-ink)',
            }}
          >
            From blank page to published in five beats.
          </h2>
        </motion.div>

        {/* The stage — a device mock-up the weave takes place inside. */}
        <div
          style={{
            position: 'relative',
            width: 'min(92vw, 1040px)',
            aspectRatio: '16 / 10',
            maxHeight: '72vh',
            borderRadius: 'clamp(18px, 2vw, 28px)',
            background: '#FBF3E4',
            border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 22%, transparent)',
            boxShadow:
              '0 40px 80px rgba(43,30,20,0.15), 0 8px 24px rgba(139,74,106,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Grid scaffolding */}
          <motion.div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              opacity: combinedGridOp,
              backgroundImage:
                'linear-gradient(to right, color-mix(in oklab, var(--pl-groove-terra) 22%, transparent) 1px, transparent 1px),' +
                ' linear-gradient(to bottom, color-mix(in oklab, var(--pl-groove-terra) 22%, transparent) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Rails — the 3 horizontal section guides */}
          {[0.28, 0.56, 0.82].map((top, i) => (
            <motion.span
              key={i}
              aria-hidden
              style={{
                position: 'absolute',
                left: '8%',
                right: '8%',
                top: `${top * 100}%`,
                height: 1.5,
                background: 'color-mix(in oklab, var(--pl-groove-terra) 48%, transparent)',
                transformOrigin: 'left center',
                scaleX: railScaleX,
                opacity: railOpacity,
              }}
            />
          ))}

          {/* Palette wash — the colors paint in */}
          <motion.div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              opacity: paletteWashOp,
              background:
                'radial-gradient(ellipse at 50% 0%, color-mix(in oklab, var(--pl-groove-butter) 40%, transparent) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />

          {/* Hero blob — grows, hue-shifts from sage → terra */}
          <motion.div
            aria-hidden
            style={{
              position: 'absolute',
              top: '-16%',
              right: '-8%',
              width: '44%',
              aspectRatio: '1',
              borderRadius: '42% 58% 70% 30% / 45% 30% 70% 55%',
              background: 'var(--pl-groove-terra)',
              opacity: heroBlobOp,
              scale: heroBlobScale,
              filter: useTransform(heroBlobHue, (h) => `hue-rotate(${h}deg) blur(2px)`),
            }}
          />

          {/* 3 photos drop in */}
          <motion.div
            style={{
              position: 'absolute',
              left: '10%',
              top: '10%',
              width: '22%',
              aspectRatio: '3 / 4',
              y: photoDrop0,
              opacity: photo0Op,
              background:
                'linear-gradient(135deg, var(--pl-groove-rose) 0%, var(--pl-groove-butter) 100%)',
              borderRadius: 12,
              boxShadow: '0 12px 24px rgba(43,30,20,0.14)',
              transform: 'rotate(-3deg)',
            }}
          />
          <motion.div
            style={{
              position: 'absolute',
              left: '36%',
              top: '6%',
              width: '20%',
              aspectRatio: '3 / 4',
              y: photoDrop1,
              opacity: photo1Op,
              background:
                'linear-gradient(135deg, var(--pl-groove-sage) 0%, var(--pl-groove-cream) 100%)',
              borderRadius: 12,
              boxShadow: '0 12px 24px rgba(43,30,20,0.14)',
              transform: 'rotate(2deg)',
            }}
          />
          <motion.div
            style={{
              position: 'absolute',
              left: '60%',
              top: '12%',
              width: '22%',
              aspectRatio: '3 / 4',
              y: photoDrop2,
              opacity: photo2Op,
              background:
                'linear-gradient(135deg, var(--pl-groove-butter) 0%, var(--pl-groove-terra) 100%)',
              borderRadius: 12,
              boxShadow: '0 12px 24px rgba(43,30,20,0.14)',
              transform: 'rotate(-1.5deg)',
            }}
          />

          {/* Names appear center-stage at beat 4 */}
          <motion.div
            style={{
              position: 'absolute',
              left: '10%',
              top: '60%',
              right: '10%',
              opacity: nameOp,
              y: nameY,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--pl-font-body)',
                fontSize: '0.88rem',
                fontWeight: 500,
                color: 'var(--pl-groove-terra)',
                marginBottom: 6,
              }}
            >
              October 12 · Hudson Valley
            </div>
            <div
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(2.4rem, 5vw, 4.4rem)',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                color: 'var(--pl-groove-ink)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              {demoName1} &amp; {demoName2}
            </div>
            <motion.p
              style={{
                marginTop: 14,
                maxWidth: '52ch',
                fontFamily: 'var(--pl-font-body)',
                fontSize: 'clamp(0.88rem, 1.1vw, 1.02rem)',
                lineHeight: 1.55,
                color: 'color-mix(in oklab, var(--pl-groove-ink) 68%, transparent)',
                opacity: taglineOp,
              }}
            >
              A garden ceremony with sage hairlines, a botanical RSVP,
              and three chapters of the summer we met.
            </motion.p>
          </motion.div>

          {/* Two chapter badges pinned at the bottom edge */}
          <motion.div
            style={{
              position: 'absolute',
              left: '10%',
              bottom: '8%',
              padding: '6px 12px',
              borderRadius: 999,
              background:
                'color-mix(in oklab, var(--pl-groove-sage) 22%, var(--pl-groove-cream))',
              color: 'var(--pl-groove-ink)',
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.72rem',
              fontWeight: 600,
              opacity: chapterOp0,
            }}
          >
            Chapter 01 · We met
          </motion.div>
          <motion.div
            style={{
              position: 'absolute',
              left: '32%',
              bottom: '8%',
              padding: '6px 12px',
              borderRadius: 999,
              background:
                'color-mix(in oklab, var(--pl-groove-rose) 22%, var(--pl-groove-cream))',
              color: 'var(--pl-groove-ink)',
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.72rem',
              fontWeight: 600,
              opacity: chapterOp1,
            }}
          >
            Chapter 02 · The proposal
          </motion.div>

          {/* Palette swatch strip */}
          <motion.div
            aria-hidden
            style={{
              position: 'absolute',
              right: '10%',
              bottom: '12%',
              display: 'flex',
              gap: 0,
              opacity: paletteOp,
              borderRadius: 6,
              overflow: 'hidden',
              border: '1px solid color-mix(in oklab, var(--pl-groove-ink) 10%, transparent)',
              boxShadow: '0 4px 12px rgba(43,30,20,0.08)',
            }}
          >
            {[
              'var(--pl-groove-terra)',
              'var(--pl-groove-butter)',
              'var(--pl-groove-sage)',
              'var(--pl-groove-rose)',
              'var(--pl-groove-ink)',
            ].map((c) => (
              <span
                key={c}
                style={{ width: 28, height: 40, background: c, display: 'block' }}
              />
            ))}
          </motion.div>

          {/* "Your celebration is ready" badge */}
          <motion.div
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              padding: '10px 16px',
              borderRadius: 999,
              background: 'var(--pl-groove-blob-sunrise)',
              color: '#fff',
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.86rem',
              fontWeight: 700,
              letterSpacing: '-0.005em',
              boxShadow: '0 10px 24px rgba(139,74,106,0.28)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              opacity: badgeOp,
              scale: badgeScale,
            }}
          >
            <span>✦</span>
            Your celebration is ready
          </motion.div>
        </div>

        {/* Progress tracker — always-visible beat label + 6 dots.
            Sits below the stage so the user can read which beat is
            active even while the intro has faded. */}
        <div
          style={{
            position: 'absolute',
            bottom: 'clamp(24px, 5vh, 56px)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            zIndex: 20,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={beatIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: 'var(--pl-font-body)',
                fontSize: '0.92rem',
                fontWeight: 600,
                letterSpacing: '-0.005em',
                color: 'var(--pl-groove-ink)',
                padding: '6px 16px',
                borderRadius: 'var(--pl-groove-radius-pill)',
                background: 'color-mix(in oklab, var(--pl-groove-cream) 85%, transparent)',
                backdropFilter: 'saturate(140%) blur(8px)',
                WebkitBackdropFilter: 'saturate(140%) blur(8px)',
                border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 22%, transparent)',
                whiteSpace: 'nowrap',
              }}
            >
              {beatLabel}
            </motion.div>
          </AnimatePresence>
          <div style={{ display: 'flex', gap: 10 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.span
                key={i}
                aria-hidden
                style={{
                  display: 'block',
                  width: 26,
                  height: 4,
                  borderRadius: 4,
                  background:
                    beatIdx === i
                      ? 'var(--pl-groove-blob-sunrise)'
                      : 'color-mix(in oklab, var(--pl-groove-ink) 18%, transparent)',
                  transition: 'background var(--pl-dur-base) var(--pl-ease-out)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bookend line beneath the pinned scene */}
      <BlurFade>
        <div
          style={{
            position: 'relative',
            textAlign: 'center',
            padding: 'clamp(40px, 6vw, 72px) 20px 0',
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--pl-font-body)',
              fontSize: '1.04rem',
              color: 'color-mix(in oklab, var(--pl-groove-ink) 62%, transparent)',
              maxWidth: '48ch',
              marginInline: 'auto',
              lineHeight: 1.55,
            }}
          >
            Yours takes about five minutes.
          </p>
        </div>
      </BlurFade>
    </section>
  );
}
