'use client';

import { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** Max width class — defaults to max-w-md */
  maxWidth?: string;
  /** Whether to show the close X button */
  showClose?: boolean;
  /** Whether clicking backdrop closes the modal */
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
  const contentRef = useRef<HTMLDivElement>(null);

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, handleKeyDown]);

  // Focus trap — focus the content on open
  useEffect(() => {
    if (open) contentRef.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(250, 249, 246, 0.92)', backdropFilter: 'blur(12px)' }}
          onClick={closeOnBackdrop ? onClose : undefined}
        >
          <motion.div
            ref={contentRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={cn(
              'relative w-full rounded-[1.5rem] bg-white p-8',
              'shadow-[0_24px_80px_rgba(43,43,43,0.14)] border border-[var(--eg-divider)]',
              'outline-none',
              maxWidth,
              className,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-start justify-between mb-5">
                {title && (
                  <h2 className="font-[family-name:var(--eg-font-heading)] text-[2rem] font-normal tracking-tight text-[var(--eg-fg)]">
                    {title}
                  </h2>
                )}
                {showClose && (
                  <button
                    onClick={onClose}
                    className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--eg-muted)] hover:text-[var(--eg-fg)] hover:bg-[rgba(0,0,0,0.04)] transition-all cursor-pointer ml-auto"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
