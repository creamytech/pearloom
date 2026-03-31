'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  /** Alignment of the dropdown panel */
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function Dropdown({ trigger, children, align = 'left', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  return (
    <div ref={containerRef} className={cn('relative inline-flex', className)}>
      <div onClick={() => setOpen((o) => !o)} className="cursor-pointer">
        {trigger}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'absolute top-[calc(100%+4px)] z-50',
              'bg-white rounded-xl border border-[rgba(0,0,0,0.08)]',
              'shadow-[var(--eg-shadow-md)] p-1.5 min-w-[160px]',
              align === 'left' && 'left-0',
              align === 'right' && 'right-0',
              align === 'center' && 'left-1/2 -translate-x-1/2',
            )}
            onClick={close}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface DropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

export function DropdownItem({ active, icon, className, children, ...props }: DropdownItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-[0.88rem] font-medium cursor-pointer transition-colors',
        active
          ? 'bg-[rgba(163,177,138,0.12)] text-[var(--eg-accent)]'
          : 'text-[var(--eg-fg)] hover:bg-[rgba(0,0,0,0.03)]',
        className,
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">{icon}</span>}
      {children}
    </div>
  );
}
