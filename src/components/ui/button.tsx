'use client';

import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer font-[family-name:var(--eg-font-body)] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--eg-fg)] text-white hover:bg-[var(--eg-dark-2)] shadow-[var(--eg-shadow-sm)] hover:shadow-[var(--eg-shadow-md)] hover:-translate-y-px',
        accent:
          'bg-[var(--eg-accent)] text-white hover:bg-[var(--eg-accent-hover)] shadow-[var(--eg-shadow-sm)] hover:shadow-[var(--eg-shadow-md)]',
        secondary:
          'bg-transparent border border-[var(--eg-divider)] text-[var(--eg-fg)] hover:border-[var(--eg-accent)] hover:bg-[rgba(163,177,138,0.04)]',
        ghost:
          'bg-transparent text-[var(--eg-muted)] hover:text-[var(--eg-fg)] hover:bg-[rgba(0,0,0,0.03)]',
        danger:
          'bg-red-500 text-white hover:bg-red-600 shadow-[var(--eg-shadow-sm)]',
      },
      size: {
        sm: 'text-[0.78rem] px-3 py-1.5 gap-1.5 rounded-[var(--eg-radius-sm)]',
        md: 'text-[0.95rem] px-5 py-2.5 gap-2 rounded-[var(--eg-radius-sm)]',
        lg: 'text-[1rem] px-7 py-3 gap-2.5 rounded-[var(--eg-radius)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: React.ReactNode;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, loading, icon, asChild = false, className, children, disabled, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={ref}
        whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className={cn(buttonVariants({ variant, size, className }))}
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

export { Button, buttonVariants };
