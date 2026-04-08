'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/template.tsx
// Global page transition — re-mounts on every navigation.
// Uses Framer Motion for smooth entrance (opacity + y).
// No exit animation (App Router unmounts instantly).
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ width: '100%', minHeight: '100%' }}
    >
      {children}
    </motion.div>
  );
}
