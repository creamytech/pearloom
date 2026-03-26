'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/hero.tsx
// Premium full-screen hero with layered animations
// ─────────────────────────────────────────────────────────────

import { motion, type Variants } from 'framer-motion';
import { Heart, ChevronDown } from 'lucide-react';

interface HeroProps {
  names: [string, string];
  anniversaryLabel?: string;
  subtitle?: string;
  date?: string;
}

const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.25, delayChildren: 0.6 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  },
};

export function Hero({ names, anniversaryLabel = 'Two Years', subtitle, date }: HeroProps) {
  return (
    <section className="hero-section">
      {/* Layered ambient orbs */}
      <motion.div
        className="hero-orb hero-orb-1"
        animate={{ x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="hero-orb hero-orb-2"
        animate={{ x: [0, -15, 10, 0], y: [0, 10, -10, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="hero-orb hero-orb-3" />

      <motion.div
        className="hero-content"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Decorative line */}
        <motion.div
          variants={fadeUp}
          className="w-px h-16 bg-gradient-to-b from-transparent via-[var(--eg-accent)] to-transparent opacity-40"
        />

        {/* Icon */}
        <motion.div variants={fadeUp} className="hero-icon">
          <Heart size={28} strokeWidth={1.5} />
        </motion.div>

        {/* Anniversary label */}
        <motion.p variants={fadeUp} className="hero-anniversary">
          {anniversaryLabel}
        </motion.p>

        {/* Names */}
        <motion.h1 variants={fadeUp} className="hero-title">
          {names[0]}{' '}
          <span className="shimmer-text">&</span>{' '}
          {names[1]}
        </motion.h1>

        {/* Subtitle */}
        {subtitle && (
          <motion.p variants={fadeUp} className="hero-subtitle">
            {subtitle}
          </motion.p>
        )}

        {/* Date */}
        {date && (
          <motion.p
            variants={fadeUp}
            className="text-xs tracking-[0.2em] text-[var(--eg-muted)] font-medium mt-2"
          >
            {date}
          </motion.p>
        )}
      </motion.div>

      <motion.div
        className="scroll-indicator"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 1 }}
      >
        <span>Scroll</span>
        <ChevronDown size={16} />
      </motion.div>
    </section>
  );
}
