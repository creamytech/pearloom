'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

// ─────────────────────────────────────────────────────────────
// Pearloom Card — one cohesive system, four surface variants
// ─────────────────────────────────────────────────────────────

const cardVariants = {
  /** Default white card with soft organic shadow */
  elevated: [
    'bg-white border border-[rgba(0,0,0,0.05)]',
    'shadow-[0_1px_4px_rgba(43,30,20,0.04),0_4px_16px_rgba(43,30,20,0.03)]',
    'hover:shadow-[0_4px_20px_rgba(43,30,20,0.08),0_8px_32px_rgba(43,30,20,0.04)] hover:-translate-y-0.5',
    'transition-all duration-300',
  ].join(' '),

  /** Cream-tinted flat card — section blocks, bento tiles */
  flat: [
    'bg-[var(--pl-cream-deep)] border border-transparent',
    'transition-all duration-300',
  ].join(' '),

  /** Outlined — table rows, list items */
  outlined: [
    'bg-white border-[1.5px] border-[rgba(0,0,0,0.07)]',
    'hover:border-[var(--pl-olive)] transition-all duration-200',
  ].join(' '),

  /** Frosted glass — overlaid on imagery, editor panels */
  glass: [
    'bg-[var(--pl-glass)] border border-[var(--pl-glass-border)]',
    'backdrop-blur-[20px] backdrop-saturate-150',
    'shadow-[0_1px_4px_rgba(43,30,20,0.05),0_2px_12px_rgba(43,30,20,0.04)]',
  ].join(' '),

  /** Dark card — inside editor / loom panels */
  dark: [
    'bg-[var(--pl-dark-card)] border border-[var(--pl-dark-border)]',
  ].join(' '),

  /** Bento — for dashboard feature grids, no border visible */
  bento: [
    'bg-[var(--pl-cream-deep)]/60 border border-transparent',
    'hover:bg-[var(--pl-cream-deep)] transition-all duration-300',
  ].join(' '),
} as const;

const paddingMap = {
  none: '',
  xs:   'p-3',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-7',
  xl:   'p-10',
} as const;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants;
  interactive?: boolean;
  padding?: keyof typeof paddingMap;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', interactive = false, padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[var(--pl-radius-lg)]',
          cardVariants[variant],
          paddingMap[padding],
          interactive && 'cursor-pointer hover:scale-[1.012] hover:-translate-y-0.5 active:scale-[0.99]',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'font-heading text-xl font-semibold leading-tight tracking-tight text-[var(--pl-ink-soft)]',
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-[0.85rem] text-[var(--pl-muted)] leading-relaxed', className)}
      {...props}
    />
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0 gap-3', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
