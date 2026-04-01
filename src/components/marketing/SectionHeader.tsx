'use client';

import { motion } from 'framer-motion';
import { Pill } from '@/components/ui/Pill';
import { cn } from '@/lib/cn';

interface SectionHeaderProps {
  eyebrow?: string;
  eyebrowColor?: string;
  pill?: { label: string; sparkle?: boolean; variant?: 'olive' | 'plum' | 'dark' | 'gold' };
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  inView?: boolean;
  dark?: boolean;
  watermark?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeader({
  eyebrow,
  eyebrowColor,
  pill,
  title,
  subtitle,
  inView = true,
  dark = false,
  watermark,
  align = 'center',
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'relative mb-12',
        align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
    >
      {/* Decorative watermark */}
      {watermark && (
        <div
          aria-hidden="true"
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'font-heading font-bold',
            'select-none pointer-events-none leading-none',
            'text-[clamp(5rem,12vw,10rem)]',
            dark ? 'text-white/[0.03]' : 'text-[var(--pl-ink)]/[0.04]',
          )}
        >
          {watermark}
        </div>
      )}

      {/* Eyebrow text OR pill */}
      {eyebrow && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-4"
        >
          <span
            className={cn(
              'text-[0.65rem] font-bold uppercase tracking-[0.14em]',
              eyebrowColor ? '' : dark ? 'text-[var(--pl-dark-text)]' : 'text-[var(--pl-olive-deep)]',
            )}
            style={eyebrowColor ? { color: eyebrowColor } : undefined}
          >
            {eyebrow}
          </span>
        </motion.div>
      )}

      {pill && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className={cn('mb-4', align === 'center' ? 'flex justify-center' : 'flex')}
        >
          <Pill variant={pill.variant} sparkle={pill.sparkle}>
            {pill.label}
          </Pill>
        </motion.div>
      )}

      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.1 }}
        className={cn(
          'font-heading font-bold',
          'tracking-[-0.03em] leading-tight mb-3',
          'text-[clamp(2rem,4vw,2.8rem)]',
          dark ? 'text-[var(--pl-dark-heading)]' : 'text-[var(--pl-ink-soft)]',
        )}
      >
        {title}
      </motion.h2>

      {/* Subtitle */}
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className={cn(
            'relative text-[1rem] leading-[1.75]',
            align === 'center' ? 'mx-auto max-w-[520px]' : 'max-w-[520px]',
            dark ? 'text-[var(--pl-dark-text)]' : 'text-[var(--pl-muted)]',
          )}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
