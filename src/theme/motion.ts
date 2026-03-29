// src/theme/motion.ts — animation timing constants
// Use these durations everywhere instead of ad-hoc numbers.

export const FAST   = 0.15;  // micro-interactions, hovers
export const NORMAL = 0.25;  // standard transitions
export const SLOW   = 0.5;   // page-level entrances, emphasis

// Framer Motion variants helpers
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: NORMAL } },
};

export const slideUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: NORMAL } },
};
