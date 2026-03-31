'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { SiteMockup } from './SiteMockup';
import { C, EASE } from './colors';

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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[0.7rem] font-bold tracking-[0.14em] uppercase"
      style={{
        background: 'rgba(163,177,138,0.12)',
        border: '1px solid rgba(163,177,138,0.3)',
        color: C.olive,
      }}
    >
      {children}
    </span>
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
        background: `radial-gradient(ellipse at 20% 30%, rgba(163,177,138,0.09) 0%, transparent 55%),
                     radial-gradient(ellipse at 80% 70%, rgba(109,89,122,0.07) 0%, transparent 50%),
                     ${C.cream}`,
      }}
    >
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
          <Pill>
            <Sparkles size={9} strokeWidth={2.5} />
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
            whileHover={{ scale: 1.04, boxShadow: '0 10px 40px rgba(163,177,138,0.42)' }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 font-semibold font-[family-name:var(--eg-font-body)] border-none cursor-pointer"
            style={{
              padding: '0.95rem 2.1rem',
              background: 'linear-gradient(135deg, #A3B18A, #8BA77A)',
              color: C.cream,
              borderRadius: '0.8rem',
              fontSize: '0.95rem',
              boxShadow: '0 2px 16px rgba(163,177,138,0.28)',
              opacity: status === 'loading' ? 0.65 : 1,
            }}
          >
            Create Your Free Site <ArrowRight size={15} strokeWidth={2.2} />
          </motion.button>
          <motion.button
            onClick={() => window.open('/demo', '_blank')}
            whileHover={{ scale: 1.02, background: C.deep }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 font-medium font-[family-name:var(--eg-font-body)] cursor-pointer"
            style={{
              padding: '0.95rem 2.1rem',
              background: 'transparent',
              color: C.dark,
              border: `1.5px solid ${C.gold}`,
              borderRadius: '0.8rem',
              fontSize: '0.95rem',
            }}
          >
            See Examples
          </motion.button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="mt-5 text-[0.76rem] tracking-wider"
          style={{ color: C.muted }}
        >
          Free to start · No credit card · Live in minutes
        </motion.p>

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
        className="absolute bottom-8 flex flex-col items-center gap-1.5 text-[0.6rem] font-bold tracking-[0.18em] uppercase"
        style={{ color: C.gold }}
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
