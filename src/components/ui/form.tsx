'use client';

import { useState, forwardRef } from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
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
      <label className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-[0.78rem] text-destructive">{error}</span>}
      {helper && !error && <span className="text-[0.78rem] text-muted-foreground">{helper}</span>}
    </div>
  );
}

// ── FormSection — Radix Accordion-based collapsible ──────────────

export interface FormSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function FormSection({ title, icon, children, defaultOpen = true, className }: FormSectionProps) {
  return (
    <AccordionPrimitive.Root
      type="single"
      collapsible
      defaultValue={defaultOpen ? 'section' : undefined}
      className={cn(
        'bg-white rounded-t-[14px] rounded-b-[32px] border border-[rgba(0,0,0,0.06)]',
        'shadow-[0_2px_16px_rgba(0,0,0,0.05),0_8px_24px_rgba(163,177,138,0.08)]',
        'overflow-hidden',
        className,
      )}
    >
      <AccordionPrimitive.Item value="section">
        <AccordionPrimitive.Trigger
          className={cn(
            'w-full flex items-center justify-between px-6 py-4',
            'bg-transparent border-none cursor-pointer text-left',
            'group',
          )}
        >
          <span className="flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-primary">
            {icon}
            {title}
          </span>
          <ChevronDown
            size={16}
            className="text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </AccordionPrimitive.Trigger>
        <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="px-6 pb-6 flex flex-col gap-4">
            {children}
          </div>
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  );
}

// ── Select — Radix Select ────────────────────────────────────────

export interface SelectProps {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ label, error, options, placeholder, value, defaultValue, onChange, disabled, name, className }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </label>
        )}
        <SelectPrimitive.Root
          value={value}
          defaultValue={defaultValue}
          onValueChange={onChange}
          disabled={disabled}
          name={name}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            className={cn(
              'flex items-center justify-between w-full rounded-[var(--eg-radius-sm)] border-[1.5px] bg-white px-3 py-2.5',
              'text-[max(16px,1rem)] text-foreground font-[family-name:var(--eg-font-body)]',
              'outline-none cursor-pointer transition-all duration-200',
              'focus:border-ring focus:shadow-[0_0_0_3px_rgba(163,177,138,0.12)]',
              'data-[placeholder]:text-muted-foreground data-[placeholder]:opacity-60',
              error ? 'border-destructive' : 'border-input',
              className,
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon>
              <ChevronDown size={16} className="text-muted-foreground" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className={cn(
                'relative z-50 min-w-[8rem] overflow-hidden',
                'bg-white rounded-xl border border-[rgba(0,0,0,0.08)]',
                'shadow-[var(--eg-shadow-md)]',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
              )}
              position="popper"
              sideOffset={4}
            >
              <SelectPrimitive.Viewport className="p-1">
                {options.map((opt) => (
                  <SelectPrimitive.Item
                    key={opt.value}
                    value={opt.value}
                    className={cn(
                      'relative flex items-center px-3 py-2 pr-8 rounded-lg text-[0.88rem] font-medium cursor-pointer',
                      'text-foreground outline-none transition-colors',
                      'focus:bg-[rgba(163,177,138,0.12)] focus:text-primary',
                      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                    )}
                  >
                    <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="absolute right-2">
                      <Check size={14} />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
        {error && <span className="text-[0.78rem] text-destructive">{error}</span>}
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
          <label className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type="date"
          className={cn(
            'w-full rounded-[var(--eg-radius-sm)] border-[1.5px] bg-white px-3 py-2.5',
            'text-[max(16px,1rem)] text-foreground font-[family-name:var(--eg-font-body)]',
            'outline-none cursor-pointer transition-all duration-200',
            'focus:border-ring focus:shadow-[0_0_0_3px_rgba(163,177,138,0.12)]',
            error ? 'border-destructive' : 'border-input',
            className,
          )}
          {...props}
        />
        {error && <span className="text-[0.78rem] text-destructive">{error}</span>}
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
          <label className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type="time"
          className={cn(
            'w-full rounded-[var(--eg-radius-sm)] border-[1.5px] bg-white px-3 py-2.5',
            'text-[max(16px,1rem)] text-foreground font-[family-name:var(--eg-font-body)]',
            'outline-none cursor-pointer transition-all duration-200',
            'focus:border-ring focus:shadow-[0_0_0_3px_rgba(163,177,138,0.12)]',
            error ? 'border-destructive' : 'border-input',
            className,
          )}
          {...props}
        />
        {error && <span className="text-[0.78rem] text-destructive">{error}</span>}
      </div>
    );
  },
);

TimeInput.displayName = 'TimeInput';
