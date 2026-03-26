'use client';

// ─────────────────────────────────────────────────────────────
// everglow / components/dashboard/generation-progress.tsx
// Animated loading state during AI generation
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const STEPS = [
  'Clustering your photos by time and place...',
  'Discovering your locations...',
  'Crafting your narrative with the memory engine...',
  'Generating a theme that matches your vibe...',
  'Assembling your timeline...',
  'Almost there...',
];

interface GenerationProgressProps {
  step?: number;
}

export function GenerationProgress({ step = 0 }: GenerationProgressProps) {
  const currentStep = Math.min(step, STEPS.length - 1);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-8">
      {/* Animated sparkles icon */}
      <motion.div
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
          scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <Sparkles size={48} className="text-[var(--eg-accent)]" />
      </motion.div>

      {/* Title */}
      <div className="text-center">
        <h3
          className="text-2xl font-semibold mb-2"
          style={{ fontFamily: 'var(--eg-font-heading)' }}
        >
          Generating Your Story...
        </h3>
        <motion.p
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-[var(--eg-muted)]"
        >
          {STEPS[currentStep]}
        </motion.p>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1.5 bg-black/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[var(--eg-accent)] rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
