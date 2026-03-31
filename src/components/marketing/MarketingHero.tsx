'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { SiteMockup } from './SiteMockup';
import { colors as C, text, card, sectionPadding, layout } from '@/lib/design-tokens';
import { Pill } from '@/components/ui/Pill';
import { Button, Badge } from '@/components/ui';

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
          <Button
            variant="accent"
            size="lg"
            onClick={handleSignIn}
            disabled={status === 'loading'}
            loading={status === 'loading'}
          >
            Create Your Free Site <ArrowRight size={15} strokeWidth={2.2} />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => window.open('/demo', '_blank')}
            className="group"
          >
            See Examples
            <ArrowRight
              size={14}
              strokeWidth={2}
              className="transition-transform duration-250 ease-out group-hover:translate-x-1"
            />
          </Button>
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
            <Badge key={item} variant="success">
              {item}
            </Badge>
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
