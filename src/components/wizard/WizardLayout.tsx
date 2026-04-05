'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ProgressSteps } from '@/components/ui';
import { layout } from '@/lib/design-tokens';
import type { WizardStep } from '@/lib/wizard-state';

const WIZARD_STEPS = [
  { id: 'photos',  label: 'Select Memories' },
  { id: 'vibe',    label: 'Capture Vibe'    },
  { id: 'edit',    label: 'Editor'          },
] as const;

const STEP_ALIASES: Record<string, string> = {
  upload:    'photos',
  clusters:  'photos',
  generating: 'vibe',
  guests:    'edit',
};

const PROGRESS_STEPS: WizardStep[] = ['photos', 'upload', 'clusters', 'vibe', 'generating', 'preview' as WizardStep];

// AI status messages per step
const AI_HINTS: Partial<Record<WizardStep, string>> = {
  photos: 'AI will analyze your photos for faces, places & moments',
  upload: 'Upload and we\'ll do the rest',
  clusters: 'We grouped your photos by moment',
  vibe: 'Tell us your style — AI handles the design',
};

interface WizardLayoutProps {
  step: WizardStep;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  onStepClick?: (stepId: string) => void;
}

export function WizardLayout({ step, title, subtitle, children, onStepClick }: WizardLayoutProps) {
  const showProgress = PROGRESS_STEPS.includes(step);
  const aiHint = AI_HINTS[step];

  return (
    <main
      className="min-h-dvh pt-20 pb-16 relative bg-[var(--pl-cream)]"
    >
      <div
        className="relative mx-auto"
        style={{ maxWidth: layout.maxWidth, padding: `0 ${layout.padding}` }}
      >
        {/* Step progress bar */}
        {showProgress && (
          <div className="max-w-[760px] mx-auto mb-8">
            <ProgressSteps
              steps={[...WIZARD_STEPS]}
              currentStepId={step}
              aliases={STEP_ALIASES}
              onStepClick={onStepClick}
            />
          </div>
        )}

        {/* AI active indicator */}
        {aiHint && showProgress && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex items-center justify-center gap-2 mb-6"
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles size={13} className="text-[var(--pl-gold)]" />
            </motion.div>
            <span className="text-[0.78rem] text-[var(--pl-muted)] font-medium">
              {aiHint}
            </span>
          </motion.div>
        )}

        {/* Step header — compact */}
        {title && step !== 'dashboard' && step !== 'generating' && (
          <div className="mb-8 text-center">
            <h2 className="font-heading text-[clamp(1.7rem,3.5vw,2.4rem)] font-semibold italic tracking-[-0.03em] text-[var(--pl-ink-soft)] mb-2">
              {title}
            </h2>
            {subtitle && (
              <p className="max-w-[440px] mx-auto text-[var(--pl-muted)] text-[0.92rem] leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Step content with transitions */}
        <div className="min-h-[340px] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
