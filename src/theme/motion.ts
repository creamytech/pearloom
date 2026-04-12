// src/theme/motion.ts — animation timing constants
// Use these durations everywhere instead of ad-hoc numbers.
//
// Design principle: smooth deceleration, never overshoot.
// Every transition should feel intentional and precise — like
// a well-crafted physical object settling into place.

export const FAST   = 0.15;  // micro-interactions, hovers
export const NORMAL = 0.22;  // standard transitions
export const SLOW   = 0.4;   // page-level entrances, emphasis

/** Smooth deceleration — the only easing curve we use. */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** Framer Motion spring — critically damped, no bounce. */
export const SPRING = { type: 'spring' as const, stiffness: 400, damping: 35, mass: 0.8 };

// Framer Motion variants helpers
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: NORMAL, ease: EASE } },
};

export const slideUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: NORMAL, ease: EASE } },
};
