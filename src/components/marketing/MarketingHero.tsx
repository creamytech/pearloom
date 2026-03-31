'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { SiteMockup } from './SiteMockup';
import { colors as C, text, card, sectionPadding, layout } from '@/lib/design-tokens';
import { Pill } from '@/components/ui/Pill';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

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
      <div className="relative z-10 w-full text-center" style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}>
        {/* Eyebrow pill with rotating occasion */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
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
          transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
          className="font-[family-name:var(--eg-font-heading)] leading-[1.05] mb-5"
          style={{
            fontSize: 'clamp(3.2rem, 8vw, 6.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            color: C.ink,
          }}
        >
          Every moment worth celebrating
          <br />
          <span style={{ color: C.plum, fontStyle: 'italic' }}>deserves its own world.</span>
        </motion.h1>

        {/* Gold editorial rule */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.45, ease: EASE }}
          style={{
            width: '80px',
            height: '1px',
            background: C.gold,
            margin: '0 auto 2rem',
          }}
        />

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mx-auto mb-8"
          style={{
            fontSize: 'clamp(1.05rem, 1.8vw, 1.2rem)',
            fontFamily: 'var(--eg-font-body)',
            color: C.muted,
            maxWidth: 480,
            lineHeight: 1.9,
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
          transition={{ duration: 0.8, delay: 0.75 }}
          className="flex gap-3 justify-center flex-wrap"
        >
          <motion.button
            onClick={handleSignIn}
            disabled={status === 'loading'}
            whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(163,177,138,0.35)' }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 font-semibold font-[family-name:var(--eg-font-body)] border-none cursor-pointer"
            style={{
              padding: '1rem 2.8rem',
              background: C.olive,
              color: C.cream,
              borderRadius: card.radius,
              fontSize: '1rem',
              letterSpacing: '0.03em',
              boxShadow: '0 4px 24px rgba(163,177,138,0.32)',
              opacity: status === 'loading' ? 0.65 : 1,
              transition: 'box-shadow 0.25s ease',
            }}
          >
            Create Your Free Site <ArrowRight size={15} strokeWidth={2.2} />
          </motion.button>
          <motion.button
            onClick={() => window.open('/demo', '_blank')}
            whileHover={{ scale: 1.02, background: C.deep }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex items-center gap-2 font-medium font-[family-name:var(--eg-font-body)] cursor-pointer"
            style={{
              padding: '1rem 2.8rem',
              background: 'transparent',
              color: C.dark,
              border: `1px solid ${C.divider}`,
              borderRadius: card.radius,
              fontSize: '1rem',
              letterSpacing: '0.03em',
            }}
          >
            See Examples
            <ArrowRight
              size={14}
              strokeWidth={2}
              className="transition-transform duration-250 ease-out group-hover:translate-x-1"
            />
          </motion.button>
        </motion.div>

        {/* Trust badges with checkmarks */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.8 }}
          className="mt-5 flex flex-col items-center"
        >
          {/* Gold rule above trust badges */}
          <div
            style={{
              width: '60px',
              height: '1px',
              background: C.gold,
              opacity: 0.4,
              marginBottom: '1.25rem',
            }}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="flex items-center justify-center gap-4 flex-wrap"
        >
          {TRUST_ITEMS.map((item) => (
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
          transition={{ duration: 1.0, delay: 1.0, ease: EASE }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <SiteMockup />
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
        className="absolute bottom-8 flex flex-col items-center gap-1"
        style={{ fontSize: text.xs, color: C.gold, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}
      >
        Scroll
        <motion.div animate={{ y: [0, 4, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
