'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/PageTransition.tsx
// Framer-motion animated page transitions.
// Transition style is derived from vibeSkin.tone:
//   dreamy/romantic  → silk curtain (fade + y + blur)
//   playful          → bounce (scale + fade)
//   luxurious        → fade + slight scale
//   default          → gentle fade + subtle y lift
// ─────────────────────────────────────────────────────────────

import { AnimatePresence, motion } from 'framer-motion';
import type { VibeSkin } from '@/lib/vibe-engine';

interface PageTransitionProps {
  children: React.ReactNode;
  /** Used to key the transition (e.g. pathname). Changes trigger the exit/enter animation. */
  transitionKey?: string;
  vibeSkin?: VibeSkin;
}

type Variants = Parameters<typeof motion.div>[0]['variants'];

function buildVariants(tone?: VibeSkin['tone']): Variants {
  switch (tone) {
    case 'dreamy':
    case 'intimate':
      // Silk curtain — fade, y drift, and blur
      return {
        initial: {
          opacity: 0,
          y: 20,
          filter: 'blur(8px)',
        },
        animate: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
        },
        exit: {
          opacity: 0,
          y: -10,
          filter: 'blur(4px)',
          transition: { duration: 0.25, ease: 'easeIn' },
        },
      };

    case 'playful':
      // Bounce — scale pop + fade
      return {
        initial: { opacity: 0, scale: 0.96 },
        animate: {
          opacity: 1,
          scale: 1,
          transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
        },
        exit: {
          opacity: 0,
          scale: 0.97,
          transition: { duration: 0.2, ease: 'easeIn' },
        },
      };

    case 'luxurious':
    case 'cosmic':
      // Prestige fade + subtle scale
      return {
        initial: { opacity: 0, scale: 0.98 },
        animate: {
          opacity: 1,
          scale: 1,
          transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        },
        exit: {
          opacity: 0,
          scale: 0.99,
          transition: { duration: 0.22, ease: 'easeIn' },
        },
      };

    default:
      // Gentle fade + y lift (wild, rustic, or undefined)
      return {
        initial: { opacity: 0, y: 12 },
        animate: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
        },
        exit: {
          opacity: 0,
          y: -8,
          transition: { duration: 0.2 },
        },
      };
  }
}

export function PageTransition({ children, transitionKey, vibeSkin }: PageTransitionProps) {
  const variants = buildVariants(vibeSkin?.tone);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey ?? 'page'}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
