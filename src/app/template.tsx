'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/template.tsx
//
// Next.js App Router "template" — re-instantiated on every
// navigation, unlike layout.tsx which persists. That makes it
// the right place to attach a smooth cross-page transition
// without breaking the root layout's providers.
//
// The transition is intentionally subtle: a 320ms fade + 8px
// rise on cream paper, with motion disabled for users who
// prefer reduced motion. It keys on the current pathname so
// AnimatePresence can play the exit state on the old page and
// the enter state on the new one.
// ─────────────────────────────────────────────────────────────

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export default function RootTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{
          duration: 0.32,
          ease: EASE_OUT,
          opacity: { duration: 0.32 },
          y: { duration: 0.38 },
        }}
        // Scope the transform to this wrapper so fixed-position
        // children (nav, modals, toasts) aren't dragged by the
        // translate3d. min-height keeps the viewport from jumping
        // during the crossfade.
        style={{ minHeight: '100vh', willChange: 'opacity, transform' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
