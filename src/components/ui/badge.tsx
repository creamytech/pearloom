'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.65rem] font-semibold tracking-[0.04em] leading-snug border border-transparent transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--eg-accent-light)] text-[var(--eg-accent)]',
        success:
          'bg-[rgba(163,177,138,0.15)] text-[var(--eg-accent-dark)]',
        warning:
          'bg-[rgba(214,198,168,0.15)] text-[var(--eg-gold)] border-[var(--eg-gold)]',
        error:
          'bg-red-50 text-red-700 border-red-200',
        muted:
          'bg-[rgba(0,0,0,0.04)] text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ variant, className, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
