'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const Tabs = TabsPrimitive.Root;

const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: 'pill' | 'underline' }
>(({ className, variant = 'pill', ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-1',
      variant === 'pill' && 'p-1 rounded-[var(--pl-radius-full)] bg-[rgba(0,0,0,0.04)]',
      variant === 'underline' && 'border-b border-[var(--pl-divider)] gap-0',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

const TabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { variant?: 'pill' | 'underline' }
>(({ className, variant = 'pill', ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap cursor-pointer',
      'text-[0.75rem] font-semibold uppercase tracking-[0.08em]',
      'text-[var(--pl-muted)] hover:text-[var(--pl-ink)]',
      'transition-all duration-200',
      'focus-visible:outline-none',
      variant === 'pill' && [
        'rounded-[var(--pl-radius-full)] px-4 py-2',
        'data-[state=active]:bg-white data-[state=active]:text-[var(--pl-ink)]',
        'data-[state=active]:shadow-[0_1px_2px_rgba(43,30,20,0.06)]',
      ].join(' '),
      variant === 'underline' && [
        'px-4 py-3 border-b-2 border-transparent -mb-px',
        'data-[state=active]:text-[var(--pl-ink)] data-[state=active]:border-[var(--pl-olive)]',
      ].join(' '),
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 focus-visible:outline-none',
      'data-[state=inactive]:hidden',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
