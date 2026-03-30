'use client';

import { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
  maxChars?: number;
  autoGrow?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helper, maxChars, autoGrow = true, className, id, value, onChange, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const charCount = typeof value === 'string' ? value.length : 0;

    const setRefs = useCallback((node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    }, [ref]);

    useEffect(() => {
      if (autoGrow && innerRef.current) {
        innerRef.current.style.height = 'auto';
        innerRef.current.style.height = `${innerRef.current.scrollHeight}px`;
      }
    }, [value, autoGrow]);

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
        <textarea
          ref={setRefs}
          id={inputId}
          value={value}
          onChange={(e) => {
            if (maxChars && e.target.value.length > maxChars) return;
            onChange?.(e);
          }}
          className={cn(
            'w-full rounded-[var(--eg-radius-sm)] border-[1.5px] bg-white px-3 py-2.5 outline-none resize-none',
            'text-[max(16px,1rem)] text-[var(--eg-fg)] font-[family-name:var(--eg-font-body)]',
            'placeholder:text-[var(--eg-muted)] placeholder:opacity-60',
            'transition-all duration-200',
            focused
              ? 'border-[var(--eg-accent)] shadow-[0_0_0_3px_rgba(163,177,138,0.12)]'
              : error
                ? 'border-[#ef4444]'
                : 'border-[rgba(0,0,0,0.08)]',
            className,
          )}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          {...props}
        />
        <div className="flex items-center justify-between">
          {error ? (
            <span className="text-[0.8rem] text-[#ef4444]">{error}</span>
          ) : helper ? (
            <span className="text-[0.78rem] text-[var(--eg-muted)]">{helper}</span>
          ) : (
            <span />
          )}
          {maxChars && (
            <span className="text-[0.72rem] text-[var(--eg-muted)]">
              {maxChars - charCount} remaining
            </span>
          )}
        </div>
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
