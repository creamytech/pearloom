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
  /** Map step IDs that should normalize to a canonical step (e.g., 'local-upload' → 'photos') */
  aliases?: Record<string, string>;
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export function ProgressSteps({ steps, currentStepId, aliases, onStepClick, className }: ProgressStepsProps) {
  const resolvedId = aliases?.[currentStepId] ?? currentStepId;
  const currentIndex = steps.findIndex((s) => s.id === resolvedId);

  return (
    <div
      className={cn(
        'flex items-center justify-between bg-white px-6 py-3 rounded-full',
        'shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]',
        className,
      )}
    >
      {steps.map((step, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        const isClickable = isDone && !!onStepClick;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div
              className={cn('flex items-center gap-3', isClickable && 'cursor-pointer')}
              onClick={() => isClickable && onStepClick?.(step.id)}
            >
              {/* Circle */}
              <motion.div
                animate={{
                  scale: isActive ? 1.05 : 1,
                  boxShadow: isActive ? '0 8px 20px rgba(163,177,138,0.35)' : '0 0 0 transparent',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-[0.9rem] font-semibold transition-colors duration-300',
                  isActive && 'bg-[var(--eg-accent)] text-white',
                  isDone && 'bg-[var(--eg-accent-light)] text-[var(--eg-accent)]',
                  !isActive && !isDone && 'bg-[#f5f5f5] text-[var(--eg-muted)]',
                )}
              >
                {isDone ? <Check size={16} strokeWidth={3} /> : i + 1}
              </motion.div>
              {/* Label — hidden on small screens */}
              <span
                className={cn(
                  'hidden md:block text-[0.85rem] font-semibold tracking-[0.02em] transition-all duration-300',
                  isActive && 'text-[var(--eg-fg)] opacity-100',
                  isDone && 'text-[var(--eg-fg)] opacity-80',
                  !isActive && !isDone && 'text-[var(--eg-muted)] opacity-60',
                )}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'hidden sm:block flex-1 h-0.5 mx-3 rounded-full transition-colors duration-300',
                  isDone ? 'bg-[var(--eg-accent-light)]' : 'bg-[#f0f0f0]',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
