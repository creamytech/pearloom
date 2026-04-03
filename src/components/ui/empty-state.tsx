'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { Button } from './button';

// ─── Empty State ─────────────────────────────────────────────

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
  className?: string;
}

function EmptyState({ icon, title, description, action, actionLabel, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className,
      )}
    >
      {icon && (
        <div
          className="flex items-center justify-center mb-4 rounded-full"
          style={{
            width: 64,
            height: 64,
            backgroundColor: 'var(--pl-olive-mist)',
          }}
        >
          <span className="text-[var(--pl-olive-deep)] [&_svg]:w-6 [&_svg]:h-6">
            {icon}
          </span>
        </div>
      )}

      <h3 className="text-[1rem] font-semibold text-[var(--pl-ink)] font-body leading-snug">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 text-[0.85rem] text-[var(--pl-muted)] font-body max-w-xs leading-relaxed">
          {description}
        </p>
      )}

      {action && actionLabel && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={action}>
            {actionLabel}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export { EmptyState };
