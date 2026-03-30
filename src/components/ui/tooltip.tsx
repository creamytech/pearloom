'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  /** Position relative to trigger */
  side?: 'top' | 'bottom';
  className?: string;
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), 200);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.span
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: side === 'top' ? 4 : -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none',
              'bg-[var(--eg-fg)] text-white text-[0.75rem] font-medium',
              'px-2.5 py-1.5 rounded-lg whitespace-nowrap',
              'shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
              side === 'top' && 'bottom-[calc(100%+6px)]',
              side === 'bottom' && 'top-[calc(100%+6px)]',
            )}
            role="tooltip"
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
