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
    'inline-flex items-center justify-center font-semibold leading-none',
    'tracking-[0.02em]',
    'transition-all duration-200 cursor-pointer select-none',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181B] focus-visible:ring-offset-2',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Dark-filled — primary CTA */
        primary: [
          'bg-[#18181B] text-white border border-[#18181B]',
          'hover:bg-[#27272A]',
          'shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        ].join(' '),

        /** Dark-filled — brand CTA (alias) */
        accent: [
          'bg-[#18181B] text-white border border-[#18181B]',
          'hover:bg-[#27272A]',
          'shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        ].join(' '),

        /** Outlined — secondary action */
        secondary: [
          'bg-white text-[#18181B] border border-[#E4E4E7]',
          'hover:border-[#18181B] hover:bg-[#F4F4F5]',
        ].join(' '),

        /** Minimal text — tertiary / inline action */
        ghost: [
          'bg-transparent text-[#71717A] border border-transparent',
          'hover:text-[#18181B] hover:bg-[#F4F4F5]',
        ].join(' '),

        /** Gold-filled — premium / upgrade prompt */
        gold: [
          'bg-[var(--pl-gold)] text-white border border-[var(--pl-gold)]',
          'hover:bg-[#b89a5a]',
          'shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        ].join(' '),

        /** Warning — outline */
        warning: [
          'bg-transparent text-[#DC2626] border border-[#DC2626]',
          'hover:bg-[#FEF2F2]',
        ].join(' '),

        /** Destructive */
        danger: [
          'bg-destructive text-destructive-foreground border border-destructive',
          'hover:opacity-90 shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        ].join(' '),

        /** Dark-surface ghost — for use inside editor / dark panels */
        darkGhost: [
          'bg-transparent text-[var(--pl-dark-text)] border border-[var(--pl-dark-border)]',
          'hover:bg-white/10 hover:text-[var(--pl-dark-heading)]',
        ].join(' '),

        /** Ink-filled — secondary dark CTA */
        ink: [
          'bg-[#18181B] text-white border border-[#18181B]',
          'hover:bg-[#27272A]',
          'shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        ].join(' '),
      },

      size: {
        xs: 'text-[0.68rem] px-2.5 py-1.5 gap-1 rounded-md',
        sm: 'text-[0.75rem] px-3.5 py-2 gap-1.5 rounded-md',
        md: 'text-[0.78rem] px-5 py-2.5 gap-2 rounded-md',
        lg: 'text-[0.82rem] px-7 py-3 gap-2.5 rounded-lg',
        xl: 'text-[0.88rem] px-9 py-4 gap-3 rounded-lg',
        /** Icon-only square */
        icon: 'w-9 h-9 rounded-md',
        iconLg: 'w-11 h-11 rounded-lg',
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
