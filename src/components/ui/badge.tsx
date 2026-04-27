'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[var(--pl-radius-full)] text-[0.62rem] font-bold uppercase tracking-[0.08em] leading-none border transition-colors',
  {
    variants: {
      variant: {
        /** Olive — default brand badge */
        default:
          'bg-[var(--pl-olive-mist)] text-[var(--pl-olive-deep)] border-transparent',

        /** Subtle green — success / live / published */
        success:
          'bg-[var(--pl-success-mist)] text-[var(--pl-success)] border-[rgba(90,122,74,0.25)]',

        /** Outlined olive — curated status */
        curated:
          'bg-transparent text-[var(--pl-olive-deep)] border-[var(--pl-olive)]',

        /** Antique gold — premium / sparkle */
        gold:
          'bg-[var(--pl-gold-mist)] text-[var(--pl-gold)] border-[rgba(196,169,106,0.3)]',

        /** Plum — emotional / featured */
        plum:
          'bg-[var(--pl-plum-mist)] text-[var(--pl-plum)] border-transparent',

        /** Warning — restored / attention */
        warning:
          'bg-[var(--pl-warning-mist)] text-[var(--pl-warning)] border-[rgba(196,93,62,0.25)]',

        /** Error */
        error:
          'bg-red-50 text-red-700 border-red-200',

        /** Neutral outlined — draft / certified */
        muted:
          'bg-transparent text-[var(--pl-muted)] border-[var(--pl-divider)]',

        /** Dark-surface */
        dark:
          'bg-white/10 text-white/80 border-white/20',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[0.55rem]',
        md: 'px-2.5 py-1',
        lg: 'px-3.5 py-1.5 text-[0.68rem]',
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
    <span className={cn(badgeVariants({ variant, size }), 'animate-pop-in', className)} {...props} />
  );
}

export { Badge, badgeVariants };
