'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface StepDefinition {
  id: string;
  label: string;
}

export interface ProgressStepsProps {
  steps: StepDefinition[];
  currentStepId: string;
  aliases?: Record<string, string>;
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export function ProgressSteps({
  steps,
  currentStepId,
  aliases,
  onStepClick,
  className,
}: ProgressStepsProps) {
  const resolvedId = aliases?.[currentStepId] ?? currentStepId;
  const currentIndex = steps.findIndex((s) => s.id === resolvedId);

  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'bg-white rounded-[var(--pl-radius-full)]',
        'px-5 py-2.5',
        'shadow-[var(--pl-shadow-xs)] border border-[var(--pl-divider)]',
        className,
      )}
    >
      {steps.map((step, i) => {
        const isActive   = i === currentIndex;
        const isDone     = i < currentIndex;
        const isClickable = isDone && !!onStepClick;

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step node */}
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick?.(step.id)}
              className={cn(
                'flex items-center gap-2.5',
                isClickable ? 'cursor-pointer' : 'cursor-default',
                'border-0 bg-transparent p-0',
              )}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.08 : 1,
                  boxShadow: isActive
                    ? '0 6px 18px rgba(163,177,138,0.40)'
                    : '0 0 0 transparent',
                }}
                transition={{ type: 'spring', stiffness: 340, damping: 24 }}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                  'text-[0.82rem] font-bold transition-colors duration-300',
                  isActive && 'bg-[var(--pl-olive)] text-white',
                  isDone  && 'bg-[var(--pl-olive-mist)] text-[var(--pl-olive-deep)]',
                  !isActive && !isDone && 'bg-[var(--pl-cream-deep)] text-[var(--pl-muted)]',
                )}
              >
                {isDone ? <Check size={15} strokeWidth={3} /> : i + 1}
              </motion.div>

              <span
                className={cn(
                  'hidden sm:block text-[0.82rem] font-semibold tracking-wide transition-all duration-300',
                  isActive && 'text-[var(--pl-ink)]',
                  isDone  && 'text-[var(--pl-ink)] opacity-70',
                  !isActive && !isDone && 'text-[var(--pl-muted)] opacity-50',
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connector */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'hidden sm:block flex-1 h-px mx-3 rounded-full transition-colors duration-500',
                  isDone
                    ? 'bg-[var(--pl-olive-mist)]'
                    : 'bg-[var(--pl-divider)]',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
