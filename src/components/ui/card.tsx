'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

// ─────────────────────────────────────────────────────────────
// Pearloom Card — one cohesive system, four surface variants
// ─────────────────────────────────────────────────────────────

const cardVariants = {
  /** Default white card with warm shadow */
  elevated: [
    'bg-white border border-[var(--pl-divider)]',
    'shadow-[var(--pl-shadow-sm)] hover:shadow-[var(--pl-shadow-md)] hover:-translate-y-0.5',
    'transition-all duration-300',
  ].join(' '),

  /** Cream-tinted flat card — section blocks */
  flat: [
    'bg-[var(--pl-cream-deep)] border border-[var(--pl-divider)]',
    'transition-all duration-300',
  ].join(' '),

  /** Outlined — table rows, list items */
  outlined: [
    'bg-white border-[1.5px] border-[var(--pl-divider)]',
    'hover:border-[var(--pl-olive)] transition-all duration-200',
  ].join(' '),

  /** Frosted glass — overlaid on imagery or gradients */
  glass: [
    'bg-[var(--pl-glass)] border border-[var(--pl-glass-border)]',
    'backdrop-blur-[20px] backdrop-saturate-150',
    'shadow-[var(--pl-shadow-sm)]',
  ].join(' '),

  /** Dark card — inside editor / loom panels */
  dark: [
    'bg-[var(--pl-dark-card)] border border-[var(--pl-dark-border)]',
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
          'rounded-[var(--pl-radius-md)]',
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
        'font-[family-name:var(--pl-font-heading)] text-xl font-semibold leading-tight tracking-tight text-[var(--pl-ink-soft)]',
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
