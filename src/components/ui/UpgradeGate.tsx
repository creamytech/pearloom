'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/ui/UpgradeGate.tsx
//
// Wraps premium features with a beautiful glass-style upgrade
// prompt when the user's plan is insufficient.
// ─────────────────────────────────────────────────────────────

import { type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { Lock, ArrowUpRight } from 'lucide-react';
import { isPlanSufficient, tierLabel } from '@/lib/plan-gate';
import { cn } from '@/lib/cn';

// ─── Lightweight client-side plan hook ───────────────────────
// The user's plan string is expected either via the session
// (if extended) or through a data attribute on <body> that the
// dashboard layout injects. We fall back to "free" when neither
// is available.

function useUserPlan(): string {
  const { data: session } = useSession();

  // If the session has been extended with a plan field, use it.
  const sessionPlan = (session as Record<string, unknown> | null)?.plan;
  if (typeof sessionPlan === 'string' && sessionPlan) return sessionPlan;

  // Fall back: check a data-attribute the dashboard layout may inject.
  if (typeof document !== 'undefined') {
    const attr = document.body.getAttribute('data-plan');
    if (attr) return attr;
  }

  return 'free';
}

// ─── Component ───────────────────────────────────────────────

export interface UpgradeGateProps {
  /** Minimum tier required: free | journal | pro | atelier | premium | legacy */
  tier: string;
  /** Human-readable feature name, e.g. "AI Block Generator" */
  feature: string;
  /** Content to render when the user meets the tier requirement */
  children: ReactNode;
  /** Optional extra className on the gate wrapper */
  className?: string;
}

export function UpgradeGate({ tier, feature, children, className }: UpgradeGateProps) {
  const currentPlan = useUserPlan();

  if (isPlanSufficient(currentPlan, tier)) {
    return <>{children}</>;
  }

  const label = tierLabel(tier);

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center gap-5 rounded-[var(--pl-radius-lg)] p-8 text-center',
        // Glass surface
        'bg-[var(--pl-glass)] border border-[var(--pl-glass-border)]',
        'backdrop-blur-[20px] backdrop-saturate-150',
        'shadow-[0_2px_12px_rgba(43,30,20,0.06),0_4px_24px_rgba(43,30,20,0.04)]',
        className,
      )}
    >
      {/* Lock icon */}
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full',
          'bg-[var(--pl-gold)]/12 text-[var(--pl-gold)]',
        )}
      >
        <Lock size={22} strokeWidth={1.8} />
      </div>

      {/* Heading */}
      <h3
        className={cn(
          'font-heading text-lg font-semibold tracking-tight',
          'text-[var(--pl-ink-soft)]',
        )}
      >
        Unlock {feature}
      </h3>

      {/* Description */}
      <p className="max-w-xs text-[0.85rem] leading-relaxed text-[var(--pl-muted)]">
        Upgrade to <span className="font-semibold text-[var(--pl-ink-soft)]">{label}</span> to
        access this feature and elevate your wedding experience.
      </p>

      {/* CTA */}
      <a
        href="/dashboard?upgrade=true"
        className={cn(
          'inline-flex items-center gap-2 rounded-[var(--pl-radius-sm)]',
          'bg-[var(--pl-gold)] px-6 py-2.5 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-white',
          'shadow-[0_2px_8px_rgba(43,30,20,0.08),0_1px_3px_rgba(43,30,20,0.05)]',
          'transition-all duration-200 hover:-translate-y-px hover:bg-[#b89a5a]',
          'hover:shadow-[0_4px_20px_rgba(43,30,20,0.12),0_8px_30px_rgba(43,30,20,0.07)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pl-gold)] focus-visible:ring-offset-2',
        )}
      >
        Upgrade
        <ArrowUpRight size={14} strokeWidth={2.2} />
      </a>
    </div>
  );
}
