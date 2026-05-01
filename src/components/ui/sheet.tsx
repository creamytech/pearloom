'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/ui/sheet.tsx
//
// Radix Dialog-based Sheet (slide-in panel). Replaces the custom
// CSS keyframe drawer in site-nav.tsx.
//
// Usage:
//   <Sheet open={open} onOpenChange={setOpen}>
//     <SheetContent side="right">...</SheetContent>
//   </Sheet>
// ─────────────────────────────────────────────────────────────

import { forwardRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

// ── Backdrop overlay ──────────────────────────────────────────
export const SheetOverlay = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[9000]',
      'bg-black/30 backdrop-blur-[2px]',
      'data-[state=open]:animate-in  data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

// ── Slide-in panel ────────────────────────────────────────────
const sideClasses = {
  right: cn(
    'right-0 top-0 h-full',
    'data-[state=open]:animate-in  data-[state=open]:slide-in-from-right',
    'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right',
  ),
  left: cn(
    'left-0 top-0 h-full',
    'data-[state=open]:animate-in  data-[state=open]:slide-in-from-left',
    'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left',
  ),
  top: cn(
    'top-0 left-0 w-full',
    'data-[state=open]:animate-in  data-[state=open]:slide-in-from-top',
    'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top',
  ),
  bottom: cn(
    'bottom-0 left-0 w-full',
    'data-[state=open]:animate-in  data-[state=open]:slide-in-from-bottom',
    'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom',
  ),
};

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: keyof typeof sideClasses;
  /** Hide the default ×  close button */
  hideClose?: boolean;
}

export const SheetContent = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, hideClose, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-[9001] flex flex-col',
        'bg-[rgba(245,241,232,0.98)] backdrop-blur-[20px]',
        'border-l border-[rgba(0,0,0,0.05)]',
        'shadow-[-4px_0_32px_rgba(43,30,20,0.06)]',
        'pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]',
        'transition-transform duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        'focus:outline-none',
        sideClasses[side],
        className,
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          className={cn(
            'absolute right-4 top-4',
            'inline-flex h-8 w-8 items-center justify-center',
            'rounded-full border border-[rgba(0,0,0,0.08)]',
            'bg-transparent text-[#71717A]',
            'hover:bg-[rgba(0,0,0,0.05)] hover:text-[#18181B]',
            'transition-colors focus:outline-none',
          )}
          aria-label="Close"
        >
          <X size={14} />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = 'SheetContent';

// ── Convenience wrappers ───────────────────────────────────────
export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1 px-6 pb-4 pt-6', className)}
      {...props}
    />
  );
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'font-heading text-lg font-semibold italic tracking-[-0.02em] text-[var(--pl-ink)]',
        className,
      )}
      {...props}
    />
  );
}

export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-[0.75rem] text-[var(--pl-muted)]', className)}
      {...props}
    />
  );
}
