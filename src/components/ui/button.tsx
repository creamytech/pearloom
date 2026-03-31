'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const variants = {
  primary:
    'bg-[var(--eg-fg)] text-white hover:bg-[#3d3530] shadow-[var(--eg-shadow-sm)] hover:shadow-[var(--eg-shadow-md)] hover:-translate-y-px',
  accent:
    'bg-[var(--eg-accent)] text-white hover:bg-[var(--eg-accent-hover)] shadow-[0_2px_12px_rgba(163,177,138,0.35)] hover:shadow-[0_6px_24px_rgba(163,177,138,0.45)]',
  secondary:
    'bg-transparent border border-[rgba(0,0,0,0.1)] text-[var(--eg-fg)] hover:border-[var(--eg-accent)] hover:bg-[rgba(163,177,138,0.04)]',
  ghost:
    'bg-transparent text-[var(--eg-muted)] hover:text-[var(--eg-fg)] hover:bg-[rgba(0,0,0,0.03)]',
  danger:
    'bg-[#ef4444] text-white hover:bg-[#dc2626] shadow-[0_2px_8px_rgba(239,68,68,0.2)]',
} as const;

const sizes = {
  sm: 'text-[0.78rem] px-3 py-1.5 gap-1.5 rounded-[var(--eg-radius-sm)]',
  md: 'text-[0.95rem] px-5 py-2.5 gap-2 rounded-[var(--eg-radius-sm)]',
  lg: 'text-[1rem] px-7 py-3 gap-2.5 rounded-[var(--eg-radius)]',
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
          'font-[family-name:var(--eg-font-body)]',
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || loading}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {loading ? (
          <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
