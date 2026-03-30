'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ProgressSteps } from '@/components/ui';
import type { WizardStep } from '@/lib/wizard-state';

const WIZARD_STEPS = [
  { id: 'photos', label: 'Select Memories' },
  { id: 'vibe', label: 'Capture Vibe' },
  { id: 'edit', label: 'Editor' },
] as const;

const STEP_ALIASES: Record<string, string> = {
  upload: 'photos',
  clusters: 'photos',
  generating: 'vibe',
  guests: 'edit',
};

/** Steps that should show the progress bar */
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
    <main className="min-h-dvh pt-24 pb-20" style={{ background: '#F5F1E8' }}>
      {/* Gradient overlay */}
      <div
        className="absolute top-0 left-0 right-0 h-[500px] pointer-events-none z-0"
        style={{ background: 'linear-gradient(180deg, rgba(163,177,138,0.08) 0%, rgba(245,241,232,0) 100%)' }}
      />

      <div className="max-w-[1200px] mx-auto px-8 relative z-[1]">
        {/* Step progress bar */}
        {showProgress && (
          <div className="max-w-[800px] mx-auto mb-16">
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
            <h2
              className="text-[2.5rem] font-semibold tracking-tight mb-3 text-[var(--eg-fg)]"
              style={{ fontFamily: 'var(--eg-font-heading)', letterSpacing: '-0.02em' }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-[var(--eg-muted)] text-[1.05rem] max-w-[500px] mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Step content with transitions */}
        <div className="min-h-[600px] relative pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
