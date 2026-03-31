'use client';

import { cn } from '@/lib/cn';

const badgeVariants = {
  default:
    'bg-[var(--eg-accent-light)] text-[var(--eg-accent)]',
  success:
    'bg-[rgba(163,177,138,0.15)] text-[var(--eg-accent-dark)]',
  warning:
    'bg-[#FFFBF0] text-[#92710E] border-[#D4A847]',
  error:
    'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]',
  muted:
    'bg-[rgba(0,0,0,0.04)] text-[var(--eg-muted)]',
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants;
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full',
        'text-[0.65rem] font-semibold tracking-[0.04em] leading-snug',
        'border border-transparent',
        badgeVariants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
