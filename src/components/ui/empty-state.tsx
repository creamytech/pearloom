'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './button';

// ─── Empty State ─────────────────────────────────────────────

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
  aiAction?: () => void;
  aiActionLabel?: string;
  className?: string;
}

function EmptyState({ icon, title, description, action, actionLabel, aiAction, aiActionLabel, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col items-center justify-center text-center py-10 px-6',
        className,
      )}
    >
      {icon && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
          className="flex items-center justify-center mb-4 rounded-2xl"
          style={{
            width: 56,
            height: 56,
            backgroundColor: 'var(--pl-olive-mist)',
            border: '1px solid rgba(163,177,138,0.15)',
          }}
        >
          <span className="text-[var(--pl-olive-deep)] [&_svg]:w-6 [&_svg]:h-6">
            {icon}
          </span>
        </motion.div>
      )}

      <h3 className="text-[0.95rem] font-semibold text-[var(--pl-ink)] font-body leading-snug">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 text-[0.82rem] text-[var(--pl-muted)] font-body max-w-[260px] leading-relaxed">
          {description}
        </p>
      )}

      <div className="flex flex-col gap-2 mt-5 w-full max-w-[220px]">
        {aiAction && aiActionLabel && (
          <Button
            variant="accent"
            size="sm"
            onClick={aiAction}
            className="w-full justify-center"
            icon={<Sparkles size={13} />}
          >
            {aiActionLabel}
          </Button>
        )}
        {action && actionLabel && (
          <Button
            variant={aiAction ? 'secondary' : 'accent'}
            size="sm"
            onClick={action}
            className="w-full justify-center"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export { EmptyState };
