'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ProgressSteps } from '@/components/ui';
import { colors, shadow, opacity } from '@/lib/design-tokens';
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
    <main className="min-h-dvh pt-24 pb-20 relative overflow-hidden" style={{ background: colors.cream }}>
      {/* Radial gradient accent — warm olive glow top-center */}
      <div
        className="absolute top-0 left-0 right-0 h-[600px] pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -5%, ${colors.olive}${opacity.light} 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 80% 10%, ${colors.gold}${opacity.subtle} 0%, transparent 60%),
            linear-gradient(180deg, ${colors.olive}${opacity.subtle} 0%, transparent 100%)
          `,
        }}
      />
      {/* Subtle dot pattern overlay for texture */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(${colors.olive}${opacity.subtle} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="max-w-[1200px] mx-auto px-8 relative z-[1]">
        {/* Step progress bar */}
        {showProgress && (
          <div
            className="max-w-[800px] mx-auto mb-16 px-6 py-4 rounded-2xl"
            style={{
              background: `rgba(255,255,255,0.55)`,
              backdropFilter: 'blur(12px)',
              boxShadow: `${shadow.sm}, inset 0 1px 0 rgba(255,255,255,0.6)`,
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
              className="text-[2.5rem] font-semibold tracking-tight mb-4 text-[var(--eg-fg)]"
              style={{
                fontFamily: 'var(--eg-font-heading)',
                letterSpacing: '-0.02em',
                textShadow: `0 1px 2px rgba(0,0,0,0.04)`,
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className="text-[var(--eg-muted)] text-[1.08rem] max-w-[520px] mx-auto leading-relaxed"
                style={{ color: colors.muted }}
              >
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
