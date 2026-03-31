'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ProgressSteps } from '@/components/ui';
import { colors, text, card, layout } from '@/lib/design-tokens';
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
    <main className="min-h-dvh pt-24 pb-20 relative" style={{ background: colors.cream }}>
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto', padding: `0 ${layout.padding}`, position: 'relative' }}>
        {/* Step progress bar */}
        {showProgress && (
          <div
            className="max-w-[800px] mx-auto mb-16 px-8 py-5"
            style={{
              background: '#FFFFFF',
              borderRadius: card.radius,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              border: `1px solid ${colors.divider}`,
            }}
          >
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
          <div className="mb-14 text-center">
            <h2
              className="font-semibold tracking-tight mb-4"
              style={{
                fontSize: text['2xl'],
                fontFamily: 'var(--eg-font-heading)',
                letterSpacing: '-0.02em',
                color: colors.ink,
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className="max-w-[520px] mx-auto leading-relaxed"
                style={{ color: colors.muted, fontSize: text.md }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Step content with transitions */}
        <div className="min-h-[360px] relative pt-4">
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
