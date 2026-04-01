'use client';

import { forwardRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

// ── Radix Dialog primitives ────────────────────────────────────

const Dialog         = DialogPrimitive.Root;
const DialogTrigger  = DialogPrimitive.Trigger;
const DialogPortal   = DialogPrimitive.Portal;
const DialogClose    = DialogPrimitive.Close;

const DialogOverlay = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[200]',
      'bg-[rgba(250,247,242,0.88)] backdrop-blur-md',
      'data-[state=open]:animate-in   data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-[200] w-full',
        '-translate-x-1/2 -translate-y-1/2',
        'bg-white rounded-[var(--pl-radius-lg)] p-8',
        'border border-[var(--pl-divider)]',
        'shadow-[0_24px_60px_rgba(43,30,20,0.15),0_40px_80px_rgba(43,30,20,0.09)]',
        'data-[state=open]:animate-in   data-[state=open]:fade-in-0   data-[state=open]:zoom-in-95   data-[state=open]:slide-in-from-left-1/2   data-[state=open]:slide-in-from-top-[48%]',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
        'duration-200',
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-start justify-between mb-5 gap-4', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogTitle = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'font-[family-name:var(--pl-font-heading)] text-2xl font-normal tracking-tight text-[var(--pl-ink-soft)]',
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-[0.85rem] text-[var(--pl-muted)] leading-relaxed', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

// ── Pearloom Modal wrapper ─────────────────────────────────────

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidth?: string;
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
}

export function Modal({
  open,
  onClose,
  children,
  title,
  maxWidth = 'max-w-md',
  showClose = true,
  closeOnBackdrop = true,
  className,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className={cn(maxWidth, className)}
        onPointerDownOutside={closeOnBackdrop ? undefined : (e) => e.preventDefault()}
      >
        <DialogDescription className="sr-only">
          {title || 'Dialog'}
        </DialogDescription>

        {(title || showClose) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {showClose && (
              <DialogClose asChild>
                <button
                  className={cn(
                    'flex items-center justify-center w-8 h-8 ml-auto flex-shrink-0',
                    'rounded-full cursor-pointer',
                    'text-[var(--pl-muted)] hover:text-[var(--pl-ink)]',
                    'bg-transparent hover:bg-[rgba(0,0,0,0.05)]',
                    'border-0 transition-all duration-150',
                  )}
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </DialogClose>
            )}
          </DialogHeader>
        )}

        {children}
      </DialogContent>
    </Dialog>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
};
