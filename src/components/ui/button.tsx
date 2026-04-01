'use client';

import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

// ─────────────────────────────────────────────────────────────
// Pearloom Button — single definitive implementation
// All variants use ONLY Tailwind classes. No inline style overrides.
// ─────────────────────────────────────────────────────────────

const buttonVariants = cva(
  // Base — shared across all variants
  [
    'inline-flex items-center justify-center font-medium leading-none',
    'transition-all duration-200 cursor-pointer select-none',
    'font-[family-name:var(--pl-font-body)]',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pl-olive)] focus-visible:ring-offset-2',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Ink-filled — primary CTA */
        primary: [
          'bg-[var(--pl-ink)] text-white border border-[var(--pl-ink)]',
          'hover:bg-[var(--pl-ink-soft)] hover:-translate-y-px',
          'shadow-[var(--pl-shadow-sm)] hover:shadow-[var(--pl-shadow-md)]',
        ].join(' '),

        /** Olive-filled — brand CTA */
        accent: [
          'bg-[var(--pl-olive)] text-white border border-[var(--pl-olive)]',
          'hover:bg-[var(--pl-olive-hover)] hover:-translate-y-px',
          'shadow-[var(--pl-shadow-sm)] hover:shadow-[var(--pl-shadow-md)]',
        ].join(' '),

        /** Outlined — secondary action */
        secondary: [
          'bg-transparent text-[var(--pl-ink)] border border-[var(--pl-divider)]',
          'hover:border-[var(--pl-olive)] hover:bg-[var(--pl-olive-mist)]',
        ].join(' '),

        /** No background — tertiary / inline action */
        ghost: [
          'bg-transparent text-[var(--pl-muted)] border border-transparent',
          'hover:text-[var(--pl-ink)] hover:bg-[rgba(0,0,0,0.04)]',
        ].join(' '),

        /** Gold-outlined — premium / upgrade prompt */
        gold: [
          'bg-[var(--pl-gold-mist)] text-[var(--pl-gold)] border border-[var(--pl-gold)]',
          'hover:bg-[rgba(196,169,106,0.20)] hover:-translate-y-px',
        ].join(' '),

        /** Destructive */
        danger: [
          'bg-destructive text-destructive-foreground border border-destructive',
          'hover:opacity-90 shadow-[var(--pl-shadow-sm)]',
        ].join(' '),

        /** Dark-surface ghost — for use inside editor / dark panels */
        darkGhost: [
          'bg-transparent text-[var(--pl-dark-text)] border border-[var(--pl-dark-border)]',
          'hover:bg-white/10 hover:text-[var(--pl-dark-heading)]',
        ].join(' '),
      },

      size: {
        xs: 'text-[0.72rem] px-2.5 py-1.5 gap-1 rounded-[var(--pl-radius-xs)]',
        sm: 'text-[0.82rem] px-3.5 py-2 gap-1.5 rounded-[var(--pl-radius-sm)]',
        md: 'text-[0.92rem] px-5 py-2.5 gap-2 rounded-[var(--pl-radius-sm)]',
        lg: 'text-[1rem] px-7 py-3 gap-2.5 rounded-[var(--pl-radius-md)]',
        xl: 'text-[1.05rem] px-9 py-4 gap-3 rounded-[var(--pl-radius-md)]',
        /** Icon-only square */
        icon: 'w-9 h-9 rounded-[var(--pl-radius-sm)]',
        iconLg: 'w-11 h-11 rounded-[var(--pl-radius-md)]',
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
  /** Render as child element (Radix Slot) */
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant, size, loading, icon, asChild = false, className, children, disabled, ...props },
    ref,
  ) => {
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={ref}
        whileHover={!disabled && !loading ? { scale: 1.015 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {loading ? (
          <Loader2
            size={size === 'xs' || size === 'sm' ? 13 : 15}
            className="animate-spin flex-shrink-0"
          />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
