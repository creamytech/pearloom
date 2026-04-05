'use client';

import { forwardRef, useState } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/cn';

// ─── Label ────────────────────────────────────────────────────

const Label = forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-[var(--pl-font-label)] font-bold uppercase tracking-[var(--pl-label-tracking)] text-[var(--pl-muted)]',
      'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
      className,
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

// ─── Input ────────────────────────────────────────────────────

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  helper?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, prefix, suffix, className, id, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && <Label htmlFor={inputId}>{label}</Label>}

        <div
          className={cn(
            'flex items-center bg-white rounded-[var(--pl-radius-sm)]',
            'border-[1.5px] transition-all duration-200',
            focused
              ? 'border-[var(--pl-olive)] shadow-[0_0_0_3px_rgba(163,177,138,0.22)]'
              : error
                ? 'border-destructive'
                : 'border-[var(--pl-divider)] hover:border-[var(--pl-olive-hover)]',
          )}
        >
          {prefix && (
            <div className="pl-3 pr-1.5 text-[var(--pl-muted)] flex-shrink-0 flex items-center">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex-1 min-w-0 bg-transparent outline-none',
              'text-[max(16px,0.92rem)] leading-none text-[var(--pl-ink)]',
              'font-body',
              'placeholder:text-[var(--pl-muted)] placeholder:opacity-55 placeholder:italic placeholder:font-heading',
              prefix ? 'py-2.5 pr-3' : 'px-3.5 py-2.5',
              suffix && 'pr-0',
              className,
            )}
            onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
            onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
            {...props}
          />
          {suffix && (
            <div className="pr-3.5 pl-1.5 text-[var(--pl-muted)] flex-shrink-0 flex items-center text-[0.85rem] font-medium">
              {suffix}
            </div>
          )}
        </div>

        {error && (
          <span className="text-[0.72rem] text-destructive font-medium">{error}</span>
        )}
        {helper && !error && (
          <span className="text-[0.72rem] text-[var(--pl-muted)]">{helper}</span>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input, Label };
