'use client';

import { forwardRef, useState } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  helper?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, prefix, suffix, className, id, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[var(--eg-muted)]"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            'flex items-center rounded-[var(--eg-radius-sm)] border-[1.5px] bg-white transition-all duration-200',
            focused
              ? 'border-[var(--eg-accent)] shadow-[0_0_0_3px_rgba(163,177,138,0.12)]'
              : error
                ? 'border-[#ef4444]'
                : 'border-[rgba(0,0,0,0.08)]',
          )}
        >
          {prefix && (
            <div className="pl-3 pr-1 text-[var(--eg-muted)] flex-shrink-0 flex items-center">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex-1 bg-transparent outline-none',
              'text-[max(16px,1rem)] text-[var(--eg-fg)] font-[family-name:var(--eg-font-body)]',
              'placeholder:text-[var(--eg-muted)] placeholder:opacity-60',
              prefix ? 'py-2.5 pr-3' : 'px-3 py-2.5',
              suffix ? 'pr-0' : '',
              className,
            )}
            onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
            {...props}
          />
          {suffix && (
            <div className="pr-3 pl-1 text-[var(--eg-muted)] flex-shrink-0 flex items-center text-[0.95rem] font-medium">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <span className="text-[0.78rem] text-[#ef4444]">{error}</span>
        )}
        {helper && !error && (
          <span className="text-[0.78rem] text-[var(--eg-muted)]">{helper}</span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
