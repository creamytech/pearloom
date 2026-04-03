'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

// ─── Switch / Toggle ─────────────────────────────────────────

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-2.5 cursor-pointer select-none',
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex items-center flex-shrink-0',
          'rounded-[var(--pl-radius-full)] transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pl-olive)] focus-visible:ring-offset-2',
        )}
        style={{
          width: 44,
          height: 24,
          backgroundColor: checked ? 'var(--pl-olive)' : 'rgba(0,0,0,0.12)',
        }}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="block rounded-full bg-white"
          style={{
            width: 20,
            height: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)',
            marginLeft: checked ? 22 : 2,
          }}
        />
      </button>

      {label && (
        <span className="text-[0.88rem] text-[var(--pl-ink)] font-body leading-none">
          {label}
        </span>
      )}
    </label>
  );
}

export { Switch };
