'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

const cardVariants = {
  elevated:
    'bg-[var(--eg-card-bg)] border border-[rgba(0,0,0,0.05)] shadow-[var(--eg-shadow-sm)] hover:shadow-[var(--eg-shadow-md)] hover:-translate-y-0.5',
  outlined:
    'bg-white border-[1.5px] border-[rgba(0,0,0,0.08)] hover:border-[var(--eg-accent)]',
  flat:
    'bg-[rgba(245,241,232,0.5)]',
  glass:
    'bg-[var(--eg-glass)] backdrop-blur-[20px] backdrop-saturate-150 border border-[var(--eg-glass-border)]',
} as const;

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  variant?: keyof typeof cardVariants;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', interactive = false, padding = 'md', className, children, ...props }, ref) => {
    const Comp = interactive ? motion.div : 'div';

    return (
      <Comp
        ref={ref}
        {...(interactive
          ? {
              whileHover: { scale: 1.01 },
              whileTap: { scale: 0.99 },
              transition: { type: 'spring', stiffness: 400, damping: 25 },
            }
          : {})}
        className={cn(
          'rounded-[var(--eg-radius)] transition-all duration-300',
          cardVariants[variant],
          paddings[padding],
          interactive && 'cursor-pointer',
          className,
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);

Card.displayName = 'Card';
