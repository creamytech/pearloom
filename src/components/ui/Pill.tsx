'use client';

import { colors, text } from '@/lib/design-tokens';
import { Sparkles } from 'lucide-react';

const VARIANTS = {
  olive: {
    background: `${colors.olive}1F`,
    border: `1px solid ${colors.olive}4D`,
    color: colors.olive,
  },
  plum: {
    background: `${colors.plum}40`,
    border: `1px solid ${colors.plum}66`,
    color: '#B9A4C7',
  },
  dark: {
    background: 'rgba(163,177,138,0.15)',
    border: '1px solid rgba(163,177,138,0.3)',
    color: 'rgba(245,241,232,0.7)',
  },
} as const;

interface PillProps {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  sparkle?: boolean;
}

export function Pill({ children, variant = 'olive', sparkle = false }: PillProps) {
  const v = VARIANTS[variant];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full"
      style={{
        padding: '0.25rem 0.875rem',
        fontSize: text.xs,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        background: v.background,
        border: v.border,
        color: v.color,
      }}
    >
      {sparkle && <Sparkles size={9} strokeWidth={2.5} />}
      {children}
    </span>
  );
}
