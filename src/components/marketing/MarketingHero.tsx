'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { SiteMockup } from './SiteMockup';
import { layout } from '@/lib/design-tokens';
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
    const t = setInterval(() => setI((x) => (x + 1) % OCCASIONS.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={OCCASIONS[i]}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.32, ease: EASE }}
        className="inline-block text-[var(--pl-plum)]"
      >
        {OCCASIONS[i]}
      </motion.span>
    </AnimatePresence>
  );
}

const TRUST_ITEMS = ['Free to start', 'No credit card', 'Live in minutes'];

interface MarketingHeroProps {
  handleSignIn: () => void;
  status: string;
}

export function MarketingHero({ handleSignIn, status }: MarketingHeroProps) {
  const ref = useRef<HTMLElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

  // Parallax tilt on hover
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [4, -4]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-400, 400], [-4, 4]), { stiffness: 150, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mockupRef.current) return;
    const rect = mockupRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <section
      ref={ref}
      className="relative overflow-hidden flex flex-col items-center"
      style={{
        minHeight: 'min(100dvh, 860px)',
        padding: 'clamp(3rem,6vw,5.5rem) 1.5rem clamp(2rem,4vw,4rem)',
        background: 'radial-gradient(ellipse at 50% 0%, var(--pl-cream-deep) 0%, var(--pl-cream) 55%)',
      }}
    >
      {/* Ambient orb */}
      <div
        aria-hidden="true"
        className="absolute top-[-10%] right-[-12%] w-[55vw] h-[55vw] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--pl-olive-mist) 0%, transparent 70%)',
          filter: 'blur(90px)',
          opacity: 0.55,
          animation: 'orb-drift 22s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[-8%] left-[-10%] w-[40vw] h-[40vw] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--pl-plum-mist) 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.35,
          animation: 'orb-drift 28s ease-in-out infinite reverse',
        }}
      />

      <div
        className="relative z-10 w-full text-center"
        style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}
      >
        {/* Eyebrow pill */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mb-6 flex justify-center"
        >
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--pl-muted)]">
            The Pearloom Platform
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
          className="font-heading leading-[1.08] mb-4 text-[var(--pl-ink-soft)]"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 4.2rem)', fontWeight: 600, letterSpacing: '-0.03em' }}
        >
          Every moment, woven into
          <br />
          <em className="text-[var(--pl-olive-deep)]" style={{ fontStyle: 'italic' }}>
            timeless beauty.
          </em>
        </motion.h1>

        {/* Gold editorial rule */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.42, ease: EASE }}
          className="w-20 h-px bg-[var(--pl-gold)] mx-auto mb-6"
        />

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.52 }}
          className="mx-auto mb-8 text-[var(--pl-muted)] font-body"
          style={{ fontSize: 'clamp(1.05rem, 1.8vw, 1.2rem)', maxWidth: 480, lineHeight: 1.9 }}
        >
          Upload your photos, share your vibe, and watch The Loom weave a
          celebration site that's unmistakably, irreplaceably yours.
        </motion.p>

        {/* CTAs — larger, bolder */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              variant="accent"
              size="lg"
              onClick={handleSignIn}
              disabled={status === 'loading'}
              loading={status === 'loading'}
              className="text-[1rem] px-8 py-3.5 shadow-[0_4px_24px_rgba(163,177,138,0.35)]"
            >
              Create Your Free Site
              <ArrowRight size={16} strokeWidth={2.2} />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => window.open('/demo', '_blank')}
              className="group text-[1rem] px-6 py-3.5"
            >
              <Play size={14} strokeWidth={2.2} className="opacity-70" />
              View Example
              <ArrowRight
                size={14}
                strokeWidth={2}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </Button>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="text-[0.82rem] text-[var(--pl-muted)] mt-1"
          >
            Takes less than 2 minutes
          </motion.p>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="flex items-center justify-center gap-3 flex-wrap mt-4 mb-2"
        >
          {TRUST_ITEMS.map((item) => (
            <Badge key={item} variant="success">
              {item}
            </Badge>
          ))}
        </motion.div>

        {/* Product preview — 1.5x larger with parallax tilt */}
        <motion.div
          ref={mockupRef}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.95, ease: EASE }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative z-10 mt-4"
          style={{
            perspective: 1200,
          }}
        >
          <motion.div
            style={{
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
            }}
          >
            <div style={{ transform: 'scale(1.08)' }}>
              <SiteMockup />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
        className="absolute bottom-6 flex flex-col items-center gap-1 text-[0.62rem] font-bold tracking-[0.18em] uppercase text-[var(--pl-gold)]"
      >
        Scroll
        <motion.div
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
