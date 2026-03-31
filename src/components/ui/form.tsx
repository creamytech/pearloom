'use client';

import { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

// ── FormField — Label + input + error + helper wrapper ──────────

export interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  helper?: string;
  required?: boolean;
  className?: string;
}

export function FormField({ label, children, error, helper, required, className }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[var(--eg-muted)]">
        {label}
        {required && <span className="text-[var(--eg-accent)] ml-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-[0.78rem] text-[#ef4444]">{error}</span>}
      {helper && !error && <span className="text-[0.78rem] text-[var(--eg-muted)]">{helper}</span>}
    </div>
  );
}

// ── FormSection — Collapsible accordion ──────────────────────────

export interface FormSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function FormSection({ title, icon, children, defaultOpen = true, className }: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        'bg-white rounded-t-[14px] rounded-b-[32px] border border-[rgba(0,0,0,0.06)]',
        'shadow-[0_2px_16px_rgba(0,0,0,0.05),0_8px_24px_rgba(163,177,138,0.08)]',
        'overflow-hidden',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center justify-between px-6 py-4',
          'bg-transparent border-none cursor-pointer text-left',
        )}
      >
        <span className="flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[var(--eg-accent)]">
          {icon}
          {title}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className="text-[var(--eg-muted)]" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 flex flex-col gap-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Select — Styled native select ────────────────────────────────

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[var(--eg-muted)]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full appearance-none rounded-[var(--eg-radius-sm)] border-[1.5px] bg-white px-3 py-2.5 pr-10',
              'text-[max(16px,1rem)] text-[var(--eg-fg)] font-[family-name:var(--eg-font-body)]',
              'outline-none cursor-pointer transition-all duration-200',
              'focus:border-[var(--eg-accent)] focus:shadow-[0_0_0_3px_rgba(163,177,138,0.12)]',
              error ? 'border-[#ef4444]' : 'border-[rgba(0,0,0,0.08)]',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--eg-muted)] pointer-events-none"
          />
        </div>
        {error && <span className="text-[0.78rem] text-[#ef4444]">{error}</span>}
      </div>
    );
  },
);

Select.displayName = 'Select';

// ── DateInput — Styled date input ────────────────────────────────

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[var(--eg-muted)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type="date"
          className={cn(
            'w-full rounded-[var(--eg-radius-sm)] border-[1.5px] bg-white px-3 py-2.5',
            'text-[max(16px,1rem)] text-[var(--eg-fg)] font-[family-name:var(--eg-font-body)]',
            'outline-none cursor-pointer transition-all duration-200',
            'focus:border-[var(--eg-accent)] focus:shadow-[0_0_0_3px_rgba(163,177,138,0.12)]',
            error ? 'border-[#ef4444]' : 'border-[rgba(0,0,0,0.08)]',
            className,
          )}
          {...props}
        />
        {error && <span className="text-[0.78rem] text-[#ef4444]">{error}</span>}
      </div>
    );
  },
);

DateInput.displayName = 'DateInput';

// ── TimeInput — Styled time input ────────────────────────────────

export interface TimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[var(--eg-muted)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type="time"
          className={cn(
            'w-full rounded-[var(--eg-radius-sm)] border-[1.5px] bg-white px-3 py-2.5',
            'text-[max(16px,1rem)] text-[var(--eg-fg)] font-[family-name:var(--eg-font-body)]',
            'outline-none cursor-pointer transition-all duration-200',
            'focus:border-[var(--eg-accent)] focus:shadow-[0_0_0_3px_rgba(163,177,138,0.12)]',
            error ? 'border-[#ef4444]' : 'border-[rgba(0,0,0,0.08)]',
            className,
          )}
          {...props}
        />
        {error && <span className="text-[0.78rem] text-[#ef4444]">{error}</span>}
      </div>
    );
  },
);

TimeInput.displayName = 'TimeInput';
