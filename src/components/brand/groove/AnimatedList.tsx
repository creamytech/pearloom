'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/AnimatedList.tsx
//
// Stacked items that animate in one at a time. Adapted from
// Magic UI's AnimatedList pattern — use for dashboard success
// moments ("New RSVP from Jane · 3s ago"), notification feeds,
// stream of activity.
//
// Each child mounts with a gentle blur+rise, settles on a
// subtle spring. Items can be added live; exits use the same
// spring in reverse.
// ─────────────────────────────────────────────────────────────

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimatedListProps {
  /** Ordered list items (newest first). Each must have a stable key. */
  items: Array<{ id: string; node: ReactNode }>;
  /** Max items to render. Older items fade out. Default 6. */
  max?: number;
  /** Per-item vertical gap (px). Default 10. */
  gap?: number;
  /** Entrance stagger delay (seconds). Default 0.05. */
  stagger?: number;
}

export function AnimatedList({ items, max = 6, gap = 10, stagger = 0.05 }: AnimatedListProps) {
  const visible = items.slice(0, max);
  return (
    <ol
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap,
      }}
    >
      <AnimatePresence initial={false}>
        {visible.map((item, i) => (
          <motion.li
            key={item.id}
            layout
            initial={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
            animate={{
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              transition: {
                delay: i * stagger,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              },
            }}
            exit={{
              opacity: 0,
              y: 12,
              filter: 'blur(6px)',
              transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
            }}
          >
            {item.node}
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}
