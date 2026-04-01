'use client';

import { motion, AnimatePresence } from 'framer-motion';
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

interface WizardLayoutProps {
  step: WizardStep;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  onStepClick?: (stepId: string) => void;
}

export function WizardLayout({ step, title, subtitle, children, onStepClick }: WizardLayoutProps) {
  const showProgress = PROGRESS_STEPS.includes(step);

  return (
    <main
      className="min-h-dvh pt-24 pb-20 relative bg-[var(--pl-cream)]"
    >
      <div
        className="relative mx-auto"
        style={{ maxWidth: layout.maxWidth, padding: `0 ${layout.padding}` }}
      >
        {/* Step progress bar */}
        {showProgress && (
          <div className="max-w-[760px] mx-auto mb-14">
            <ProgressSteps
              steps={[...WIZARD_STEPS]}
              currentStepId={step}
              aliases={STEP_ALIASES}
              onStepClick={onStepClick}
            />
          </div>
        )}

        {/* Step header */}
        {title && step !== 'dashboard' && step !== 'generating' && (
          <div className="mb-12 text-center">
            <h2 className="font-[family-name:var(--pl-font-heading)] text-[clamp(1.9rem,4vw,2.8rem)] font-bold tracking-[-0.03em] text-[var(--pl-ink-soft)] mb-3">
              {title}
            </h2>
            {subtitle && (
              <p className="max-w-[500px] mx-auto text-[var(--pl-muted)] text-[1rem] leading-relaxed">
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
              initial={{ opacity: 0, scale: 0.99, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -8 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
