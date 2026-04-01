'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-[var(--pl-radius-full)] text-[0.65rem] font-semibold tracking-[0.05em] leading-none border transition-colors',
  {
    variants: {
      variant: {
        /** Olive — default brand badge */
        default:
          'bg-[var(--pl-olive-mist)] text-[var(--pl-olive-deep)] border-transparent',

        /** Subtle green — success / live */
        success:
          'bg-[rgba(163,177,138,0.15)] text-[var(--pl-olive-deep)] border-transparent',

        /** Antique gold — premium / upgrade */
        gold:
          'bg-[var(--pl-gold-mist)] text-[var(--pl-gold)] border-[rgba(196,169,106,0.3)]',

        /** Plum — emotional / featured */
        plum:
          'bg-[var(--pl-plum-mist)] text-[var(--pl-plum)] border-transparent',

        /** Error */
        error:
          'bg-red-50 text-red-700 border-red-200',

        /** Neutral */
        muted:
          'bg-[rgba(0,0,0,0.05)] text-[var(--pl-muted)] border-transparent',

        /** Dark-surface */
        dark:
          'bg-white/10 text-white/80 border-white/20',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[0.58rem]',
        md: 'px-2.5 py-1',
        lg: 'px-3 py-1.5 text-[0.72rem]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ variant, size, className, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
