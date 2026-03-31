'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { SiteMockup } from './SiteMockup';
import { C, EASE } from './colors';
import { text, radius } from '@/lib/design-tokens';
import { Pill } from '@/components/ui/Pill';

const OCCASIONS = [
  'Weddings',
  'Birthdays',
  'Anniversaries',
  'Engagements',
  'Reunions',
  'Every Celebration',
];

function RotatingOccasion() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % OCCASIONS.length), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={OCCASIONS[i]}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="inline-block"
        style={{ color: C.plum }}
      >
        {OCCASIONS[i]}
      </motion.span>
    </AnimatePresence>
  );
}


/* Decorative thread SVG — pear-loom brand motif */
function ThreadOrnament() {
  return (
    <svg width="120" height="24" viewBox="0 0 120 24" fill="none" aria-hidden="true" className="opacity-30">
      <path
        d="M0 12 C20 12, 25 4, 40 4 C55 4, 55 20, 70 20 C85 20, 85 4, 100 4 C110 4, 115 12, 120 12"
        stroke={C.gold}
        strokeWidth="1.2"
        fill="none"
      />
      <path
        d="M0 12 C20 12, 25 20, 40 20 C55 20, 55 4, 70 4 C85 4, 85 20, 100 20 C110 20, 115 12, 120 12"
        stroke={C.olive}
        strokeWidth="1.2"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

/* Floating decorative dots in brand colors */
const FLOATING_DOTS = [
  { color: C.olive, size: 6, left: '12%', top: '18%', delay: 0, duration: 18 },
  { color: C.gold, size: 4, left: '8%', top: '55%', delay: 2, duration: 22 },
  { color: C.plum, size: 5, left: '85%', top: '25%', delay: 1.5, duration: 20 },
  { color: C.olive, size: 3, left: '90%', top: '60%', delay: 3, duration: 16 },
  { color: C.gold, size: 7, left: '25%', top: '72%', delay: 0.5, duration: 24 },
  { color: C.plum, size: 4, left: '75%', top: '78%', delay: 2.5, duration: 19 },
  { color: C.olive, size: 5, left: '50%', top: '12%', delay: 1, duration: 21 },
  { color: C.gold, size: 3, left: '65%', top: '45%', delay: 3.5, duration: 17 },
  { color: C.plum, size: 6, left: '35%', top: '85%', delay: 0.8, duration: 23 },
];

function FloatingDots() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {FLOATING_DOTS.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: dot.size,
            height: dot.size,
            left: dot.left,
            top: dot.top,
            background: dot.color,
            opacity: 0.18,
          }}
          animate={{
            y: [0, -20, 5, -15, 0],
            x: [0, 8, -5, 12, 0],
            opacity: [0.18, 0.28, 0.14, 0.24, 0.18],
          }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            delay: dot.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* Animated gradient mesh background */
function GradientMesh() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
      animate={{
        background: [
          `radial-gradient(ellipse 60% 50% at 25% 30%, rgba(163,177,138,0.14) 0%, transparent 70%),
           radial-gradient(ellipse 50% 60% at 75% 65%, rgba(109,89,122,0.10) 0%, transparent 70%),
           radial-gradient(ellipse 40% 40% at 55% 20%, rgba(214,198,168,0.08) 0%, transparent 60%)`,
          `radial-gradient(ellipse 60% 50% at 35% 50%, rgba(163,177,138,0.12) 0%, transparent 70%),
           radial-gradient(ellipse 50% 60% at 65% 35%, rgba(109,89,122,0.12) 0%, transparent 70%),
           radial-gradient(ellipse 40% 40% at 45% 70%, rgba(214,198,168,0.10) 0%, transparent 60%)`,
          `radial-gradient(ellipse 60% 50% at 20% 60%, rgba(163,177,138,0.10) 0%, transparent 70%),
           radial-gradient(ellipse 50% 60% at 80% 40%, rgba(109,89,122,0.14) 0%, transparent 70%),
           radial-gradient(ellipse 40% 40% at 50% 30%, rgba(214,198,168,0.06) 0%, transparent 60%)`,
          `radial-gradient(ellipse 60% 50% at 25% 30%, rgba(163,177,138,0.14) 0%, transparent 70%),
           radial-gradient(ellipse 50% 60% at 75% 65%, rgba(109,89,122,0.10) 0%, transparent 70%),
           radial-gradient(ellipse 40% 40% at 55% 20%, rgba(214,198,168,0.08) 0%, transparent 60%)`,
        ],
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

const TRUST_ITEMS = [
  'Free to start',
  'No credit card',
  'Live in minutes',
];

interface MarketingHeroProps {
  handleSignIn: () => void;
  status: string;
}

export function MarketingHero({ handleSignIn, status }: MarketingHeroProps) {
  const ref = useRef<HTMLElement>(null);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden flex flex-col items-center"
      style={{
        minHeight: 'min(100dvh, 900px)',
        padding: 'clamp(3.5rem,8vw,7rem) 1.25rem clamp(2.5rem,4vw,4rem)',
        background: C.cream,
      }}
    >
      {/* Animated gradient mesh */}
      <GradientMesh />

      {/* Floating decorative dots */}
      <FloatingDots />

      {/* Decorative rings */}
      <svg
        aria-hidden="true"
        width="420"
        height="420"
        viewBox="0 0 420 420"
        className="absolute -top-20 -right-24 opacity-[0.08] pointer-events-none"
      >
        <circle cx="210" cy="210" r="205" stroke={C.gold} strokeWidth="1" fill="none" />
        <circle
          cx="210"
          cy="210"
          r="170"
          stroke={C.olive}
          strokeWidth="0.5"
          fill="none"
          strokeDasharray="4 9"
        />
      </svg>

      <div className="relative z-10 w-full max-w-[960px] text-center">
        {/* Eyebrow pill with rotating occasion */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 flex justify-center"
        >
          <Pill sparkle>
            Powered by The Loom · <RotatingOccasion />
          </Pill>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
          className="font-[family-name:var(--eg-font-heading)] font-bold leading-[1.05] tracking-[-0.035em] mb-5"
          style={{
            fontSize: 'clamp(2.8rem, 7vw, 5.8rem)',
            color: C.ink,
          }}
        >
          Every moment worth celebrating
          <br />
          <span style={{ background: 'linear-gradient(135deg, #6D597A, #9B7FB8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>deserves its own world.</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.5 }}
          className="mx-auto mb-8 leading-relaxed"
          style={{
            fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
            color: C.muted,
            maxWidth: 540,
            lineHeight: 1.8,
          }}
        >
          Upload your photos. Share your vibe. Watch{' '}
          <strong style={{ color: C.dark, fontWeight: 600 }}>The Loom</strong> weave a site
          that&rsquo;s unmistakably, irreplaceably yours.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.7 }}
          className="flex gap-3 justify-center flex-wrap"
        >
          <motion.button
            onClick={handleSignIn}
            disabled={status === 'loading'}
            whileHover={{ scale: 1.04, boxShadow: '0 14px 50px rgba(163,177,138,0.48)' }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex items-center gap-2 font-semibold font-[family-name:var(--eg-font-body)] border-none cursor-pointer relative overflow-hidden"
            style={{
              padding: '1.1rem 2.6rem',
              background: 'linear-gradient(135deg, #A3B18A, #8BA77A)',
              color: C.cream,
              borderRadius: radius.md,
              fontSize: text.md,
              boxShadow: '0 4px 24px rgba(163,177,138,0.32)',
              opacity: status === 'loading' ? 0.65 : 1,
            }}
          >
            {/* Shimmer/shine overlay on hover */}
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.25) 45%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.25) 55%, transparent 65%)',
                backgroundSize: '250% 100%',
                animation: 'none',
                transition: 'opacity 0.3s ease',
              }}
            />
            <style>{`
              .group:hover .shimmer-sweep {
                animation: shimmer-sweep 0.8s ease forwards;
              }
              @keyframes shimmer-sweep {
                0% { background-position: 100% 0; }
                100% { background-position: -50% 0; }
              }
            `}</style>
            <span
              className="shimmer-sweep absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.2) 55%, transparent 65%)',
                backgroundSize: '250% 100%',
                backgroundPosition: '100% 0',
              }}
            />
            <span className="relative z-10 inline-flex items-center gap-2">
              Create Your Free Site <ArrowRight size={15} strokeWidth={2.2} />
            </span>
          </motion.button>
          <motion.button
            onClick={() => window.open('/demo', '_blank')}
            whileHover={{ scale: 1.02, background: C.deep }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex items-center gap-2 font-medium font-[family-name:var(--eg-font-body)] cursor-pointer"
            style={{
              padding: '1.1rem 2.6rem',
              background: 'transparent',
              color: C.dark,
              border: `1.5px solid ${C.gold}`,
              borderRadius: radius.md,
              fontSize: text.md,
            }}
          >
            See Examples
            <motion.span
              className="inline-flex"
              style={{ transition: 'transform 0.25s ease' }}
            >
              <ArrowRight
                size={14}
                strokeWidth={2}
                className="transition-transform duration-250 ease-out group-hover:translate-x-1"
              />
            </motion.span>
          </motion.button>
        </motion.div>

        {/* Trust badges with checkmarks */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="mt-5 flex items-center justify-center gap-4 flex-wrap"
        >
          {TRUST_ITEMS.map((item, i) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5"
              style={{ fontSize: text.sm, color: C.muted }}
            >
              <span
                className="inline-flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: 14,
                  height: 14,
                  background: `${C.olive}22`,
                }}
              >
                <Check size={9} strokeWidth={2.8} style={{ color: C.olive }} />
              </span>
              {item}
            </span>
          ))}
        </motion.div>

        {/* Product preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease: EASE }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <SiteMockup />
        </motion.div>
        <div className="hidden sm:block" style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(214,198,168,0.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 flex flex-col items-center gap-1.5 font-bold tracking-[0.18em] uppercase"
        style={{ fontSize: text.xs, color: C.gold }}
      >
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
          <svg width="13" height="20" viewBox="0 0 13 20" fill="none" aria-hidden="true">
            <rect x="0.75" y="0.75" width="11.5" height="18.5" rx="5.75" stroke="currentColor" strokeWidth="1.2" />
            <motion.circle
              cx="6.5"
              cy="5.5"
              r="1.8"
              fill="currentColor"
              animate={{ cy: [5.5, 11.5, 5.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>
        </motion.div>
        Scroll
      </motion.div>
    </section>
  );
}
