'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GenerationProgress } from '@/components/dashboard/generation-progress';
import type { GooglePhotoMetadata } from '@/types';

interface GeneratingStepProps {
  step: number;
  photos: GooglePhotoMetadata[];
  names: [string, string];
  vibeString: string;
  occasion: string;
  onCancel: () => void;
}

export function GeneratingStep({ step, photos, names, vibeString, occasion, onCancel }: GeneratingStepProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        <GenerationProgress
          step={step}
          photos={photos}
          names={names}
          vibeString={vibeString}
          occasion={occasion}
          onCancel={onCancel}
        />
      </motion.div>
    </AnimatePresence>
  );
}
