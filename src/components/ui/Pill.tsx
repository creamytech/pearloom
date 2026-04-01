'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

// ─────────────────────────────────────────────────────────────
// Pill — eyebrow label chip used on section headers
// Pure Tailwind, no inline styles
// ─────────────────────────────────────────────────────────────

const VARIANTS = {
  olive: 'bg-[rgba(163,177,138,0.12)] border-[rgba(163,177,138,0.28)] text-[var(--pl-olive-deep)]',
  plum:  'bg-[var(--pl-plum-mist)] border-[rgba(109,89,122,0.22)] text-[var(--pl-plum)]',
  gold:  'bg-[var(--pl-gold-mist)] border-[rgba(196,169,106,0.28)] text-[var(--pl-gold)]',
  dark:  'bg-white/10 border-white/20 text-[rgba(245,241,232,0.75)]',
} as const;

interface PillProps {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  sparkle?: boolean;
  className?: string;
}

export function Pill({ children, variant = 'olive', sparkle = false, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'rounded-[var(--pl-radius-full)] border',
        'px-3 py-1',
        'text-[0.65rem] font-bold uppercase tracking-[0.14em]',
        VARIANTS[variant],
        className,
      )}
    >
      {sparkle && <Sparkles size={9} strokeWidth={2.5} className="flex-shrink-0" />}
      {children}
    </span>
  );
}
