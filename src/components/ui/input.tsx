'use client';

import { forwardRef, useState } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/cn';

/* ── shadcn Label primitive ── */

const Label = forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[var(--eg-muted)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className,
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

/* ── Input (shadcn-style with Pearloom wrapper) ── */

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
            'flex items-center rounded-[var(--eg-radius-sm)] border-[1.5px] bg-white transition-all duration-200',
            focused
              ? 'border-ring shadow-[0_0_0_3px_rgba(163,177,138,0.12)]'
              : error
                ? 'border-destructive'
                : 'border-input',
          )}
        >
          {prefix && (
            <div className="pl-3 pr-1 text-muted-foreground flex-shrink-0 flex items-center">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex-1 bg-transparent outline-none',
              'text-[max(16px,1rem)] text-foreground font-[family-name:var(--eg-font-body)]',
              'placeholder:text-muted-foreground placeholder:opacity-60',
              prefix ? 'py-2.5 pr-3' : 'px-3 py-2.5',
              suffix ? 'pr-0' : '',
              className,
            )}
            onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
            {...props}
          />
          {suffix && (
            <div className="pr-3 pl-1 text-muted-foreground flex-shrink-0 flex items-center text-[0.95rem] font-medium">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <span className="text-[0.78rem] text-destructive">{error}</span>
        )}
        {helper && !error && (
          <span className="text-[0.78rem] text-muted-foreground">{helper}</span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input, Label };
